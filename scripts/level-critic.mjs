// Level critic run: mechanical novelty/fairness checks in code, a pilot
// play capture, a screenshot beat sheet sent to Jev as image evidence,
// a four-persona quality panel, and (for news levels) a fidelity panel
// that verifies the level against its source story. Usage:
//   node scripts/level-critic.mjs <level-id> [--static] [--brief <path>]
//   NEWS_BRIEF=docs/level-builds/17.md node scripts/level-critic.mjs 17
// Exit: 0 pass (or mechanical pass with --static), 2 iterate/rework, 1 error.
// Skill contract: skills/game-critic/SKILL.md.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { openAsBlob } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { choice, image, score, TypeSafeClient } from '@typesafe-ai/sdk';
import { readTypeSafeApiKey } from './jev-playtest.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

export const PERSONAS = [
    {
        id: 'reviewer',
        name: 'Marlowe (expert reviewer)',
        profile:
            '18 years reviewing action platformers. Uses the whole 0-4 scale: 0-1 broken, 2 average, 3 good, 4 excellent. Every level must earn its slot against the shipped roster: punish clones, flat deck rows, sleeping finales, and palette swaps. Never scores on vibes: every number traces to a telemetry line or a screenshot.',
    },
    {
        id: 'veteran',
        name: 'Vic (contra veteran)',
        profile:
            'Has finished every run-and-gun on hard. Wants constant readable pressure, honest checkpoints, and routes that pay or threaten. Hates empty shelves, decorative beams, and deaths that cannot be traced to a missed tell.',
    },
    {
        id: 'casual',
        name: 'Sam (casual newcomer)',
        profile:
            'First platformer of this kind, plays on Normal. Needs the next move obvious at gameplay size in seconds: what is solid, what kills, where the crown is. Forgiving of easy levels, quits on confusing or unfair-feeling deaths and on places that all look the same.',
    },
    {
        id: 'speedrunner',
        name: 'Lex (speedrunner)',
        profile:
            'Races full-game clears. Wants deterministic patterns, meaningful route choices, and no dead air. Hates forced waits, empty backtracking, and finales that sleep while the clock runs.',
    },
];

export const SCORE_LEVELS = {
    fun: [
        'Miserable: empty runs, forced waits, or constant unfair-feeling deaths.',
        'Weak: one flat note; the loop gets old within a minute.',
        'Decent: a clear loop with some pressure, worth one playthrough.',
        'Good: tense pacing and decisions throughout; rests feel earned.',
        'Great: memorable level you would replay; every stretch earns its place.',
    ],
    fairness: [
        'Cheap: unavoidable hits, blind landings, respawns inside timing.',
        'Rough: tells exist but are tight, ambiguous, or sometimes unfair.',
        'Fair: every death traces to a missed tell; a careful player clears clean.',
        'Crisp: generous readable tells, consistent patterns, obvious mistakes.',
        'Exemplary: teaches each rule in seconds and never surprises unfairly.',
    ],
    readability: [
        'Unreadable: solid, decorative, and lethal cannot be told apart.',
        'Murky: the next move needs the instructions paragraph to parse.',
        'Readable: platforms, hazards, and goal read at gameplay size.',
        'Clear: tells, landmarks, and themed objects guide without text.',
        'Instant: a first-time player reads every beat a screen ahead.',
    ],
    novelty: [
        'Clone: same skeleton, decks, and finale rule as a shipped level.',
        'Reskin: new colours or one prop over a copied route.',
        'Familiar: known verbs, but topology or finale differs in one real way.',
        'Fresh: a signature mechanic or route shape no sibling teaches this way.',
        'Signature: this level alone owns its idea; the roster would miss it.',
    ],
    pacing: [
        'Broken: no escalation, checkpoint deserts, or a sleeping finale.',
        'Draggy: long dead stretches, empty routes, pressure arrives late.',
        'Steady: teach, press, and rest are present but uneven.',
        'Tight: escalation with honest rests; finale presses.',
        'Masterful: every act recontextualises the idea; finale peaks.',
    ],
    theme: [
        'Off-theme: could be any game; fiction and play disagree.',
        'Thin: themed colours over a generic run.',
        'Fitting: look, hazards, and objective agree.',
        'Strong: the place, its actors, and its rule reinforce each other.',
        'Iconic: instantly memorable; screams this story and this game.',
    ],
};

export const FIDELITY_LEVELS = {
    mechanic: [
        'None: story facts only rename scenery; play is generic.',
        'Thin: one fact tints a hazard; the rest is decoration.',
        'Partial: the signature fact changes what the player does; others decorate.',
        'Strong: several facts drive hazards, topology, or the objective.',
        'Embodied: the level is unplayable as any other story; facts are the rules.',
    ],
    visual: [
        'Wrong story: screenshots read as a different event or no event.',
        'Generic: a themed palette; the story cannot be named from the shots.',
        'Hinted: one signature element is recognisable at gameplay size.',
        'Clear: at least three story elements read without the instructions.',
        'Unmistakable: a player who knows the headline names the story at a glance.',
    ],
};

const FLAW_GUIDANCE = [
    'none: no real flaw; the level earns its slot.',
    'flat: a row of similar decks with no route shape.',
    'clone: skeleton, decks, or finale copied from a sibling.',
    'sleeping-finale: the last stretch does not press.',
    'sponge: length without new decisions.',
    'cheap: blind, unavoidable, or dishonest deaths.',
    'empty-route: a shelf or branch that neither pays nor threatens.',
    'blind: landings or hazards that cannot be read in time.',
    'stale: an idea the roster already teaches the same way.',
    'off-theme: fiction, look, and play disagree.',
    'unreadable: solid, decorative, and lethal cannot be told apart.',
];

// ---------- Pure analysis (unit-tested, no browser, no network) ----------

export function analyseLevel(content, definition) {
    const platforms = content?.staticPlatforms || [];
    const keys = platforms.map((p) => p.key || 'default');
    const keyCounts = new Map();
    for (const key of keys) keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    const dynamic = content?.dynamic || [];
    const hazardTypes = [...new Set(dynamic.map((d) => d.type).filter(Boolean))];
    const checkpoints = [...(content?.checkpoints || [])].sort((a, b) => a.x - b.x);
    const crownX = definition?.CROWN_X ?? 0;
    const finaleHazards = dynamic.filter((d) => crownX - (d.x || 0) <= 900 && (d.x || 0) <= crownX);
    return {
        title: definition?.TITLE || null,
        gravity: definition?.GRAVITY ?? null,
        worldWidth: definition?.WORLD_WIDTH ?? 0,
        backgroundType: content?.background?.type || null,
        platformCount: platforms.length,
        platformKeys: [...keyCounts.keys()],
        dominantKeyShare: platforms.length ? Math.max(...keyCounts.values()) / platforms.length : 1,
        hazardTypes,
        hazardCount: dynamic.length,
        hasBoss: hazardTypes.includes('boss') || Boolean(definition?.CROWN_SHIELD),
        movingCount: (content?.moving || []).length,
        propCount: (content?.props || []).length,
        checkpoints,
        crownX,
        finaleHazardCount: finaleHazards.length,
        platformBands: platforms.map((p) => Math.round((p.y || 0) / 60)),
    };
}

function tokenSet(analysis) {
    const tokens = new Set();
    tokens.add(`bg:${analysis.backgroundType}`);
    for (const key of analysis.platformKeys) tokens.add(`deck:${key}`);
    for (const type of analysis.hazardTypes) tokens.add(`haz:${type}`);
    tokens.add(`grav:${Math.round((analysis.gravity || 0) / 50)}`);
    return tokens;
}

// Jaccard similarity over background, deck keys, hazard types, gravity band,
// plus platform height-band sequence overlap. 1 means indistinguishable kit.
export function skeletonSimilarity(left, right) {
    const a = tokenSet(left);
    const b = tokenSet(right);
    let shared = 0;
    for (const token of a) if (b.has(token)) shared += 1;
    const union = new Set([...a, ...b]).size || 1;
    const kit = shared / union;
    const bandsA = new Set(left.platformBands || []);
    const bandsB = new Set(right.platformBands || []);
    let bandShared = 0;
    for (const band of bandsA) if (bandsB.has(band)) bandShared += 1;
    const bandUnion = new Set([...bandsA, ...bandsB]).size || 1;
    return Math.round((kit * 0.7 + (bandShared / bandUnion) * 0.3) * 1000) / 1000;
}

// Pilot wall budget scales with level size: a fixed 60s wall budget cannot
// crown levels whose minimum traverse time exceeds it (6000px at 160px/s
// needs 37s of game time before any waiting, ~90-150s wall headless).
export function pilotBudgetSec(worldWidth) {
    // Nominal runs must sit mid-range, not at the edge: level 18 needs ~120s
    // to finish, so a 120s budget turned pilot luck into timeouts.
    return Math.max(90, Math.round((worldWidth || 0) / 40));
}

export function mechanicalFlags(analysis, allAnalyses, selfId) {
    const flags = [];
    if (
        analysis.platformCount >= 6 &&
        (analysis.platformKeys.length < 3 || analysis.dominantKeyShare > 0.8)
    ) {
        flags.push({
            id: 'flat-deck',
            detail: `${analysis.platformKeys.length} deck key(s), dominant share ${analysis.dominantKeyShare.toFixed(2)} across ${analysis.platformCount} decks`,
        });
    }
    for (const [id, other] of Object.entries(allAnalyses || {})) {
        if (String(id) === String(selfId)) continue;
        const similarity = skeletonSimilarity(analysis, other);
        if (similarity >= 0.75) {
            flags.push({
                id: 'clone-suspect',
                detail: `skeleton similarity ${similarity} to level ${id} (${other.title || 'untitled'})`,
            });
        }
    }
    const sameBackground = Object.entries(allAnalyses || {}).filter(
        ([id, other]) =>
            String(id) !== String(selfId) && other.backgroundType === analysis.backgroundType
    );
    if (analysis.backgroundType && sameBackground.length >= 2) {
        flags.push({
            id: 'background-recycled',
            detail: `background type '${analysis.backgroundType}' already used by levels ${sameBackground.map(([id]) => id).join(', ')}; build report must claim a new composition device`,
        });
    }
    if (analysis.worldWidth > 3000 && analysis.hazardTypes.length < 2) {
        flags.push({
            id: 'low-hazard-variety',
            detail: `hazard types [${analysis.hazardTypes.join(', ')}] over ${analysis.worldWidth}px`,
        });
    }
    if (analysis.worldWidth >= 6000) {
        const points = [0, ...analysis.checkpoints.map((c) => c.x), analysis.crownX].sort(
            (a, b) => a - b
        );
        for (let i = 1; i < points.length; i += 1) {
            if (points[i] - points[i - 1] > 2500) {
                flags.push({
                    id: 'checkpoint-desert',
                    detail: `no checkpoint between x=${points[i - 1]} and x=${points[i]}`,
                });
                break;
            }
        }
    }
    if (analysis.crownX > 2000 && !analysis.hasBoss && analysis.finaleHazardCount === 0) {
        flags.push({
            id: 'sleeping-finale',
            detail: 'no hazard within 900px before the crown and no crown gate',
        });
    }
    return flags;
}

// ---------- News brief parsing + fidelity checks (pure) ----------

// Accepts the build-report markdown shape: a fact→mechanic table and an
// element inventory line/list. Fail-closed: missing pieces stay missing.
export function parseNewsBrief(markdown) {
    const text = String(markdown || '');
    const headlineMatch = text.match(/^#.*$/m) || text.match(/headline[:\s]+(.+)/i);
    // Mappings come from the FIRST table only (the fact→mechanic table). Build
    // notes carry later tables (Novelty Ledger, canvases) that are not rows.
    const mappings = [];
    let inFirstTable = false;
    let firstTableDone = false;
    for (const line of text.split('\n')) {
        if (!line.trim().startsWith('|')) {
            if (inFirstTable) {
                inFirstTable = false;
                firstTableDone = true;
            }
            continue;
        }
        if (firstTableDone) {
            continue;
        }
        inFirstTable = true;
        const cells = line
            .split('|')
            .map((cell) => cell.trim())
            .filter(Boolean);
        if (cells.length >= 3 && !/story fact/i.test(cells[0]) && !/^-+$/.test(cells[0])) {
            mappings.push({ fact: cells[0], mechanic: cells[1], why: cells[2] });
        }
    }
    const elements = [];
    const inventoryMatch = text.match(/element inventory[^:\n]*:\s*([^\n]+)/i);
    if (inventoryMatch) {
        const inventoryLine = inventoryMatch[1].replace(/\.\s*Themed enemy:.*$/i, '').trim();
        for (let item of inventoryLine.split(/[,;]/)) {
            item = item.replace(/\.*$/, '').trim();
            const cleaned = item.replace(/\(.*?\)/g, '').trim();
            if (cleaned) elements.push(cleaned);
        }
    }
    const bulletBlock = text.match(/element inventory[\s\S]{0,40}?\n((?:\s*[-*].+\n?)+)/i);
    if (!elements.length && bulletBlock) {
        for (const line of bulletBlock[1].split('\n')) {
            const cleaned = line
                .replace(/^\s*[-*]\s*/, '')
                .replace(/\.*$/, '')
                .trim();
            if (cleaned) elements.push(cleaned);
        }
    }
    return {
        headline: headlineMatch ? headlineMatch[0].replace(/^#+\s*/, '').trim() : null,
        elements,
        mappings,
    };
}

export function elementVerdict(probability) {
    if (probability >= 0.7) return 'shown';
    if (probability >= 0.4) return 'faint';
    return 'missing';
}

// Code-side claim check: an element counts as claimed only when one of its
// distinctive tokens appears in the level corpus (instructions, texture
// keys, hazard config, asset paths). Reskin-by-title does not claim.
export function fidelityCodeChecks(brief, corpus) {
    const haystack = String(corpus || '').toLowerCase();
    const elements = (brief?.elements || []).map((element) => {
        const tokens = element
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((token) => token.length >= 4);
        const claimed = tokens.some((token) => haystack.includes(token));
        return { element, claimed };
    });
    const sceneryOnly = (brief?.mappings || []).filter(
        (row) =>
            !/gravity|hazard|objective|topology|laser|drone|roller|crusher|drip|beam|boss|checkpoint|crown|wave|patrol|timing/i.test(
                row.mechanic
            )
    );
    return { elements, sceneryOnlyFacts: sceneryOnly.map((row) => row.fact) };
}

// Fidelity gate from panel answers. `elements` entries carry `noul`
// probabilities; `rows` entries carry choice + confidence. `confirmed`
// holds exact needsHuman keys a human verified against the screenshots
// (recorded in evidence/<id>/human.json); confirmed rows count as
// supports and confirmed faint elements count as shown.
export function fidelityGate({
    elements = [],
    rows = [],
    mechanicMean,
    visualMean,
    reviewerFlaw,
    confirmed = [],
}) {
    const isConfirmed = (key) => confirmed.includes(key);
    const verdicts = elements.map((entry) =>
        isConfirmed(`element:${entry.element}`) ? 'shown' : elementVerdict(entry.noul ?? 0)
    );
    const shown = verdicts.filter((v) => v === 'shown').length;
    const contradicted = rows.filter((row) => row.choice === 'contradicts').length;
    const unsupported = rows.filter(
        (row) => row.choice === 'unsupported' && !isConfirmed(`row:${row.fact}`)
    ).length;
    const needsHuman = [
        ...elements
            .filter(
                (entry) =>
                    elementVerdict(entry.noul ?? 0) === 'faint' &&
                    !isConfirmed(`element:${entry.element}`)
            )
            .map((entry) => `element:${entry.element}`),
        ...rows
            .filter((row) => (row.confidence ?? 0) < 0.8 && !isConfirmed(`row:${row.fact}`))
            .map((row) => `row:${row.fact}`),
    ];
    const passed =
        shown >= 3 &&
        contradicted === 0 &&
        unsupported <= 1 &&
        (mechanicMean ?? 0) >= 2.5 &&
        (visualMean ?? 0) >= 2.5 &&
        (reviewerFlaw || 'none') === 'none';
    return { passed, shown, contradicted, unsupported, needsHuman };
}

// Single source of truth for the flaw enum; qualityQuestions() and the gate
// both read from here so the gate can never name a flaw that cannot occur.
export const FLAW_OPTIONS = {
    none: 'No real flaw.',
    flat: 'Flat deck row.',
    clone: 'Copied sibling.',
    'sleeping-finale': 'Finale does not press.',
    sponge: 'Length without decisions.',
    cheap: 'Dishonest deaths.',
    'empty-route': 'Dead route.',
    blind: 'Unreadable in time.',
    stale: 'Already taught this way.',
    'off-theme': 'Fiction and play disagree.',
    unreadable: 'Cannot tell solid from lethal.',
};
export const STRUCTURAL_FLAWS = new Set(['blind', 'cheap', 'unreadable', 'clone']);

// Quality gate v2, anchored to shipped level 1 (fun mean 1.5, fairness mean 2.6,
// novelty mean 0.9): AI judges score conservatively, so absolute 2.5 floors are
// unreachable even for shipped levels. The gate instead asks: can any judge name
// a concrete flaw, and does the level clear playable floors? A tutorial-simple
// level still iterates on named flaws (flat) — human judgment applies there.
export function panelPassed(reports, flags, screenshotsSent) {
    const list = reports || [];
    const reworks = list.filter((report) => report.verdict === 'rework').length;
    const flawless = list.filter((report) => (report.flaw || 'none') === 'none').length;
    const structural = list.filter((report) => STRUCTURAL_FLAWS.has(report.flaw)).length;
    const mean = (key) =>
        list.length ? list.reduce((sum, r) => sum + (r[key] || 0), 0) / list.length : 0;
    return Boolean(
        list.length === 4 &&
        reworks === 0 &&
        flawless >= 3 &&
        structural === 0 &&
        mean('fun') >= 1.5 &&
        mean('fairness') >= 1.5 &&
        !(flags || []).some((flag) => flag.id === 'clone-suspect' || flag.id === 'flat-deck') &&
        screenshotsSent !== false
    );
}

// ---------- Capture: pilot telemetry + screenshot beat sheet ----------

function sampleLevel() {
    const snap = window.__spaceChickenDebug.getBotSnapshot();
    return {
        level: snap.level,
        ready: snap.ready,
        deaths: snap.deaths,
        player: snap.player ? { x: Math.round(snap.player.x), y: Math.round(snap.player.y) } : null,
        crownShield: snap.crown?.shielded,
        hazards: (snap.hazards || []).map((h) => h.type),
    };
}

export async function captureEvidence(levelId, analysis) {
    const { createServer } = require(path.join(ROOT, 'server.cjs'));
    const { chromium } = await import(path.join(ROOT, 'node_modules/playwright/index.mjs'));
    const { buildPilotSource } = await import('./pilot-brain.mjs');
    const evidenceDir = path.join(ROOT, 'docs/level-reviews/evidence', `level-${levelId}`);
    mkdirSync(evidenceDir, { recursive: true });
    const server = createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const browser = await chromium.launch({
        headless: true,
        args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
    });
    const telemetry = {
        level: levelId,
        outcome: 'timeout',
        durationSec: 0,
        deaths: 0,
        deathSpots: [],
        maxX: 0,
        hazardTypesSeen: [],
        errors: [],
    };
    const shots = [];
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
        page.on('pageerror', (error) => telemetry.errors.push(error.message));
        await page.goto(`http://127.0.0.1:${port}/?debug=1&level=${levelId}`, {
            timeout: 20000,
        });
        await page.waitForFunction(() => window.__spaceChickenDebug?.ready(), null, {
            timeout: 20000,
        });
        await page.evaluate(buildPilotSource());
        // Pilot plays from spawn with real input; teleports below only
        // position the camera for the beat sheet after the play sample.
        const start = Date.now();
        const seen = new Set();
        let deaths0 = null;
        let prevDeaths = 0;
        let prevX = null;
        const budgetMs = pilotBudgetSec(analysis?.worldWidth) * 1000;
        while (Date.now() - start < budgetMs) {
            const sample = await page.evaluate(sampleLevel);
            if (deaths0 == null) {
                deaths0 = sample.deaths || 0;
                prevDeaths = deaths0;
            }
            telemetry.deaths = (sample.deaths || 0) - deaths0;
            // The poll may catch the pilot already respawned, so the death
            // spot is the last position BEFORE the death counter moved.
            if ((sample.deaths || 0) > prevDeaths && prevX != null) {
                for (let d = prevDeaths; d < (sample.deaths || 0); d += 1) {
                    telemetry.deathSpots.push(prevX);
                }
                prevDeaths = sample.deaths || 0;
            }
            if (sample.player) {
                telemetry.maxX = Math.max(telemetry.maxX, sample.player.x);
                prevX = sample.player.x;
            }
            for (const type of sample.hazards || []) seen.add(type);
            if (sample.level !== levelId) {
                telemetry.outcome = 'crown-collected';
                break;
            }
            if (analysis?.hasBoss && sample.crownShield === false) {
                telemetry.outcome = 'gate-open';
                break;
            }
            await page.waitForTimeout(150);
        }
        telemetry.durationSec = Math.round((Date.now() - start) / 100) / 10;
        telemetry.hazardTypesSeen = [...seen];
        if (telemetry.outcome === 'timeout' && telemetry.maxX > (analysis?.crownX || 0) - 200) {
            telemetry.outcome = 'reached-crown-area';
        }
        // Beat sheet: opener, mid set piece, finale. Re-enter the level under
        // review first: a crown-collect during the pilot run advances to
        // NEXT_LEVEL, and beats shot there would judge the wrong level.
        await page.evaluate((id) => window.__spaceChickenDebug.goToLevel(id), levelId);
        await page.waitForFunction(() => window.__spaceChickenDebug?.ready(), null, {
            timeout: 20000,
        });
        await page.waitForTimeout(800);
        const beats = [{ id: '01-opener', x: 150, y: 480, proves: 'spawn read and first move' }];
        beats.push({
            id: '02-mid',
            x: Math.round((analysis?.worldWidth || 2000) / 2),
            y: 400,
            proves: 'mid-level set piece and hazard read',
        });
        beats.push({
            id: '03-finale',
            x: Math.max(150, (analysis?.crownX || 600) - 320),
            y: 400,
            proves: 'crown approach and finale pressure',
        });
        for (const beat of beats) {
            await page.evaluate(
                ([x, y]) => window.__spaceChickenDebug.teleport(x, y),
                [beat.x, beat.y]
            );
            await page.evaluate(() => {
                const scene = window.SPACE_CHICKEN_GAME?.scene.getScenes(true)[0];
                scene?.physics?.world?.pause();
                // Freeze tweens and the clock too: beats must capture a
                // deterministic world, or crusher phases and dive cycles
                // differ run to run and the vision verdicts go flaky.
                scene?.tweens?.pauseAll();
                if (scene?.time) {
                    scene.time.paused = true;
                }
            });
            await page.waitForTimeout(650);
            const file = `${beat.id}.jpg`;
            await page.screenshot({
                path: path.join(evidenceDir, file),
                type: 'jpeg',
                quality: 72,
            });
            shots.push({ ...beat, file, path: path.join(evidenceDir, file) });
        }
        writeFileSync(
            path.join(evidenceDir, 'shots.json'),
            `${JSON.stringify({ level: levelId, shots }, null, 2)}\n`
        );
    } finally {
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
    return { telemetry, shots, evidenceDir };
}

// ---------- Jev panels ----------

function qualityQuestions(persona) {
    const head = `You are ${persona.name}. ${persona.profile} Judge ONLY the level described in state.level from state.telemetry, state.mechanicalFlags, and the screenshots referenced in state.shots. The telemetry comes from a mid-skill bot pilot. telemetry.deathSpots lists the x-position of each death: deaths clustered within ~200px suggest a cheap spot, spread-out deaths suggest pilot skill, so judge cheapness by that pattern and flags, not raw counts. Judge the level in its campaign role: levels 1-3 are teaching levels and levels 8-16 are contra stages; a short teaching level is not a failed contra stage, but no role excuses clones, blind deaths, or a sleeping finale for its size. If telemetry.maxX never neared state.level.crownX, the finale is untested: name what blocked progress instead of 'sleeping-finale'. If state.screenshotsSent is false, cap readability at 2 and say the visual evidence was missing. Score as this persona, not as the designer.`;
    return {
        fun: score(`${head} How FUN is this level?`, SCORE_LEVELS.fun),
        fairness: score(`${head} How FAIR is this level?`, SCORE_LEVELS.fairness),
        readability: score(
            `${head} How READABLE is this level at gameplay size?`,
            SCORE_LEVELS.readability
        ),
        novelty: score(
            `${head} How NOVEL is this level against the shipped roster in state.roster?`,
            SCORE_LEVELS.novelty
        ),
        pacing: score(
            `${head} How well PACED is this level (teach, press, rest, finale)?`,
            SCORE_LEVELS.pacing
        ),
        theme: score(
            `${head} How well does this level fit its theme and Space Chicken?`,
            SCORE_LEVELS.theme
        ),
        flaw: choice(
            {
                task: `${head} Name this level's single biggest flaw, or none.`,
                guidance: FLAW_GUIDANCE,
            },
            FLAW_OPTIONS
        ),
        verdict: choice(
            {
                task: `${head} Give a final verdict on this level.`,
                guidance: [
                    'ship: fun, fair, readable, and fresh enough to release.',
                    'iterate: one real flaw to fix first.',
                    'rework: concept is a clone, flat, or off-theme; needs a new idea.',
                ],
            },
            {
                ship: 'Release it.',
                iterate: 'Fix the named flaw first.',
                rework: 'Needs a new concept.',
            }
        ),
    };
}

export async function runQualityPanel(
    client,
    { levelId, analysis, telemetry, flags, roster, shots = [] }
) {
    const shotState = [];
    for (const shot of (shots || []).slice(0, 4)) {
        shotState.push({
            beat: shot.id,
            proves: shot.proves,
            image: image(await openAsBlob(shot.path)),
        });
    }
    const screenshotsSent = shotState.length > 0;
    const reports = [];
    for (const persona of PERSONAS) {
        const response = await client.systemOne(
            {
                state: {
                    level: { id: levelId, ...analysis },
                    telemetry,
                    mechanicalFlags: flags,
                    roster,
                    screenshotsSent,
                    shots: shotState,
                    persona: { id: persona.id, profile: persona.profile },
                },
                questions: qualityQuestions(persona),
            },
            {
                timeout: 30000,
                retry: { maxRetries: 1 },
                headers: screenshotsSent ? { 'TypeSafe-Danger-Zone-Images': 'true' } : undefined,
            }
        );
        const answers = response.answers;
        reports.push({
            persona: persona.id,
            name: persona.name,
            fun: answers.fun.score,
            fairness: answers.fairness.score,
            readability: answers.readability.score,
            novelty: answers.novelty.score,
            pacing: answers.pacing.score,
            theme: answers.theme.score,
            flaw: answers.flaw.choice,
            verdict: answers.verdict.choice,
        });
        console.log(
            `${persona.name}: fun=${answers.fun.score.toFixed(1)} fair=${answers.fairness.score.toFixed(1)} novel=${answers.novelty.score.toFixed(1)} flaw=${answers.flaw.choice} -> ${answers.verdict.choice}`
        );
    }
    return reports;
}

// Send screenshots to the fidelity panel over raw HTTP with base64 assets.
// The SDK has an image() helper now, but this path is proven and stays.
export async function sendScreenshots({ apiKey, baseURL, brief, codeChecks, shots, telemetry }) {
    const picked = (shots || []).slice(0, 4);
    if (!picked.length) return { sent: false, reason: 'no screenshots captured' };
    const assets = {};
    const shotState = [];
    for (const shot of picked) {
        const blob = await openAsBlob(shot.path);
        const buffer = Buffer.from(await blob.arrayBuffer());
        const ref = `${randomUUID()}-shot`;
        assets[ref] = {
            type: 'image',
            format: 'jpg',
            data_base64: buffer.toString('base64'),
        };
        shotState.push({ beat: shot.id, proves: shot.proves, image: ref });
    }
    const elementQuestions = {};
    (brief.elements || []).slice(0, 6).forEach((element, index) => {
        elementQuestions[`element_${index}`] = {
            type: 'noul',
            instructions: `Is the story element "${element}" recognisably visible in \`shots\` at gameplay size, without reading the level instructions? Judge only what the screenshots show.`,
        };
    });
    const rowQuestions = {};
    (brief.mappings || []).slice(0, 6).forEach((row, index) => {
        rowQuestions[`row_${index}`] = {
            type: 'choice',
            instructions: `The brief claims this news fact became this mechanic: fact="${row.fact}" mechanic="${row.mechanic}". Do the screenshots in \`shots\` plus the telemetry support that the mechanic is really in play, contradict it, or leave it unsupported? A mechanic present in data but never visible or encountered is unsupported.`,
            criteria: {
                supports: 'Evidence shows the mechanic in play.',
                contradicts: 'Evidence shows the opposite or a generic substitute.',
                unsupported: 'Evidence neither shows nor refutes it.',
            },
        };
    });
    const body = {
        model: 'jev-latest',
        state: {
            brief: { headline: brief.headline, elements: brief.elements, mappings: brief.mappings },
            codeChecks,
            telemetry,
            shots: shotState,
        },
        assets,
        questions: {
            ...elementQuestions,
            ...rowQuestions,
            mechanic_fidelity: {
                type: 'score',
                instructions:
                    'Do the story forces in `brief` drive what the player does in `shots` and telemetry, or only what the place looks like? Score mechanic fidelity.',
                criteria: FIDELITY_LEVELS.mechanic,
            },
            visual_fidelity: {
                type: 'score',
                instructions:
                    'Could a player who knows the headline in `brief` name the story from `shots` alone? Score visual fidelity.',
                criteria: FIDELITY_LEVELS.visual,
            },
            fidelity_flaw: {
                type: 'choice',
                instructions: 'Name the single biggest faithfulness flaw, or none.',
                criteria: {
                    none: 'Faithful; earns the story.',
                    'palette-swap': 'Generic level with themed colours.',
                    'missing-elements': 'Signature story elements absent.',
                    'scenery-only': 'Facts decorate; none mechanise.',
                    'wrong-story': 'Reads as a different event.',
                    tasteless: 'Tragedy or disaster turned into shooting victims.',
                },
            },
        },
    };
    const endpoint = `${String(baseURL || 'https://api.typesafe.ai').replace(/\/$/, '')}/v1/systemone`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'TypeSafe-Danger-Zone-Images': 'true',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(
            `fidelity image request failed (${response.status}): ${detail.slice(0, 300)}`
        );
    }
    const payload = await response.json();
    const answers = payload.answers || {};
    const elements = (brief.elements || []).slice(0, 6).map((element, index) => ({
        element,
        noul: answers[`element_${index}`]?.noul ?? 0,
        verdict: elementVerdict(answers[`element_${index}`]?.noul ?? 0),
    }));
    const rows = (brief.mappings || []).slice(0, 6).map((row, index) => ({
        fact: row.fact,
        mechanic: row.mechanic,
        choice: answers[`row_${index}`]?.choice || 'unsupported',
        confidence: answers[`row_${index}`]?.confidence ?? 0,
    }));
    return {
        sent: true,
        elements,
        rows,
        mechanicFidelity: answers.mechanic_fidelity?.score ?? 0,
        visualFidelity: answers.visual_fidelity?.score ?? 0,
        fidelityFlaw: answers.fidelity_flaw?.choice || 'unsupported',
        usage: payload.usage || null,
    };
}

// ---------- Reports + main ----------

function renderReport(report) {
    const lines = [
        `# Level critic — level ${report.level} (${report.analysis?.title || 'untitled'})`,
        '',
        `- Run: ${report.run}`,
        `- Screenshots sent to critic: ${report.screenshotsSent}`,
        `- Mechanical flags: ${report.flags.length ? report.flags.map((f) => `${f.id} (${f.detail})`).join('; ') : 'none'}`,
        `- Telemetry: ${report.telemetry ? JSON.stringify(report.telemetry) : 'static run, no capture'}`,
        `- Quality gate: ${report.passed ? 'PASS' : 'ITERATE/REWORK'}`,
    ];
    if (report.reports?.length) {
        lines.push('', '## Quality panel', '');
        for (const entry of report.reports) {
            lines.push(
                `- ${entry.name}: fun=${entry.fun.toFixed(1)} fair=${entry.fairness.toFixed(1)} read=${entry.readability.toFixed(1)} novel=${entry.novelty.toFixed(1)} pace=${entry.pacing.toFixed(1)} theme=${entry.theme.toFixed(1)} flaw=${entry.flaw} -> ${entry.verdict}`
            );
        }
    } else {
        lines.push(
            '',
            '## Quality panel',
            '',
            '- unavailable (no API key or static run); mechanical pass only.'
        );
    }
    if (report.fidelity) {
        lines.push('', '## News fidelity', '');
        lines.push(`- Brief: ${report.fidelity.briefHeadline || 'missing'}`);
        lines.push(`- Gate: ${report.fidelity.gate?.passed ? 'PASS' : 'FAIL'}`);
        for (const entry of report.fidelity.elements || []) {
            lines.push(
                `- Element "${entry.element}": ${entry.verdict || entry.claimed} (noul=${(entry.noul ?? 0).toFixed(2)})`
            );
        }
        for (const row of report.fidelity.rows || []) {
            lines.push(
                `- Row "${row.fact}" -> ${row.choice} (confidence=${(row.confidence ?? 0).toFixed(2)})`
            );
        }
        if (report.fidelity.humanConfirmed?.length) {
            lines.push(`- Human confirmed: ${report.fidelity.humanConfirmed.join('; ')}`);
        }
        if (report.fidelity.gate?.needsHuman?.length) {
            lines.push(`- Needs human: ${report.fidelity.gate.needsHuman.join('; ')}`);
        }
    }
    lines.push('', `Evidence: docs/level-reviews/evidence/level-${report.level}/shots.json`, '');
    return lines.join('\n');
}

function loadHumanConfirmations(evidenceDir) {
    try {
        const human = JSON.parse(readFileSync(path.join(evidenceDir, 'human.json'), 'utf8'));
        if (Array.isArray(human?.confirmed)) return human.confirmed;
    } catch {
        // No confirmations recorded.
    }
    return [];
}

// eslint-disable-next-line complexity -- orchestrates static/capture/panel stages in order
async function main() {
    const args = process.argv.slice(2).filter((arg) => arg !== '--');
    const isStatic = args.includes('--static') || process.env.CRITIC_STATIC === '1';
    const briefFlagIndex = args.indexOf('--brief');
    const briefPath =
        (briefFlagIndex >= 0 ? args[briefFlagIndex + 1] : null) || process.env.NEWS_BRIEF || null;
    const levelId = Number(args.find((arg) => /^\d+$/.test(arg)));
    if (!Number.isFinite(levelId) || levelId <= 0) {
        throw new Error(
            'usage: node scripts/level-critic.mjs <level-id> [--static] [--brief <path>]'
        );
    }
    const { LEVEL_CONTENT, LEVEL_DEFINITIONS } = await import(path.join(ROOT, 'levels/index.js'));
    const content = LEVEL_CONTENT[levelId];
    const definition = LEVEL_DEFINITIONS[levelId];
    if (!content || !definition) throw new Error(`no level with id ${levelId}`);
    const allAnalyses = {};
    for (const [id, entry] of Object.entries(LEVEL_CONTENT)) {
        allAnalyses[id] = analyseLevel(entry, LEVEL_DEFINITIONS[id]);
    }
    const analysis = allAnalyses[levelId];
    const flags = mechanicalFlags(analysis, allAnalyses, levelId);
    const roster = Object.entries(allAnalyses).map(([id, entry]) => ({
        id: Number(id),
        title: entry.title,
        backgroundType: entry.backgroundType,
        hazardTypes: entry.hazardTypes,
    }));

    let telemetry = null;
    let shots = [];
    let screenshotsSent = false;
    let reports = [];
    let fidelity = null;

    let humanConfirmed = [];
    if (!isStatic) {
        const captured = await captureEvidence(levelId, analysis);
        telemetry = captured.telemetry;
        shots = captured.shots;
        if (telemetry.errors?.length) {
            throw new Error(`page errors during capture: ${telemetry.errors.join(' | ')}`);
        }
        humanConfirmed = loadHumanConfirmations(captured.evidenceDir);
    }

    // News brief resolution: explicit path, else build report, else selection.
    let brief = null;
    let briefSource = null;
    const briefCandidates = [
        briefPath,
        path.join(ROOT, 'docs/level-builds', `${levelId}.md`),
    ].filter(Boolean);
    for (const candidate of briefCandidates) {
        const resolved = path.isAbsolute(candidate) ? candidate : path.join(ROOT, candidate);
        if (existsSync(resolved)) {
            brief = parseNewsBrief(readFileSync(resolved, 'utf8'));
            briefSource = resolved;
            if (brief.elements.length || brief.mappings.length) break;
        }
    }
    const isNewsLevel = Boolean(brief && (brief.elements.length || brief.mappings.length));

    const apiKey = readTypeSafeApiKey();
    if (!isStatic && apiKey) {
        const client = new TypeSafeClient({ apiKey, logLevel: 'off' });
        // Quality panel judges telemetry plus the beat screenshots as image
        // evidence; without shots it falls back to text state and caps
        // readability via the screenshotsSent flag in the prompt.
        reports = await runQualityPanel(client, {
            levelId,
            analysis,
            telemetry,
            flags,
            roster,
            shots,
        });
        screenshotsSent = shots.length > 0;
        if (isNewsLevel && shots.length) {
            const corpus = JSON.stringify(content).toLowerCase();
            const codeChecks = fidelityCodeChecks(brief, corpus);
            try {
                const sent = await sendScreenshots({
                    apiKey,
                    baseURL: process.env.TYPESAFE_BASE_URL,
                    brief,
                    codeChecks,
                    shots,
                    telemetry,
                });
                screenshotsSent = sent.sent;
                const reviewerFlaw = sent.fidelityFlaw;
                const gate = fidelityGate({
                    elements: sent.elements,
                    rows: sent.rows,
                    mechanicMean: sent.mechanicFidelity,
                    visualMean: sent.visualFidelity,
                    reviewerFlaw,
                    confirmed: humanConfirmed,
                });
                fidelity = {
                    briefHeadline: brief.headline,
                    briefSource,
                    codeChecks,
                    ...sent,
                    gate,
                    humanConfirmed,
                };
            } catch (error) {
                console.error(`fidelity panel unavailable: ${error.message}`);
                fidelity = {
                    briefHeadline: brief.headline,
                    briefSource,
                    codeChecks,
                    sent: false,
                    gate: {
                        passed: false,
                        shown: 0,
                        contradicted: 0,
                        unsupported: 0,
                        needsHuman: ['fidelity-panel-unavailable'],
                    },
                };
            }
        } else if (isNewsLevel) {
            fidelity = {
                briefHeadline: brief.headline,
                briefSource,
                sent: false,
                gate: {
                    passed: false,
                    shown: 0,
                    contradicted: 0,
                    unsupported: 0,
                    needsHuman: ['no-screenshots'],
                },
            };
        }
    } else if (isNewsLevel) {
        const corpus = JSON.stringify(content).toLowerCase();
        fidelity = {
            briefHeadline: brief.headline,
            briefSource,
            codeChecks: fidelityCodeChecks(brief, corpus),
            sent: false,
            gate: {
                passed: false,
                shown: 0,
                contradicted: 0,
                unsupported: 0,
                needsHuman: ['panel-unavailable'],
            },
        };
    }

    const qualityPassed = reports.length
        ? panelPassed(reports, flags, screenshotsSent)
        : !flags.some((flag) => flag.id === 'clone-suspect' || flag.id === 'flat-deck');
    const passed = isStatic
        ? qualityPassed
        : Boolean(reports.length) && qualityPassed && (!isNewsLevel || fidelity?.gate?.passed);

    const report = {
        level: levelId,
        run: isStatic ? 'static' : apiKey ? 'full' : 'mechanical-only',
        analysis,
        flags,
        telemetry,
        shots: shots.map(({ id, file, proves }) => ({ id, file, proves })),
        screenshotsSent,
        reports,
        fidelity,
        passed,
    };
    mkdirSync(path.join(ROOT, 'docs/level-reviews'), { recursive: true });
    writeFileSync(
        path.join(ROOT, 'docs/level-reviews', `level-${levelId}.json`),
        `${JSON.stringify(report, null, 2)}\n`
    );
    writeFileSync(
        path.join(ROOT, 'docs/level-reviews', `level-${levelId}.md`),
        renderReport(report)
    );
    console.log(`critic report: docs/level-reviews/level-${levelId}.md`);
    console.log(passed ? 'CRITIC: PASS' : 'CRITIC: ITERATE');
    process.exitCode = passed ? 0 : 2;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}
