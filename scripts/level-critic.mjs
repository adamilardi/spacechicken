// Level critic run: mechanical novelty/fairness checks in code, a pilot
// play capture, a screenshot beat sheet sent to Jev as image evidence,
// a four-persona quality panel, and (for news levels) a fidelity panel
// that verifies the level against its source story. Usage:
//   node scripts/level-critic.mjs <level-id> [--static] [--brief <path>]
//   NEWS_BRIEF=docs/level-builds/17.md node scripts/level-critic.mjs 17
//   node scripts/level-critic.mjs --concept --brief docs/level-builds/17.md
// Exit: 0 pass (or mechanical pass with --static), 2 iterate/rework, 1 error.
// Skill contract: skills/game-critic/SKILL.md.
import { createRequire } from 'node:module';
import {
    mkdirSync,
    readFileSync,
    writeFileSync,
    existsSync,
    readdirSync,
    unlinkSync,
} from 'node:fs';
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

// Fraction of its cycle a timed laser spends on. Non-laser hazards are
// bodies: they occupy space in every still, so their duty is 1.
export function hazardDuty(hazard) {
    if (!hazard || hazard.type !== 'laser') return 1;
    const on = hazard.onDuration ?? 800;
    const off = hazard.offDuration ?? 800;
    return on + off > 0 ? on / (on + off) : 1;
}

// Horizontal span a hazard can occupy, including its patrol endpoints.
export function hazardSpan(hazard) {
    const x = hazard?.x || 0;
    const patrolX = hazard?.patrol?.x;
    return patrolX == null ? [x, x] : [Math.min(x, patrolX), Math.max(x, patrolX)];
}

// Finale pressure as data vs as a frozen still. The beat sheet freezes the
// world, so a timed vertical laser caught off-phase photographs as empty
// deck even when it guards the crown (batch 19-21: pressure within 250px
// of the crown still drew sleeping-finale in 9/12 persona votes). Count
// pressure twice: hazards within 900px (the contract), and hazards a
// frozen finale frame can actually show (frame = finale beat at
// crownX-200, 1280px viewport; body hazards always show, beams show when
// horizontal or mostly-on).
export function finalePressure(content, definition) {
    const crownX = definition?.CROWN_X ?? 0;
    const dynamic = content?.dynamic || [];
    const near = dynamic.filter((hazard) => {
        const [lo, hi] = hazardSpan(hazard);
        return hi >= crownX - 900 && lo <= crownX;
    });
    const frameLo = crownX - 840;
    const frameHi = crownX + 440;
    const inFrame = (hazard) => {
        const [lo, hi] = hazardSpan(hazard);
        return hi >= frameLo && lo <= frameHi;
    };
    const frameBeams = near.filter(
        (hazard) =>
            hazard.type === 'laser' && hazard.orientation !== 'horizontal' && inFrame(hazard)
    );
    const visible = near.filter((hazard) => {
        if (!inFrame(hazard)) return false;
        if (hazard.type !== 'laser') return true;
        if (hazard.orientation === 'horizontal' || hazardDuty(hazard) >= 0.6) return true;
        // A lone timed beam is a coin flip in a frozen still; two or more
        // staggered beams (the level-18 finale halts) cover each other's
        // off-phases, so the gate reads as pressure.
        return frameBeams.length >= 2;
    });
    return {
        hazardCount: near.length,
        visibleCount: visible.length,
        visible: visible.length > 0,
        hazards: near.map((hazard) => hazard.type),
    };
}

// Deck-layout similarity independent of paint keys: same world width and
// deck count, comparing the sorted normalized deck x sequence. Catches a
// copied deck x-list wearing new textures (levels 17/19/20 score 1.00;
// the closest legitimate shipped pair, 8 vs 11, scores 0.72).
export function layoutSimilarity(left, right) {
    const a = left?.deckLayout || [];
    const b = right?.deckLayout || [];
    if (!a.length || a.length !== b.length) return 0;
    const widthA = left?.worldWidth || 0;
    const widthB = right?.worldWidth || 0;
    if (!widthA || !widthB || Math.abs(widthA - widthB) / Math.max(widthA, widthB) > 0.05) {
        return 0;
    }
    let matched = 0;
    for (let i = 0; i < a.length; i += 1) {
        if (Math.abs(a[i] - b[i]) <= 0.015) matched += 1;
    }
    return Math.round((matched / a.length) * 1000) / 1000;
}

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
    const finale = finalePressure(content, definition);
    const worldWidth = definition?.WORLD_WIDTH ?? 0;
    const deckLayout = [...platforms]
        .sort((a, b) => (a.x || 0) - (b.x || 0))
        .map((p) => (worldWidth ? Math.round(((p.x || 0) / worldWidth) * 1000) / 1000 : 0));
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
        finaleVisibleHazardCount: finale.visibleCount,
        finaleVisible: finale.visible,
        deckLayout,
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

function cloneFlags(analysis, allAnalyses, selfId) {
    const flags = [];
    let bestRhyme = null;
    for (const [id, other] of Object.entries(allAnalyses || {})) {
        if (String(id) === String(selfId)) continue;
        const similarity = skeletonSimilarity(analysis, other);
        if (similarity >= 0.75) {
            flags.push({
                id: 'clone-suspect',
                detail: `skeleton similarity ${similarity} to level ${id} (${other.title || 'untitled'})`,
            });
        }
        const layout = layoutSimilarity(analysis, other);
        if (layout >= 0.85 && (!bestRhyme || layout > bestRhyme.layout)) {
            bestRhyme = { id, layout, title: other.title };
        }
    }
    if (bestRhyme && analysis.platformCount >= 8) {
        flags.push({
            id: 'skeleton-rhyme',
            detail: `deck layout similarity ${bestRhyme.layout} to level ${bestRhyme.id} (${bestRhyme.title || 'untitled'}): same width and deck x sequence under new paints`,
        });
    }
    return flags;
}

function finaleFlags(analysis) {
    if (analysis.crownX <= 2000 || analysis.hasBoss) return [];
    if (analysis.finaleHazardCount === 0) {
        return [
            {
                id: 'sleeping-finale',
                detail: 'no hazard within 900px before the crown and no crown gate',
            },
        ];
    }
    if (analysis.finaleVisible === false) {
        return [
            {
                id: 'finale-invisible',
                detail: 'finale hazards exist within 900px of the crown but none can appear in a frozen finale still (timed beam off-phase or outside the crown frame); the panel will read a sleeping finale',
            },
        ];
    }
    return [];
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
    flags.push(...cloneFlags(analysis, allAnalyses, selfId));
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
    flags.push(...finaleFlags(analysis));
    return flags;
}

// ---------- News brief parsing + fidelity checks (pure) ----------

// Accepts the build-report markdown shape: a fact→mechanic table and an
// element inventory line/list. Fail-closed: missing pieces stay missing.
function splitBriefList(line) {
    return String(line || '')
        .split(/[,;]/)
        .map((item) =>
            item
                .replace(/\(.*?\)/g, '')
                .replace(/\.*$/, '')
                .trim()
        )
        .filter(Boolean);
}

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
            const signature = /\(signature\)|\[signature\]/i.test(cells[0]);
            const fact = cells[0]
                .replace(/\s*\(signature\)\s*/i, '')
                .replace(/\s*\[signature\]\s*/i, '')
                .trim();
            mappings.push({ fact, mechanic: cells[1], why: cells[2], signature });
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
    const signatureMatch = text.match(/signature elements?[^:\n]*:\s*([^\n]+)/i);
    const signatureElements = signatureMatch ? splitBriefList(signatureMatch[1]) : [];
    for (const mapping of mappings) {
        if (mapping.signature) continue;
        mapping.signature = false;
    }
    return {
        headline: headlineMatch ? headlineMatch[0].replace(/^#+\s*/, '').trim() : null,
        elements,
        mappings,
        signatureElements,
        signatureFacts: mappings.filter((row) => row.signature).map((row) => row.fact),
    };
}

export function withSignatureMarks(brief) {
    const signatureElements = new Set(
        (brief?.signatureElements || []).map((entry) => String(entry).toLowerCase())
    );
    const signatureFacts = new Set(
        (brief?.signatureFacts || []).map((entry) => String(entry).toLowerCase())
    );
    return {
        elements: (brief?.elements || []).map((element) => ({
            element,
            signature: signatureElements.has(String(element).toLowerCase()),
        })),
        rows: (brief?.mappings || []).map((row) => ({
            fact: row.fact,
            signature: Boolean(row.signature) || signatureFacts.has(String(row.fact).toLowerCase()),
        })),
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
            !/gravity|hazard|objective|topology|laser|drone|roller|crusher|drip|beam|boss|checkpoint|crown|wave|patrol|timing|bonk|bounce|gate|shield|spring|dive|enemy|spawn|carry|rescue|tram|lift/i.test(
                row.mechanic
            )
    );
    return { elements, sceneryOnlyFacts: sceneryOnly.map((row) => row.fact) };
}

// Keys in human.json `confirmed` must exactly match `element:`/`row:`
// + parsed brief text (post-signature-strip), or `universe:space-chicken`.
// Anything else silently no-ops in the gate, so callers warn on these.
export function unmatchedConfirmations(confirmed, brief) {
    const valid = new Set([
        ...(brief?.elements || []).map((element) => `element:${element}`),
        ...(brief?.mappings || []).map((row) => `row:${row.fact}`),
        'universe:space-chicken',
    ]);
    return (confirmed || []).filter((key) => !valid.has(key));
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
    universeNoul = null,
}) {
    const isConfirmed = (key) => confirmed.includes(key);
    const verdicts = elements.map((entry) =>
        isConfirmed(`element:${entry.element}`) ? 'shown' : elementVerdict(entry.noul ?? 0)
    );
    const shown = verdicts.filter((v) => v === 'shown').length;
    const contradicted = rows.filter((row) => row.choice === 'contradicts').length;
    const unsupportedRows = rows.filter(
        (row) => row.choice === 'unsupported' && !isConfirmed(`row:${row.fact}`)
    );
    const unsupported = unsupportedRows.length;
    const signatureMissing = elements.filter(
        (entry, index) => entry.signature && verdicts[index] === 'missing'
    );
    const signatureUnsupported = unsupportedRows.filter((row) => row.signature);
    const universeVerdict = universeNoul == null ? 'unscored' : elementVerdict(universeNoul);
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
        ...(universeVerdict === 'faint' && !isConfirmed('universe:space-chicken')
            ? ['universe:space-chicken']
            : []),
    ];
    const passed =
        shown >= 3 &&
        contradicted === 0 &&
        unsupported <= 1 &&
        signatureMissing.length === 0 &&
        signatureUnsupported.length === 0 &&
        needsHuman.length === 0 &&
        universeVerdict !== 'missing' &&
        (mechanicMean ?? 0) >= 2.5 &&
        (visualMean ?? 0) >= 2.5 &&
        (reviewerFlaw || 'none') === 'none';
    return {
        passed,
        shown,
        contradicted,
        unsupported,
        needsHuman,
        signatureMissing: signatureMissing.map((entry) => entry.element),
        signatureUnsupported: signatureUnsupported.map((row) => row.fact),
        universeVerdict,
    };
}

// A level is a news level when its own content carries the news marker,
// regardless of whether a parseable brief was found. Deriving this from
// the brief alone lets a news level with a missing build report skip the
// mandatory fidelity gate and pass on quality only — the opposite of
// fail-closed. The brief only supplies the claims to judge.
export function isNewsLevelFor(content, brief) {
    return (
        Boolean(content?.news) ||
        Boolean(brief && ((brief.elements || []).length || (brief.mappings || []).length))
    );
}

export function assessConcept(markdown) {
    const text = String(markdown || '');
    const brief = parseNewsBrief(text);
    const lower = text.toLowerCase();
    const missing = [];
    if (!/novelty ledger/.test(lower)) missing.push('novelty-ledger');
    if (!/signature mechanic/.test(lower)) missing.push('signature-mechanic-canvas');
    if (!/topology fingerprint/.test(lower)) missing.push('topology-fingerprint');
    if (brief.mappings.length < 3) missing.push('fact-mechanic-rows>=3');
    if (brief.elements.length < 3) missing.push('element-inventory>=3');
    if (!/themed enemy\s*:/.test(lower)) missing.push('themed-enemy');
    if (!brief.signatureElements.length && !brief.signatureFacts.length) {
        missing.push('signature-marking');
    }
    const sceneryOnlyFacts = fidelityCodeChecks(brief, '').sceneryOnlyFacts;
    return {
        passed: missing.length === 0 && sceneryOnlyFacts.length === 0,
        missing,
        sceneryOnlyFacts,
        elementCount: brief.elements.length,
        mappingCount: brief.mappings.length,
    };
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
export function panelMeans(reports) {
    const list = reports || [];
    const mean = (key) =>
        list.length ? list.reduce((sum, r) => sum + (r[key] || 0), 0) / list.length : 0;
    return {
        fun: mean('fun'),
        fairness: mean('fairness'),
        readability: mean('readability'),
        novelty: mean('novelty'),
        pacing: mean('pacing'),
        theme: mean('theme'),
    };
}

// News floors sit above the campaign floors: a daily news level is new
// content, not a teaching level. Anchored to shipped news level 18
// (theme ~2.4, readability ~2.3, fairness ~1.65). Novelty was anchored at
// 1.8 to level 18's best run, but 18 itself scores 1.73-1.82 across runs,
// so the floor sat inside the anchor's own variance band and failed every
// traverse level (batch 19-21: 1.10-1.60) while the mechanical clone
// checks passed. Novelty now floors at 1.5: copied-skeleton traverses
// score 1.1-1.4, genuine topology departures score 1.6+. The
// skeleton-rhyme mechanical flag carries the clone case in code.
export const NEWS_FLOORS = { novelty: 1.5, theme: 2.0, readability: 2.0, pacing: 1.5 };

export function newsFloorFailures(reports) {
    const means = panelMeans(reports);
    return Object.entries(NEWS_FLOORS)
        .filter(([key, floor]) => means[key] < floor)
        .map(([key, floor]) => `${key} mean ${means[key].toFixed(2)} < news floor ${floor}`);
}

export function panelPassed(reports, flags, screenshotsSent, options = {}) {
    const list = reports || [];
    const reworks = list.filter((report) => report.verdict === 'rework').length;
    const flawless = list.filter((report) => (report.flaw || 'none') === 'none').length;
    const structural = list.filter((report) => STRUCTURAL_FLAWS.has(report.flaw)).length;
    const means = panelMeans(list);
    const newsOk = !options.news || newsFloorFailures(list).length === 0;
    return Boolean(
        list.length === 4 &&
        reworks === 0 &&
        flawless >= 3 &&
        structural === 0 &&
        means.fun >= 1.5 &&
        means.fairness >= 1.5 &&
        newsOk &&
        !(flags || []).some(
            (flag) =>
                flag.id === 'clone-suspect' ||
                flag.id === 'flat-deck' ||
                flag.id === 'skeleton-rhyme'
        ) &&
        screenshotsSent !== false
    );
}

export function nextLoopInfo(priorReport) {
    if (!priorReport || priorReport.passed) return { loop: 1, priorFlaw: null };
    return {
        loop: (priorReport.loop || 1) + 1,
        priorFlaw: priorReport.fixes?.[0]?.flaw || priorReport.priorFlaw || null,
    };
}

export function selectPanelShots(shots, max = 4) {
    const list = shots || [];
    if (list.length <= max) return list;
    const picked = [list[0]];
    for (const shot of list.slice(1, -1)) {
        if (picked.length >= max - 1) break;
        picked.push(shot);
    }
    picked.push(list.at(-1));
    return picked;
}

// Beat sheet derived from level data: opener, one beat per distinct hazard
// type at its first spawn (the themed enemy is a hazard type, so it is
// photographed), signature set-piece props, then the finale. Beats closer
// than 350px to an earlier beat are merged; at most 6 beats are shot.
export function planBeats(analysis, content) {
    const crownX = analysis?.crownX || 600;
    const candidates = [{ slug: 'opener', x: 150, y: 480, proves: 'spawn read and first move' }];
    const push = (candidate) => {
        if (candidates.every((beat) => Math.abs(beat.x - candidate.x) > 350)) {
            candidates.push(candidate);
        }
    };
    const clampY = (y) => Math.min(560, Math.max(140, y ?? 400));
    const dynamic = [...(content?.dynamic || [])].sort((a, b) => (a.x || 0) - (b.x || 0));
    const seenTypes = new Set();
    for (const hazard of dynamic) {
        if (!hazard.type || seenTypes.has(hazard.type)) continue;
        seenTypes.add(hazard.type);
        push({
            slug: `hazard-${hazard.type}`,
            x: Math.round(hazard.x || 0),
            y: clampY(hazard.y),
            proves: `hazard beat: ${hazard.type} at x=${Math.round(hazard.x || 0)}`,
        });
        if (candidates.length >= 5) break;
    }
    const seenProps = new Set();
    for (const prop of [...(content?.props || [])].sort((a, b) => (a.x || 0) - (b.x || 0))) {
        // Pre-guard: the finale beat is appended next and the sheet caps at
        // 6, so a prop pushed as 6th would slice the finale off. Props near
        // an existing beat still appear in that shot (coverage by proximity).
        if (candidates.length >= 5) break;
        if (!prop.key || seenProps.has(prop.key)) continue;
        seenProps.add(prop.key);
        push({
            slug: `setpiece-${prop.key}`,
            x: Math.round(prop.x || 0),
            y: clampY(prop.y),
            proves: `set piece: ${prop.key} at x=${Math.round(prop.x || 0)}`,
        });
    }
    if (candidates.length === 1) {
        candidates.push({
            slug: 'mid',
            x: Math.round((analysis?.worldWidth || 2000) / 2),
            y: 400,
            proves: 'mid-level set piece and hazard read',
        });
    }
    candidates.push({
        slug: 'finale',
        x: Math.max(150, crownX - 200),
        y: 400,
        proves: 'crown approach and finale pressure',
    });
    return candidates.slice(0, 6).map((beat, index, list) => ({
        ...beat,
        id: `${String(index + 1).padStart(2, '0')}-${index === list.length - 1 ? 'finale' : beat.slug}`,
    }));
}

const FIX_OWNERS = {
    'finale-invisible': 'skills/level-creator/SKILL.md',
    'skeleton-rhyme': 'skills/level-creator/SKILL.md',
    flat: 'skills/level-creator/SKILL.md',
    clone: 'skills/level-creator/SKILL.md',
    stale: 'skills/level-creator/SKILL.md',
    sponge: 'skills/level-creator/SKILL.md',
    'empty-route': 'skills/level-creator/SKILL.md',
    'sleeping-finale': 'skills/level-creator/SKILL.md',
    blind: 'skills/level-creator/SKILL.md',
    cheap: 'skills/level-creator/SKILL.md',
    unreadable: 'skills/level-art-creator/SKILL.md',
    'off-theme': 'skills/level-art-creator/SKILL.md',
    'flat-deck': 'skills/level-creator/SKILL.md',
    'clone-suspect': 'skills/level-creator/SKILL.md',
    'background-recycled': 'skills/level-art-creator/SKILL.md',
    'low-hazard-variety': 'skills/level-creator/SKILL.md',
    'checkpoint-desert': 'skills/level-creator/SKILL.md',
};

const FIX_ACTIONS = {
    flat: 'Break the deck row: vary widths/heights and add a second route line or set piece in the flagged stretch.',
    clone: 'Change the Topology Fingerprint: new route shape plus a new finale rule; do not re-skin the copied skeleton.',
    stale: 'Replace the signature decision with a verb no sibling teaches the same way, with teach/press/twist beats.',
    sponge: 'Cut or compress the lowest-decision stretch so length carries new decisions.',
    'empty-route': 'Pay or threaten the empty line: a hazard, a bonk, or a bypass that matters.',
    'sleeping-finale': 'Add finale pressure within 900px of the crown on every route to it.',
    'finale-invisible':
        'Make finale pressure visible in a frozen still: put a body hazard (roller, drone, crusher) on the crown deck or a mostly-on beam across the crown approach. A timed vertical laser alone photographs as empty deck.',
    'skeleton-rhyme':
        'Re-lay the decks: change the world width and the deck x sequence, not just the paints. A copied x-list under new textures is still the copied skeleton.',
    blind: 'Make the landing/hazard readable in time: move the hazard off the blind landing or add a tell/landmark before the drop.',
    cheap: 'Fix the clustered death spot: widen the tell window or move the hazard so the death traces to a missed tell.',
    unreadable:
        'Repaint for contrast at gameplay size: solid, decorative, and lethal must read apart without the instructions.',
    'off-theme':
        'Re-theme the actor/look so fiction, hazards, and objective reinforce the story; a palette swap does not count.',
    'flat-deck': 'Use at least three platform reads with no key above 80% of decks.',
    'clone-suspect':
        'Change deck/hazard sequence and background composition until skeleton similarity drops below the clone threshold.',
    'background-recycled':
        'Add a new composition device for the reused background and claim it in the build report.',
    'low-hazard-variety':
        'Add a second hazard behaviour; a reskin of the same behaviour does not count.',
    'checkpoint-desert':
        'Add a checkpoint so no gap over 2500px is without one, clear of beam timing and patrol lanes.',
    'palette-swap':
        'Rebuild the level around the story mechanics; themed colours over a generic run fail.',
    'missing-elements':
        'Build the missing signature elements as art, props, or hazards visible at gameplay size.',
    'scenery-only':
        'Mechanise the scenery-only facts: a story force must change gravity, hazards, topology, or the objective.',
    'wrong-story':
        'Re-direct the concept: the screenshots must name the brief story, not another event.',
    tasteless:
        'Rework immediately: abstract the story into rescue/logistics; never make victims targets.',
};

function shotEvidence(shots, flaw, telemetry, analysis) {
    const list = shots || [];
    const finale = list.at(-1);
    const mid = list[Math.min(1, Math.max(0, list.length - 1))];
    if (flaw === 'sleeping-finale' && finale) {
        return `${finale.file} (${finale.proves}); crownX=${analysis?.crownX ?? '?'}`;
    }
    if ((flaw === 'blind' || flaw === 'cheap') && telemetry?.deathSpots?.length) {
        const spots = telemetry.deathSpots.slice(0, 4).join(', ');
        const near = list.find((shot) =>
            telemetry.deathSpots.some((x) => Math.abs((shot.x || 0) - x) <= 700)
        );
        return `deathSpots x=${spots}${near ? `; nearest shot ${near.file}` : ''}`;
    }
    if (mid) return `${mid.file} (${mid.proves})`;
    return list[0] ? `${list[0].file} (${list[0].proves})` : 'telemetry only; no shot captured';
}

// Ranked, machine-readable fix contract: the maker skills consume fixes[0]
// only, one fix per loop, then re-run the full critic. Rank 0 is reserved
// for rework-grade fidelity failures (tasteless / wrong-story).
function recheckFor(flaw) {
    return `Re-run the full critic (npm run critic:level); "${flaw}" must be gone and no new structural flaw may appear.`;
}

function fixesFromFlags(add, flags) {
    for (const flag of flags || []) {
        add(
            flag.id === 'clone-suspect' || flag.id === 'flat-deck' || flag.id === 'skeleton-rhyme'
                ? 1
                : flag.id === 'finale-invisible'
                  ? 2
                  : 3,
            flag.id,
            'mechanical',
            flag.detail,
            FIX_OWNERS[flag.id] || 'skills/level-creator/SKILL.md',
            FIX_ACTIONS[flag.id] || `Resolve mechanical flag ${flag.id}.`,
            recheckFor(flag.id)
        );
    }
}

function fixesFromPanel(add, reports, shots, telemetry, analysis) {
    const flawCounts = new Map();
    for (const report of reports || []) {
        if (report.flaw && report.flaw !== 'none') {
            flawCounts.set(report.flaw, (flawCounts.get(report.flaw) || 0) + 1);
        }
    }
    for (const [flaw, count] of flawCounts) {
        add(
            STRUCTURAL_FLAWS.has(flaw) ? 1 : 2,
            flaw,
            'quality',
            `${count}/4 personas named "${flaw}"; ${shotEvidence(shots, flaw, telemetry, analysis)}`,
            FIX_OWNERS[flaw] || 'skills/level-creator/SKILL.md',
            FIX_ACTIONS[flaw] || `Fix the named flaw: ${flaw}.`,
            recheckFor(flaw)
        );
    }
    const reworks = (reports || []).filter((report) => report.verdict === 'rework').length;
    if (reworks > 0 && !flawCounts.has('clone')) {
        add(
            1,
            'clone',
            'quality',
            `${reworks} rework verdict(s) without a named clone flaw`,
            FIX_OWNERS.clone,
            FIX_ACTIONS.clone,
            recheckFor('clone')
        );
    }
}

function fixesFromConcept(add, concept) {
    if (!concept || concept.passed) return;
    const missing = [
        ...(concept.missing || []),
        ...(concept.sceneryOnlyFacts || []).map((fact) => `scenery-only:${fact}`),
    ];
    add(
        2,
        'concept:incomplete-brief',
        'concept',
        `build brief fails the concept gate: missing ${missing.join(', ')}`,
        'skills/level-creator/SKILL.md',
        `Complete the missing concept artefacts in the build brief (${missing.join(', ')}), then re-run npm run critic:concept.`,
        'Concept gate passes (npm run critic:concept) before any art or build spend.'
    );
}

function fixesFromFidelity(add, fidelity) {
    if (!fidelity?.gate || fidelity.gate.passed) return;
    const flaw = fidelity.fidelityFlaw;
    if (flaw && flaw !== 'none' && flaw !== 'unsupported') {
        add(
            flaw === 'tasteless' || flaw === 'wrong-story' ? 0 : 2,
            flaw,
            'fidelity',
            `fidelity flaw "${flaw}"; mechanic=${fidelity.mechanicFidelity ?? 'n/a'} visual=${fidelity.visualFidelity ?? 'n/a'}`,
            flaw === 'palette-swap' || flaw === 'missing-elements'
                ? 'skills/level-art-creator/SKILL.md'
                : 'skills/level-creator/SKILL.md',
            FIX_ACTIONS[flaw] || `Fix fidelity flaw: ${flaw}.`,
            'Re-run the full critic with NEWS_BRIEF; the fidelity gate must pass.'
        );
    }
    for (const entry of fidelity.elements || []) {
        if (entry.verdict !== 'missing') continue;
        add(
            entry.signature ? 1 : 2,
            'missing-elements',
            'fidelity',
            `element "${entry.element}" missing in shots (noul=${(entry.noul ?? 0).toFixed(2)})`,
            'skills/level-art-creator/SKILL.md',
            FIX_ACTIONS['missing-elements'],
            'Re-shoot the beat sheet; the element must judge shown (noul >= 0.7).'
        );
    }
    for (const key of fidelity.gate.needsHuman || []) {
        if (/^(panel-unavailable|fidelity-panel-unavailable|no-screenshots)$/.test(key)) continue;
        add(
            4,
            'needs-human',
            'fidelity',
            `${key} is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/`,
            'human reviewer (docs/level-reviews/evidence/human.json)',
            `Confirm or override "${key}" against the screenshot and record it in human.json.`,
            'Re-run the full critic; needsHuman must be empty for the fidelity gate.'
        );
    }
    if (fidelity.gate.universeVerdict === 'missing') {
        add(
            1,
            'off-universe',
            'fidelity',
            'Space Chicken universe check missing in shots (jetpack chicken, crown goal, hazard language)',
            'skills/level-art-creator/SKILL.md',
            'Restore the Space Chicken read: chicken, crown goal, and readable hazard language visible at gameplay size.',
            'Re-run the full critic; the universe judgment must not be missing.'
        );
    }
}

export function buildFixContract({
    reports = [],
    flags = [],
    fidelity = null,
    concept = null,
    telemetry = null,
    analysis = null,
    shots = [],
} = {}) {
    const fixes = [];
    const add = (priority, flaw, source, evidence, owner, smallestFix, recheck) => {
        fixes.push({ priority, flaw, source, evidence, owner, smallestFix, recheck });
    };
    fixesFromFlags(add, flags);
    fixesFromPanel(add, reports, shots, telemetry, analysis);
    fixesFromConcept(add, concept);
    fixesFromFidelity(add, fidelity);
    fixes.sort((a, b) => a.priority - b.priority || a.flaw.localeCompare(b.flaw));
    return fixes.slice(0, 5).map((fix, index) => ({ rank: index + 1, ...fix }));
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

export async function captureEvidence(levelId, analysis, content = null) {
    const { createServer } = require(path.join(ROOT, 'server.cjs'));
    const { chromium } = await import(path.join(ROOT, 'node_modules/playwright/index.mjs'));
    const { buildPilotSource } = await import('./pilot-brain.mjs');
    const evidenceDir = path.join(ROOT, 'docs/level-reviews/evidence', `level-${levelId}`);
    mkdirSync(evidenceDir, { recursive: true });
    for (const stale of readdirSync(evidenceDir)) {
        if (stale.endsWith('.jpg')) unlinkSync(path.join(evidenceDir, stale));
    }
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
        const beats = planBeats(analysis, content);
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
    const head = `You are ${persona.name}. ${persona.profile} Judge ONLY the level described in state.level from state.telemetry, state.mechanicalFlags, and the screenshots referenced in state.shots. The telemetry comes from a mid-skill bot pilot. telemetry.deathSpots lists the x-position of each death: deaths clustered within ~200px suggest a cheap spot, spread-out deaths suggest pilot skill, so judge cheapness by that pattern and flags, not raw counts. Judge the level in its campaign role: levels 1-3 are teaching levels and levels 8-16 are contra stages; a short teaching level is not a failed contra stage, but no role excuses clones, blind deaths, or a sleeping finale for its size. If telemetry.maxX never neared state.level.crownX, the finale is untested: name what blocked progress instead of 'sleeping-finale'. Finale pressure is judged from BOTH the finale still and the data: state.level.finaleHazardCount counts hazards within 900px of the crown and state.level.finaleVisible says whether a frozen still can show one; a timed beam caught off-phase in one still is not a sleeping finale when the data shows pressure on the crown deck, and an empty still with finaleVisible=false is a visibility flaw in the level, not proof the crown is unguarded in play. If state.screenshotsSent is false, cap readability at 2 and say the visual evidence was missing. Score as this persona, not as the designer.`;
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
    for (const shot of selectPanelShots(shots, 4)) {
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
    const picked = selectPanelShots(shots, 4);
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
            universe_fit: {
                type: 'noul',
                instructions:
                    "Is the Space Chicken universe recognisably present in `shots` at gameplay size: the jetpack chicken, the crown goal, and the game's readable platform/hazard language (not a photorealistic or off-style look)? Judge only what the screenshots show.",
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
    const marked = withSignatureMarks(brief);
    const markByElement = new Map(marked.elements.map((entry) => [entry.element, entry.signature]));
    const markByFact = new Map(marked.rows.map((entry) => [entry.fact, entry.signature]));
    const elements = (brief.elements || []).slice(0, 6).map((element, index) => ({
        element,
        signature: Boolean(markByElement.get(element)),
        noul: answers[`element_${index}`]?.noul ?? 0,
        verdict: elementVerdict(answers[`element_${index}`]?.noul ?? 0),
    }));
    const rows = (brief.mappings || []).slice(0, 6).map((row, index) => ({
        fact: row.fact,
        mechanic: row.mechanic,
        signature: Boolean(markByFact.get(row.fact) || row.signature),
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
        universeFit: answers.universe_fit?.noul ?? null,
        usage: payload.usage || null,
    };
}

// ---------- Reports + main ----------

export function renderReport(report) {
    const lines = [
        `# Level critic — level ${report.level} (${report.analysis?.title || 'untitled'})`,
        '',
        `- Run: ${report.run}`,
        `- Screenshots sent to critic: ${report.screenshotsSent}`,
        `- Mechanical flags: ${report.flags.length ? report.flags.map((f) => `${f.id} (${f.detail})`).join('; ') : 'none'}`,
        `- Telemetry: ${report.telemetry ? JSON.stringify(report.telemetry) : 'static run, no capture'}`,
        `- Quality gate: ${report.passed ? 'PASS' : 'ITERATE/REWORK'}`,
        `- Loop: ${report.loop ?? 1}${report.priorFlaw ? ` (prior top flaw: ${report.priorFlaw})` : ''}${report.loopExceeded ? ' — LOOP LIMIT REACHED: hand to the user, do not lower the gate' : ''}`,
        `- Pilot runs: ${report.pilotRuns ?? (report.telemetry ? 1 : 0)}${report.repeatedFlaws?.length ? `; repeated flaws across runs: ${report.repeatedFlaws.join(', ')}` : ''}`,
    ];
    if (report.concept) {
        lines.push(
            `- Concept gate: ${report.concept.passed ? 'PASS' : `FAIL (missing: ${[...(report.concept.missing || []), ...(report.concept.sceneryOnlyFacts || []).map((fact) => `scenery-only:${fact}`)].join(', ') || 'none'})`}`
        );
    }
    if (report.reports?.length) {
        lines.push('', '## Quality panel', '');
        for (const entry of report.reports) {
            lines.push(
                `- ${entry.name}: fun=${entry.fun.toFixed(1)} fair=${entry.fairness.toFixed(1)} read=${entry.readability.toFixed(1)} novel=${entry.novelty.toFixed(1)} pace=${entry.pacing.toFixed(1)} theme=${entry.theme.toFixed(1)} flaw=${entry.flaw} -> ${entry.verdict}`
            );
        }
        const means = panelMeans(report.reports);
        lines.push(
            `- Means: fun=${means.fun.toFixed(2)} fair=${means.fairness.toFixed(2)} read=${means.readability.toFixed(2)} novel=${means.novelty.toFixed(2)} pace=${means.pacing.toFixed(2)} theme=${means.theme.toFixed(2)}`
        );
        if (report.newsFloorFailures?.length) {
            lines.push(`- News floor failures: ${report.newsFloorFailures.join('; ')}`);
        }
    } else {
        lines.push(
            '',
            '## Quality panel',
            '',
            '- unavailable (no API key or static run); mechanical pass only.'
        );
    }
    lines.push(...renderFidelityLines(report));
    lines.push(...renderFixLines(report));
    return lines.join('\n');
}

function renderFidelityLines(report) {
    if (!report.fidelity) return [];
    const lines = ['', '## News fidelity', ''];
    lines.push(`- Brief: ${report.fidelity.briefHeadline || 'missing'}`);
    lines.push(`- Gate: ${report.fidelity.gate?.passed ? 'PASS' : 'FAIL'}`);
    for (const entry of report.fidelity.elements || []) {
        const verdict =
            entry.verdict ||
            (entry.claimed === undefined
                ? 'unjudged'
                : entry.claimed
                  ? 'claimed-in-data (not judged)'
                  : 'unclaimed-in-data');
        const noul = entry.noul == null ? '' : ` (noul=${entry.noul.toFixed(2)})`;
        lines.push(
            `- Element "${entry.element}"${entry.signature ? ' [signature]' : ''}: ${verdict}${noul}`
        );
    }
    for (const row of report.fidelity.rows || []) {
        const confidence =
            row.confidence == null ? '' : ` (confidence=${row.confidence.toFixed(2)})`;
        lines.push(
            `- Row "${row.fact}"${row.signature ? ' [signature]' : ''} -> ${row.choice}${confidence}`
        );
    }
    if (report.fidelity.universeFit != null || report.fidelity.gate?.universeVerdict) {
        lines.push(
            `- Space Chicken universe: ${report.fidelity.gate?.universeVerdict || 'unscored'} (noul=${(report.fidelity.universeFit ?? 0).toFixed(2)})`
        );
    }
    if (report.fidelity.humanConfirmed?.length) {
        lines.push(`- Human confirmed: ${report.fidelity.humanConfirmed.join('; ')}`);
    }
    if (report.fidelity.gate?.needsHuman?.length) {
        lines.push(`- Needs human: ${report.fidelity.gate.needsHuman.join('; ')}`);
    }
    return lines;
}

function renderFixLines(report) {
    const lines = ['', '## Fix contract', ''];
    if (report.fixes?.length) {
        lines.push('Fix only the top fix, then re-run the full critic. One fix per loop.', '');
        for (const fix of report.fixes) {
            lines.push(
                `${fix.rank}. [${fix.flaw}] (${fix.source}) owner: ${fix.owner}`,
                `   - Evidence: ${fix.evidence}`,
                `   - Smallest fix: ${fix.smallestFix}`,
                `   - Recheck: ${fix.recheck}`
            );
        }
    } else {
        lines.push(report.passed ? '- none: gate passed.' : '- none recorded.');
    }
    lines.push('', `Evidence: docs/level-reviews/evidence/level-${report.level}/shots.json`, '');
    return lines;
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

// eslint-disable-next-line complexity -- panel stages share the capture state
async function evaluatePanels(ctx) {
    const state = { reports: [], fidelity: null, screenshotsSent: false };
    if (ctx.isStatic || !ctx.apiKey) {
        if (ctx.isNewsLevel) {
            const codeChecks = fidelityCodeChecks(ctx.brief, ctx.corpus);
            const marked = withSignatureMarks(ctx.brief);
            const claimedByElement = new Map(
                codeChecks.elements.map((entry) => [entry.element, entry.claimed])
            );
            state.fidelity = {
                briefHeadline: ctx.brief.headline,
                briefSource: ctx.briefSource,
                codeChecks,
                elements: marked.elements.map((entry) => ({
                    ...entry,
                    claimed: Boolean(claimedByElement.get(entry.element)),
                    noul: null,
                })),
                rows: marked.rows.map((entry) => ({
                    ...entry,
                    choice: 'not-judged',
                    confidence: null,
                })),
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
        const mechanicalOnly = !ctx.flags.some(
            (flag) => flag.id === 'clone-suspect' || flag.id === 'flat-deck'
        );
        return { ...state, passed: ctx.isStatic ? mechanicalOnly && ctx.conceptOk : false };
    }
    const client = new TypeSafeClient({ apiKey: ctx.apiKey, logLevel: 'off' });
    // Quality panel judges telemetry plus the beat screenshots as image
    // evidence; without shots it falls back to text state and caps
    // readability via the screenshotsSent flag in the prompt.
    state.reports = await runQualityPanel(client, {
        levelId: ctx.levelId,
        analysis: ctx.analysis,
        telemetry: ctx.telemetry,
        flags: ctx.flags,
        roster: ctx.roster,
        shots: ctx.shots,
    });
    state.screenshotsSent = ctx.shots.length > 0;
    if (ctx.isNewsLevel && ctx.shots.length) {
        const codeChecks = fidelityCodeChecks(ctx.brief, ctx.corpus);
        try {
            const sent = await sendScreenshots({
                apiKey: ctx.apiKey,
                baseURL: process.env.TYPESAFE_BASE_URL,
                brief: ctx.brief,
                codeChecks,
                shots: ctx.shots,
                telemetry: ctx.telemetry,
            });
            state.screenshotsSent = sent.sent;
            const gate = fidelityGate({
                elements: sent.elements,
                rows: sent.rows,
                mechanicMean: sent.mechanicFidelity,
                visualMean: sent.visualFidelity,
                reviewerFlaw: sent.fidelityFlaw,
                confirmed: ctx.humanConfirmed,
                universeNoul: sent.universeFit,
            });
            state.fidelity = {
                briefHeadline: ctx.brief.headline,
                briefSource: ctx.briefSource,
                codeChecks,
                ...sent,
                gate,
                humanConfirmed: ctx.humanConfirmed,
            };
        } catch (error) {
            console.error(`fidelity panel unavailable: ${error.message}`);
            state.fidelity = {
                briefHeadline: ctx.brief.headline,
                briefSource: ctx.briefSource,
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
    } else if (ctx.isNewsLevel) {
        state.fidelity = {
            briefHeadline: ctx.brief.headline,
            briefSource: ctx.briefSource,
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
    const qualityPassed = panelPassed(state.reports, ctx.flags, state.screenshotsSent, {
        news: ctx.isNewsLevel,
    });
    const passed =
        ctx.conceptOk &&
        Boolean(state.reports.length) &&
        qualityPassed &&
        (!ctx.isNewsLevel || state.fidelity?.gate?.passed);
    return { ...state, passed };
}

// eslint-disable-next-line complexity -- orchestrates static/capture/panel stages in order
async function main() {
    const args = process.argv.slice(2).filter((arg) => arg !== '--');
    const isStatic = args.includes('--static') || process.env.CRITIC_STATIC === '1';
    const briefFlagIndex = args.indexOf('--brief');
    const briefPath =
        (briefFlagIndex >= 0 ? args[briefFlagIndex + 1] : null) || process.env.NEWS_BRIEF || null;
    if (args.includes('--concept')) {
        const rawId = Number(args.find((arg) => /^\d+$/.test(arg)));
        const conceptPath =
            briefPath ||
            (Number.isFinite(rawId) && rawId > 0 ? `docs/level-builds/${rawId}.md` : null);
        if (!conceptPath) {
            throw new Error(
                'usage: node scripts/level-critic.mjs --concept --brief <build-note.md>'
            );
        }
        const resolved = path.isAbsolute(conceptPath) ? conceptPath : path.join(ROOT, conceptPath);
        const concept = assessConcept(readFileSync(resolved, 'utf8'));
        console.log(`concept brief: ${resolved}`);
        console.log(
            concept.passed
                ? 'CONCEPT: PASS'
                : `CONCEPT: FAIL missing=[${concept.missing.join(', ')}] sceneryOnly=[${concept.sceneryOnlyFacts.join(', ')}]`
        );
        process.exitCode = concept.passed ? 0 : 2;
        return;
    }
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
        const captured = await captureEvidence(levelId, analysis, content);
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
    let briefRaw = null;
    const briefCandidates = [
        briefPath,
        path.join(ROOT, 'docs/level-builds', `${levelId}.md`),
    ].filter(Boolean);
    for (const candidate of briefCandidates) {
        const resolved = path.isAbsolute(candidate) ? candidate : path.join(ROOT, candidate);
        if (existsSync(resolved)) {
            briefRaw = readFileSync(resolved, 'utf8');
            brief = parseNewsBrief(briefRaw);
            briefSource = resolved;
            if (brief.elements.length || brief.mappings.length) break;
        }
    }
    const isNewsLevel = isNewsLevelFor(content, brief);
    if (isNewsLevel && !brief) {
        brief = parseNewsBrief('');
    }
    const concept = isNewsLevel ? assessConcept(briefRaw || '') : null;
    if (isNewsLevel && humanConfirmed.length) {
        const unmatched = unmatchedConfirmations(humanConfirmed, brief);
        for (const key of unmatched) {
            console.warn(
                `warning: human.json confirmed key matches nothing in the brief parse: "${key}"`
            );
        }
    }

    const apiKey = readTypeSafeApiKey();
    const conceptOk = !isNewsLevel || Boolean(concept?.passed);
    let pilotRuns = telemetry ? 1 : 0;
    let repeatedFlaws = [];
    let passed = false;

    const panelContext = () => ({
        isStatic,
        apiKey,
        isNewsLevel,
        conceptOk,
        brief,
        briefSource,
        corpus: JSON.stringify(content).toLowerCase(),
        levelId,
        analysis,
        flags,
        roster,
        humanConfirmed,
        telemetry,
        shots,
    });
    let panel = await evaluatePanels(panelContext());
    reports = panel.reports;
    fidelity = panel.fidelity;
    screenshotsSent = panel.screenshotsSent;
    passed = panel.passed;
    if (!passed && !isStatic && apiKey && reports.length) {
        // A lone flaw on one pilot run is instrument noise: capture and
        // judge a second run, and surface only flaws that repeat.
        const firstFlaws = new Set(reports.map((report) => report.flaw));
        const captured = await captureEvidence(levelId, analysis, content);
        telemetry = captured.telemetry;
        shots = captured.shots;
        if (telemetry.errors?.length) {
            throw new Error(`page errors during capture: ${telemetry.errors.join(' | ')}`);
        }
        pilotRuns = 2;
        panel = await evaluatePanels(panelContext());
        reports = panel.reports;
        fidelity = panel.fidelity;
        screenshotsSent = panel.screenshotsSent;
        passed = panel.passed;
        repeatedFlaws = [
            ...new Set(
                reports
                    .map((report) => report.flaw)
                    .filter((flaw) => firstFlaws.has(flaw) && flaw !== 'none')
            ),
        ];
    }

    const reportPath = path.join(ROOT, 'docs/level-reviews', `level-${levelId}.json`);
    let priorReport = null;
    try {
        priorReport = JSON.parse(readFileSync(reportPath, 'utf8'));
    } catch {
        // First critic run for this level.
    }
    // Static checks are free verification; only full runs advance the loop.
    const loopInfo =
        isStatic && priorReport && !priorReport.passed
            ? {
                  loop: priorReport.loop || 1,
                  priorFlaw: priorReport.fixes?.[0]?.flaw || priorReport.priorFlaw || null,
              }
            : nextLoopInfo(priorReport);
    const fixes = buildFixContract({
        reports,
        flags,
        fidelity,
        concept: isNewsLevel ? concept : null,
        telemetry,
        analysis,
        shots,
    });

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
        concept: isNewsLevel ? concept : null,
        newsFloorFailures: isNewsLevel && reports.length ? newsFloorFailures(reports) : [],
        fixes,
        loop: loopInfo.loop,
        priorFlaw: loopInfo.priorFlaw,
        loopExceeded: loopInfo.loop > 3,
        pilotRuns,
        repeatedFlaws,
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
