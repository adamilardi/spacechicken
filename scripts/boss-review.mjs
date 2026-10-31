// Boss review panel: capture a pilot-vs-boss fight, then ask Jev personas
// (one expert reviewer, three gamer types) to score it. Usage:
//   node scripts/boss-review.mjs [level]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { choice, score, TypeSafeClient } from '@typesafe-ai/sdk';
import { readTypeSafeApiKey } from './jev-playtest.mjs';

const require = createRequire(import.meta.url);

const PERSONAS = [
    {
        id: 'reviewer',
        name: 'Marlowe (expert reviewer)',
        profile:
            '18 years reviewing action games for a major outlet, known for the scores that start arguments. Uses the whole scale: 0-1 is broken or insulting, 2 is average, 3 is good, 4 is excellent, 5 is a once-a-year fight. Compares every boss against the contra/run-and-gun canon: a boss must earn its slot with readable tells, real pressure, and at least one idea the previous bosses did not already do. Punishes pushovers that die before phase two, damage sponges with no new decisions, cheap hits, stall tactics, downtime, and staleness across the arc. Never scores on vibes: every number traces to a telemetry line.',
    },
    {
        id: 'veteran',
        name: 'Vic (contra veteran)',
        profile:
            'Has finished every run-and-gun on hard. Wants a boss that pressures constantly but never cheats: every death should be traceable to a missed tell. Loves phase twists, hates damage sponges and waiting.',
    },
    {
        id: 'casual',
        name: 'Sam (casual newcomer)',
        profile:
            'Plays on normal, first contra-style game. Needs the rule obvious in 10 seconds: what to shoot, what to dodge. Forgiving of easy fights, quits on confusing or unfair-feeling deaths.',
    },
    {
        id: 'speedrunner',
        name: 'Lex (speedrunner)',
        profile:
            'Races full-game clears. Wants deterministic patterns, short downtime, and damage that rewards aggressive routing. Hates RNG waits, long invulnerable phases, and full-HP resets after a death.',
    },
];

const BRIEFS = {
    8: {
        name: 'Broodmother',
        level: 8,
        levelTheme:
            'Colony Drop: a beachhead landing on a colony world. Skitterers (fast crab aliens) rush the line in waves while the chicken holds the pad with the space phaser.',
        bossFiction:
            'A giant skitterling matriarch nesting on the crown pad, guarding the colony crown. Magenta crab body, spike crown, one big cyan lens.',
        rule: 'Hold fire on the lens; jump her telegraphed charge.',
        tell: 'She crouches and flashes red for 800ms, then charges across the pad.',
        safeResponse: 'Jump the charge (it runs under you), keep bolts on her while she recovers.',
        hp: 14,
        phases: ['pace toward the player', 'telegraph (crouch + red flash)', 'charge', 'recover'],
        enrage: 'Below half HP she charges faster with shorter rests, tinted purple with an ENRAGED banner.',
        defeat: 'Explosion, BROODMOTHER DOWN banner, crown shield opens. Wounds persist through player death.',
    },
    9: {
        name: 'Hive Mother',
        level: 9,
        levelTheme:
            'Hive Warrens: the alien nest. Gnawers (toothy purple swarmers) answer to the space phaser; a teal spore-beam sweeps the crown deck on a timed beat.',
        bossFiction:
            'A bloated gnawer matriarch nesting on the crown deck, egg sacs glowing, one big cyan lens. She births live gnawers mid-fight.',
        rule: 'Burn her lens; duel each newborn gnawer the moment it drops; hop her rare heave-charge.',
        tell: 'Gold flash and rear-up for 600ms means a birth; a red crouch with rising tone means a slow 165px charge — jump it late.',
        safeResponse:
            'Hold the deck, gun down newborns before they spread, keep bolts on her between births, hop the charge.',
        hp: 16,
        phases: [
            'pacing (40px/s)',
            'summon tell (gold, every 3.5s)',
            'birth (max 4 alive)',
            'rare slow charge (165px, ~5s clock)',
            'recover',
        ],
        enrage: 'Below half HP she births 30% faster and charges on a 4.2s clock, tinted purple with an ENRAGED banner.',
        defeat: 'Explosion, HIVE MOTHER DOWN banner, crown shield opens. Summoned adds dissolve. Wounds persist through player death.',
    },
    10: {
        name: 'Warden Prime',
        level: 10,
        levelTheme:
            'Spire Crown: the final ascent up a golden spire in low gravity. Wardens (armored spear aliens) hold the steps; gold beams sweep the hall on a beat. Ride the lift to the crown deck.',
        bossFiction:
            'The prime warden dueling on the crown deck: gold plume and pauldrons, alloy cuirass, one big cyan lens. The spire’s champion.',
        rule: 'Duel her pace, jump her charge late, keep bolts on the lens.',
        tell: 'She crouches and flashes red for 800ms, then charges 378px across the deck.',
        safeResponse:
            'Hold fire on the pace, strafe to room, jump as the charge leaves. Low gravity stretches every arc.',
        hp: 12,
        phases: ['fast pace', 'telegraph (crouch + red flash)', 'charge', 'recover'],
        enrage: 'Below half HP she charges faster with shorter rests, tinted purple with an ENRAGED banner.',
        defeat: 'Explosion, WARDEN PRIME DOWN banner, crown shield opens. Wounds persist through player death.',
    },
    11: {
        name: 'Gatekeeper',
        level: 11,
        levelTheme:
            'Bastion Relay: inside the enemy base. Wardens hold the line, red gates sweep on a beat, crushers slam the halls. The crown deck sits past the gatehouse.',
        bossFiction:
            'The base gatekeeper on the crown deck: a treaded relay-dome with antennae, conduit seams, and one alert-red lens. She paces, charges, and calls wardens to the guard.',
        rule: 'Jump her charge late, duel each summoned warden, keep bolts on the lens.',
        tell: 'Crouch and red flash for 800ms means a 378px charge; gold flash and rear-up for 600ms births one warden.',
        safeResponse:
            'Plant on the pace, strafe the telegraph, jump as the charge leaves, gun down the newborn before it spreads.',
        hp: 12,
        phases: [
            'pace',
            'telegraph (crouch + red flash)',
            'charge',
            'summon tell (gold)',
            'recover',
        ],
        enrage: 'Below half HP she rests shorter and births 30% faster with the same charge speed, tinted purple with an ENRAGED banner.',
        defeat: 'Explosion, GATEKEEPER DOWN banner, crown shield opens. Summoned adds dissolve. Wounds persist through player death.',
    },
    12: {
        name: 'Crimson Heart',
        level: 12,
        levelTheme:
            'Crimson Womb: the heart of the enemy. Gnawers swarm the flesh, drips fall in the low run, devils patrol, and a spore-beam guards the last gap before the crown deck.',
        bossFiction:
            'The beating heart of the womb itself on the crown deck: twin crimson lobes, artery stubs, glow sacs, and one cyan lens. She paces and slam-charges with the heartbeat.',
        rule: 'Jump her slam-charge late, keep bolts on the lens between slams.',
        tell: 'Heartbeat double-thump, crouch and red flash for 800ms means a 378px charge.',
        safeResponse:
            'Plant on the pace, strafe the telegraph, jump as the charge leaves, burn the lens between slams.',
        hp: 12,
        phases: ['pace', 'telegraph (crouch + red flash)', 'charge', 'recover'],
        enrage: 'Below half HP she rests shorter and charges 20% faster, tinted purple with an ENRAGED banner.',
        defeat: 'Explosion, CRIMSON HEART DOWN banner, crown shield opens. Wounds persist through player death.',
    },
    13: {
        name: 'Scrapjaw',
        level: 13,
        levelTheme:
            'Rust Harbor: the breaker yard. Skitterlings swarm the planks, drips fall on the low run, and cargo slams pound the crown deck on a beat.',
        bossFiction:
            'A walking crusher-jaw on the crown deck: rusted girder frame, piston teeth, hazard stripes, and one orange lens. She paces and charges between the cargo slams.',
        rule: 'Jump her charge late between slam beats, keep bolts on the lens.',
        tell: 'Crouch and orange flash for 800ms means a 378px charge; slams telegraph with their own rise.',
        safeResponse:
            'Plant on the pace, strafe the telegraph, jump as the charge leaves, never stand under a rising slam.',
        hp: 12,
        phases: ['pace', 'telegraph (crouch + orange flash)', 'charge', 'recover'],
        enrage: 'Below half HP she rests shorter and charges 20% faster, tinted purple with an ENRAGED banner.',
        defeat: 'Explosion, SCRAPJAW DOWN banner, crown shield opens. Wounds persist through player death.',
    },
    14: {
        name: 'Embermaw',
        level: 14,
        levelTheme:
            'Ember Foundry: the smelter. Gnawers swarm the decks, ore trams cross the wide gaps, and ember beams sweep on a beat, one guarding the crown deck entry.',
        bossFiction:
            'A furnace-mouth demon on the crown deck: iron maw, molten core, flame teeth, and one burning lens. She paces, charges, and births gnawer spawn.',
        rule: 'Jump her charge late, duel each newborn gnawer, keep bolts on the lens.',
        tell: 'Crouch and yellow flash for 800ms means a 378px charge; gold flash and rear-up for 600ms births one gnawer.',
        safeResponse:
            'Plant on the pace, strafe the telegraph, jump as the charge leaves, gun down the newborn before it spreads.',
        hp: 14,
        phases: [
            'pace',
            'telegraph (crouch + yellow flash)',
            'charge',
            'summon tell (gold)',
            'recover',
        ],
        enrage: 'Below half HP she rests shorter and births 30% faster with the same charge speed, tinted purple with an ENRAGED banner.',
        defeat: 'Explosion, EMBERMAW DOWN banner, crown shield opens. Summoned adds dissolve. Wounds persist through player death.',
    },
    15: {
        name: 'Highroost',
        level: 15,
        levelTheme:
            'Skyhook Anchor: the tether station, the final climb. Wardens swarm the decks, a timed beam sweeps the pad approach, and a crusher slams the crown pad itself on a beat.',
        bossFiction:
            'The roost-mother of the skyhook nesting on the crown pad: a colossal cyber-hen with tether-cable plumage, anchor spurs, a red comb, and one big cyan lens. The last guardian of the tether crown.',
        rule: 'Jump her charge late between slam beats, duel each summoned warden, keep bolts on the lens.',
        tell: 'Crouch and red flash for 800ms means a 378px charge; gold flash and rear-up for 600ms births one warden.',
        safeResponse:
            'Plant on the pace, strafe the telegraph, jump as the charge leaves, gun down the newborn before it spreads, never stand under a rising slam.',
        hp: 16,
        phases: [
            'pace',
            'telegraph (crouch + red flash)',
            'charge',
            'summon tell (gold)',
            'recover',
        ],
        enrage: 'Below half HP she rests shorter and births 30% faster with the same charge speed, tinted purple with an ENRAGED banner.',
        defeat: 'Explosion, HIGHROOST DOWN banner, crown shield opens. Summoned adds dissolve. Wounds persist through player death.',
    },
    16: {
        name: 'Tumbler',
        level: 16,
        levelTheme:
            'Iron Vault: the sealed branch off the womb that rejoins the foundry. Skitterlings swarm the vault decks, a red beam sweeps the pad approach, and a crusher slams the crown pad itself.',
        bossFiction:
            'The vault\u2019s living lock on the crown pad: a lockplate crab with brass pin tumblers, glowing keyway seams, shackle horns, and one red lens, bred from skitterling stock.',
        rule: 'Jump his charge late between slam beats, keep bolts on the lens.',
        tell: 'Crouch and red flash for 800ms means a 378px charge.',
        safeResponse:
            'Plant on the pace, strafe the telegraph, jump as the charge leaves, never stand under a rising slam.',
        hp: 12,
        phases: ['pace', 'telegraph (crouch + red flash)', 'charge', 'recover'],
        enrage: 'Below half HP he rests much shorter and charges 20% faster, tinted purple with an ENRAGED banner.',
        defeat: 'Explosion, TUMBLER DOWN banner, crown shield opens. Wounds persist through player death.',
    },
    24: {
        name: 'Champion King',
        level: 24,
        levelTheme:
            'Clutch Crown: the chess showdown bracket. Pawn boarder waves and file lasers on the lower ranks, rook drones on the middle rank, and the championship rank holds the crown.',
        bossFiction:
            'The reigning champion embodied as a crowned chess king: dark slate body, gold crown and trim, one big cyan lens. He guards the showdown crown on the top rank.',
        rule: 'Read the telegraphed landing square; hold fire between leaps, burn the lens in the landing window.',
        tell: 'Crouch and red flash for 750ms, landing square chosen as he leaves the ground; he arcs in a knight L and lands 240px over.',
        safeResponse:
            'Stand off the landing line, strafe as he leaves the ground, keep bolts on him while he recovers on the new square.',
        hp: 14,
        phases: ['pace', 'telegraph (crouch + red flash)', 'knight leap (airborne L)', 'recover'],
        enrage: 'Below half HP the final-day swing: leaps come 25% faster with shorter rests, tinted purple with an ENRAGED banner.',
        defeat: 'Explosion, CHAMPION KING DOWN banner, crown shield opens. Wounds persist through player death.',
    },
};

const APPROACH = {
    8: [10900, 480],
    9: [10700, 300],
    10: [11760, 190],
    11: [11430, 420],
    12: [11900, 250],
    13: [12300, 280],
    14: [12050, 380],
    15: [11850, 380],
    16: [9430, 380],
    24: [5700, 250],
};

const SCORE_LEVELS = {
    fun: [
        'Boring or miserable: long waits, no decisions, or constant unfair-feeling deaths.',
        'Weak: one flat note, downtime between attacks, or the loop gets old fast.',
        'Decent: a clear loop with some pressure, worth one playthrough.',
        'Good: tense pacing, satisfying hits, a phase twist that lands.',
        'Great: memorable fight you would replay; every second earns its place.',
    ],
    fairness: [
        'Cheap: unavoidable hits, unreadable tells, or deaths that feel random.',
        'Rough: tells exist but are tight, ambiguous, or sometimes unfair.',
        'Fair: every death traces to a missed tell; a careful player wins clean.',
        'Crisp: generous readable tells, consistent patterns, mistakes are obvious.',
        'Exemplary: teaches the rule in seconds and never surprises unfairly.',
    ],
    theme: [
        'Off-theme: could be any game; clashes with Space Chicken.',
        'Thin: fits loosely, forgettable, weak fiction tie.',
        'Fitting: reads as a Space Chicken alien at a glance.',
        'Strong: fiction, look, and arena reinforce the level theme.',
        'Iconic: instantly memorable, screams this game and level.',
    ],
};

function questionSet(persona) {
    const head = `You are ${persona.name}. ${persona.profile} Judge ONLY the boss fight described in state.fight from the telemetry in state.telemetry. The telemetry comes from a mid-skill bot pilot, not a human: 0-2 deaths in a sub-60s kill is its normal learning curve. Judge cheapness by the death PATTERN (same spot and cause every time suggests a trap; varied spots in a fast kill suggest fair exchanges), not by the raw death count. Judge pressure by the clock: a clean kill under 10 seconds means the boss never got to act — cap fun at 2 no matter how clean it looked. A kill over 120 seconds with no new phases is a sponge, not a duel — cap fun at 2. If state.fight.variety shows 3 or more bosses sharing this rule, the idea is stale — cap fun at 2 and say so. Score fairness ONLY from tells and deaths: a clean kill with readable tells is fair (3+) even when the fight is stale, short, or off-theme — pacing and variety hit fun, never fairness. state.telemetry.flags names mechanical suspicions; confirm or rebut each from the numbers. Answer as this persona, not as a designer.`;
    return {
        fun: score(`${head} How FUN is this boss fight?`, SCORE_LEVELS.fun),
        fairness: score(`${head} How FAIR is this boss fight?`, SCORE_LEVELS.fairness),
        theme: score(
            `${head} How well does this boss fit the Space Chicken theme?`,
            SCORE_LEVELS.theme
        ),
        flaw: choice(
            {
                task: `${head} Name this fight's single biggest flaw, or none if it genuinely has no real flaw.`,
                guidance: [
                    'none: no real flaw; the fight earns its slot.',
                    'pushover: dies before phase two with no pressure (fast clean kill).',
                    'sponge: drags on with no new decisions (slow kill, flat phases).',
                    'unreadable: tells too tight, ambiguous, or unfair-feeling deaths.',
                    'downtime: long waits, invulnerable stretches, or stall tactics.',
                    'stale: same rule as earlier bosses; nothing new.',
                    'offtheme: does not read as this game.',
                ],
            },
            {
                none: 'No real flaw.',
                pushover: 'Dies before it pressures.',
                sponge: 'Drags with no new decisions.',
                unreadable: 'Tells too tight or unfair.',
                downtime: 'Too much waiting.',
                stale: 'Same rule as earlier bosses.',
                offtheme: 'Wrong game feel.',
            }
        ),
        verdict: choice(
            {
                task: `${head} Give a final verdict on this boss fight.`,
                guidance: [
                    'ship: fun, fair, and fitting; release it as designed.',
                    'iterate: a real flaw in fun, fairness, or theme fit; name it by scoring that dimension low.',
                    'rework: fundamentally wrong; needs a new rule, not tuning.',
                    'Judge the whole fight: brief, tells, pacing, telemetry, and outcome.',
                ],
            },
            {
                ship: 'Release as designed.',
                iterate: 'One real flaw to fix first.',
                rework: 'Needs a new rule.',
            }
        ),
    };
}

// Runs inside the page: one fight sample with nearest-threat distances.
function sampleFight() {
    const snap = window.__spaceChickenDebug.getBotSnapshot();
    const px = snap.player?.x || 0;
    const py = snap.player?.y || 0;
    const nearest = (list, skipBoss) => {
        let best = null;
        for (const item of list || []) {
            if (!item || item.active === false) continue;
            if (skipBoss && (item.type === 'boss' || item.enable === false)) continue;
            const d = Math.hypot((item.x || 0) - px, (item.y || 0) - py);
            if (best == null || d < best) best = d;
        }
        return best == null ? null : Math.round(best);
    };
    const boss = (snap.hazards || []).find((h) => h.type === 'boss');
    return {
        level: snap.level,
        addDist: nearest(snap.hazards, true),
        bombDist: nearest(snap.bombs, false),
        lastDeathKind: snap.lastDeathKind ?? null,
        deaths: snap.deaths,
        px: Math.round(px),
        py: Math.round(py),
        crownShield: snap.crown?.shielded,
        boss: boss
            ? { x: Math.round(boss.x), y: Math.round(boss.y), hp: boss.hp, phase: boss.phase }
            : null,
    };
}

function deathCause(sample, bossPhase, dx, dy, addDist, bombDist) {
    if (sample.py > 600) return 'pit';
    if (bossPhase === 'charge' && dx < 220 && dy < 120) return 'charge';
    if (addDist != null && addDist < 50) return 'add';
    if (bombDist != null && bombDist < 60) return 'bomb';
    if (dx < 60 && dy < 45) return 'contact';
    if (sample.py > 400) return 'fall';
    return 'other';
}

function deathSpot(lastSample, s) {
    const dx = Math.abs(lastSample.bossX - lastSample.px);
    const dy = Math.abs((lastSample.bossY ?? 0) - lastSample.py);
    return {
        x: lastSample.px,
        y: lastSample.py,
        bossX: lastSample.bossX,
        bossHp: lastSample.bossHp,
        bossPhase: lastSample.bossPhase,
        addDist: lastSample.addDist,
        bombDist: lastSample.bombDist,
        deathKind: s.lastDeathKind,
        likelyCause: deathCause(
            lastSample,
            lastSample.bossPhase,
            dx,
            dy,
            lastSample.addDist,
            lastSample.bombDist
        ),
    };
}

export async function captureFight(level, brief) {
    const root = new URL('..', import.meta.url).pathname;
    const { createServer } = require(`${root}/server.cjs`);
    const { chromium } = await import(`${root}/node_modules/playwright/index.mjs`);
    const { buildPilotSource } = await import('./pilot-brain.mjs');
    const server = createServer();
    await new Promise((r) => server.listen(0, '0.0.0.0', r));
    const port = server.address().port;
    const browser =
        process.env.BOT_GPU === '1'
            ? await (
                  await import('./rl/chrome.mjs')
              ).launchBrowser(chromium, true, { preserveFrameRate: true })
            : await chromium.launch({
                  headless: true,
                  args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
              });
    const telemetry = {
        level,
        boss: brief.name,
        outcome: 'timeout',
        durationSec: 0,
        deaths: 0,
        deathSpots: [],
        hpStart: null,
        hpMin: null,
        phasesSeen: [],
        enraged: false,
        errors: [],
    };
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
        page.on('pageerror', (error) => telemetry.errors.push(error.message));
        await page.goto(`http://127.0.0.1:${port}/?debug=1&level=${level}`, { timeout: 20000 });
        await page.waitForFunction(() => window.__spaceChickenDebug?.ready(), null, {
            timeout: 20000,
        });
        await page.evaluate(buildPilotSource());
        // Start the pilot on the arena approach; it fights from here.
        const [approachX, approachY] = APPROACH[level] || [10900, 480];
        await page.evaluate(
            ([x, y]) => window.__spaceChickenDebug.teleport(x, y),
            [approachX, approachY]
        );
        await page.waitForTimeout(500);
        const start = Date.now();
        const capMs = 180000;
        const phases = new Set();
        let hpMin = Infinity;
        let deaths0 = null;
        let lastSample = null;
        while (Date.now() - start < capMs) {
            const s = await page.evaluate(sampleFight);
            if (deaths0 == null) {
                deaths0 = s.deaths;
                telemetry.hpStart = s.boss?.hp ?? null;
            }
            if (s.deaths - deaths0 > telemetry.deathSpots.length && s.boss && lastSample) {
                telemetry.deathSpots.push(deathSpot(lastSample, s));
            }
            lastSample = {
                px: s.px,
                py: s.py,
                bossX: s.boss?.x,
                bossY: s.boss?.y,
                bossHp: s.boss?.hp,
                bossPhase: s.boss?.phase,
                addDist: s.addDist,
                bombDist: s.bombDist,
            };
            if (s.boss) {
                phases.add(s.boss.phase);
                hpMin = Math.min(hpMin, s.boss.hp);
                if (s.boss.hp <= (telemetry.hpStart || 14) / 2) telemetry.enraged = true;
            }
            telemetry.deaths = s.deaths - deaths0;
            telemetry.durationSec = Math.round(((Date.now() - start) / 1000) * 10) / 10;
            if (s.crownShield === false) {
                telemetry.outcome = 'boss-defeated';
                break;
            }
            if (s.level !== level) {
                telemetry.outcome = 'crown-collected';
                break;
            }
            // Poll faster than the shortest phase: a bound-clamped
            // charge can end in ~400ms and must still be seen. The heavy
            // snapshot evaluate is too slow to catch 520-750ms phases on
            // its own, so merge cheap boss-phase polls between samples.
            for (let light = 0; light < 3; light += 1) {
                await page.waitForTimeout(50);
                const lightPhases = await page.evaluate(() =>
                    (window.__spaceChickenDebug.bossPhases?.() || []).map((b) => b.phase)
                );
                for (const phase of lightPhases) {
                    if (phase) phases.add(phase);
                }
            }
        }
        telemetry.hpMin = hpMin === Infinity ? null : hpMin;
        telemetry.phasesSeen = [...phases];
    } finally {
        await browser.close();
        await new Promise((r) => server.close(r));
    }
    return telemetry;
}

// Mechanical suspicions, computed in code so the panel cannot miss them.
// The personas confirm or rebut each from the numbers.
export function telemetryFlags(telemetry) {
    const flags = [];
    const killed = telemetry.outcome === 'boss-defeated' || telemetry.outcome === 'crown-collected';
    if ((telemetry.durationSec ?? 999) < 10 && (telemetry.deaths ?? 0) === 0 && killed) {
        flags.push('pushover-suspect: sub-10s clean kill; the boss may never have acted');
    }
    const phases = telemetry.phasesSeen || [];
    if (
        killed &&
        !phases.includes('charge') &&
        !phases.includes('summonTell') &&
        !phases.includes('leap')
    ) {
        flags.push('one-phase: kill saw no charge, summon, or leap phase');
    }
    if ((telemetry.durationSec ?? 0) > 120 && !killed) {
        flags.push('sponge-suspect: over 120s without a kill');
    }
    return flags;
}

// Arc-wide variety: how many bosses share this one's core rule. Per-boss
// reviews cannot see staleness on their own, so the state carries it in.
// Count the family THIS boss belongs to: a leap boss judged against the
// charge family's headcount reads as stale no matter how new it is.
export function varietyNote(brief) {
    const briefs = Object.values(BRIEFS);
    const phaseText = (entry) => (entry.phases || []).join(' ').toLowerCase();
    const familyOf = (entry) => {
        const text = phaseText(entry);
        if (text.includes('leap')) return 'leap';
        if (text.includes('summon') || text.includes('birth')) return 'summon';
        return 'charge';
    };
    const family = familyOf(brief);
    const sharing = briefs.filter((other) => familyOf(other) === family);
    return {
        bossesTotal: briefs.length,
        ruleFamily: family,
        sharingRuleCount: sharing.length,
        sharingNames: sharing.map((other) => other.name),
        sharingChargeRule: briefs.filter((other) => phaseText(other).includes('charge')).length,
        thisBoss: brief.name,
    };
}

export function panelPassed(reports) {
    const reviewer = reports.find((report) => report.persona === 'reviewer');
    const ships = reports.filter((report) => report.verdict === 'ship').length;
    const minFairness = Math.min(...reports.map((report) => report.fairness));
    const meanFun = reports.reduce((sum, report) => sum + report.fun, 0) / reports.length;
    // A ship with a named flaw is a contradiction: the critic must be clean.
    // Reports predating the flaw taxonomy count as clean.
    const reviewerClean = (reviewer?.flaw || 'none') === 'none';
    return (
        reviewer?.verdict === 'ship' &&
        ships >= 3 &&
        minFairness >= 2 &&
        meanFun >= 2.5 &&
        reviewerClean
    );
}

export async function reviewBoss(client, brief, telemetry) {
    const flagged = { ...telemetry, flags: telemetryFlags(telemetry) };
    const fight = {
        game: 'Space Chicken: a chicken run-and-gun platformer. Levels 8-16 are contra-style shooting stages with the space phaser (horizontal bolts). Touching an enemy kills; checkpoints respawn.',
        boss: brief,
        variety: varietyNote(brief),
    };
    const reports = [];
    for (const persona of PERSONAS) {
        const response = await client.systemOne(
            {
                state: {
                    fight,
                    telemetry: flagged,
                    persona: { id: persona.id, profile: persona.profile },
                },
                questions: questionSet(persona),
            },
            { timeout: 30000, retry: { maxRetries: 1 } }
        );
        const answers = response.answers;
        reports.push({
            persona: persona.id,
            name: persona.name,
            fun: answers.fun.score,
            fairness: answers.fairness.score,
            theme: answers.theme.score,
            flaw: answers.flaw.choice,
            verdict: answers.verdict.choice,
            confidence: {
                fun: answers.fun.confidence,
                fairness: answers.fairness.confidence,
                theme: answers.theme.confidence,
                flaw: answers.flaw.confidence,
                verdict: answers.verdict.confidence,
            },
        });
        console.log(
            `${persona.name}: fun=${answers.fun.score.toFixed(1)} fair=${answers.fairness.score.toFixed(1)} theme=${answers.theme.score.toFixed(1)} flaw=${answers.flaw.choice} -> ${answers.verdict.choice}`
        );
    }
    const passed = panelPassed(reports);
    console.log(passed ? 'PANEL: PASS' : 'PANEL: ITERATE');
    return { brief, telemetry: flagged, reports, passed };
}

async function main() {
    const level = Number(process.argv[2] || 8);
    const brief = BRIEFS[level];
    if (!brief) {
        throw new Error(`no boss brief for level ${level} yet`);
    }
    const apiKey = readTypeSafeApiKey();
    if (!apiKey) {
        throw new Error('Set TYPESAFE_API_KEY (or JEV_API_KEY) to run the persona panel.');
    }
    console.log(`capturing L${level} ${brief.name} fight...`);
    const telemetry = await captureFight(level, brief);
    console.log('telemetry:', JSON.stringify(telemetry));
    if (telemetry.errors.length) {
        throw new Error(`page errors during capture: ${telemetry.errors.join(' | ')}`);
    }
    const client = new TypeSafeClient({ apiKey, logLevel: 'off' });
    const report = await reviewBoss(client, brief, telemetry);
    mkdirSync('docs/boss-reviews', { recursive: true });
    const outPath = `docs/boss-reviews/level-${level}.json`;
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`report: ${outPath}`);
    process.exitCode = report.passed ? 0 : 2;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}
