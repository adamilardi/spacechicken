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
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { openAsBlob } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
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
                kind: 'clone',
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
            kind: 'clone',
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
                kind: 'finale',
                detail: 'no hazard within 900px before the crown and no crown gate',
            },
        ];
    }
    if (analysis.finaleVisible === false) {
        return [
            {
                id: 'finale-invisible',
                kind: 'finale',
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
            kind: 'visual-variety',
            detail: `${analysis.platformKeys.length} deck key(s), dominant share ${analysis.dominantKeyShare.toFixed(2)} across ${analysis.platformCount} decks (visual-variety heuristic: a justified art-direction exception in the build report rebuts it; it never proves repetitive play on its own)`,
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
            kind: 'visual-variety',
            detail: `background type '${analysis.backgroundType}' already used by levels ${sameBackground.map(([id]) => id).join(', ')}; build report must claim a new composition device`,
        });
    }
    if (analysis.worldWidth > 3000 && analysis.hazardTypes.length < 2) {
        flags.push({
            id: 'low-hazard-variety',
            kind: 'gameplay',
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
                    kind: 'route',
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
    if (!/boss theme\s*:/.test(lower)) missing.push('boss-theme-decision');
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

// Rubric version bound to every report. Bump when the gate, the flaw enum,
// or the fix-contract shape changes; stored PASSes from older rubrics need
// a consistency check before they certify a later revision.
export const RUBRIC_VERSION = '2026-11-01-evidence-validity';

// Panel outcomes that prove a full traversal. Gate-open (boss shield down)
// and reached-crown-area do not verify the crown approach, and a timeout
// never certifies the unplayed stretch.
export function isCompletedCrownRoute(outcome) {
    return outcome === 'crown-collected';
}

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
            (flag) => flag.id === 'clone-suspect' || flag.id === 'skeleton-rhyme'
        ) &&
        screenshotsSent === true
    );
}

export function nextLoopInfo(priorReport) {
    if (!priorReport || priorReport.passed) return { loop: 1, priorFlaw: null };
    return {
        loop: (priorReport.loop || 1) + 1,
        priorFlaw: priorReport.fixes?.[0]?.flaw || priorReport.priorFlaw || null,
    };
}

// The three-iteration rule tracks design revisions, not calibration reruns.
// A rerun against an unchanged level (phase-varied repeat, panel reroll)
// keeps the loop and bumps calibrationRuns; only a changed level advances
// the loop. nextLoopInfo stays for static-run callers.
export function nextRevisionLoop(priorReport, { designChanged = false } = {}) {
    if (!priorReport || (priorReport.passed && !priorReport.stalePass)) {
        return { loop: 1, priorFlaw: null, calibrationRuns: 0 };
    }
    if (priorReport.stalePass) {
        return {
            loop: priorReport.loop || 1,
            priorFlaw: priorReport.fixes?.[0]?.flaw || 'stale-pass',
            calibrationRuns: 0,
            stalePass: true,
        };
    }
    if (!designChanged) {
        return {
            loop: priorReport.loop || 1,
            priorFlaw: priorReport.fixes?.[0]?.flaw || priorReport.priorFlaw || null,
            calibrationRuns: (priorReport.calibrationRuns || 0) + 1,
        };
    }
    return {
        loop: (priorReport.loop || 1) + 1,
        priorFlaw: priorReport.fixes?.[0]?.flaw || priorReport.priorFlaw || null,
        calibrationRuns: 0,
    };
}

// Short stable hash of the level geometry the critic judged. Compared
// against the prior report to tell a design revision (loop advances) from
// a calibration rerun (loop holds).
export function analysisHash(analysis) {
    const basis = {
        worldWidth: analysis?.worldWidth ?? 0,
        crownX: analysis?.crownX ?? 0,
        gravity: analysis?.gravity ?? null,
        backgroundType: analysis?.backgroundType ?? null,
        platformKeys: [...(analysis?.platformKeys || [])].sort(),
        platformCount: analysis?.platformCount ?? 0,
        hazardTypes: [...(analysis?.hazardTypes || [])].sort(),
        hazardCount: analysis?.hazardCount ?? 0,
        deckLayout: analysis?.deckLayout || [],
    };
    return createHash('sha256').update(JSON.stringify(basis)).digest('hex').slice(0, 12);
}

export function sha256FileSync(filePath) {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

// Revision of a script file bound into the report, so a stored PASS names
// the pilot and critic code that produced it.
export function revisionHashOfFile(filePath) {
    try {
        return sha256FileSync(filePath).slice(0, 12);
    } catch {
        return 'unrecorded';
    }
}

// Provenance bound to every report: which level revision, pilot, critic,
// rubric, and model produced it, which runs it covers, and what capture
// configuration ran. A stored PASS is only meaningful with this block.
export function buildProvenance({
    levelId = null,
    analysis = null,
    runIds = [],
    captureConfig = {},
    model = 'jev-latest',
} = {}) {
    return {
        level: levelId,
        analysisHash: analysis ? analysisHash(analysis) : null,
        pilotRevision: revisionHashOfFile(path.join(ROOT, 'scripts/pilot-brain.mjs')),
        criticRevision: revisionHashOfFile(path.join(ROOT, 'scripts/level-critic.mjs')),
        rubricVersion: RUBRIC_VERSION,
        model,
        runIds: [...runIds],
        captureConfig: {
            viewport: { width: 1280, height: 720 },
            pollMs: 150,
            ...captureConfig,
        },
        capturedAt: new Date().toISOString(),
    };
}

// A stored PASS is inconsistent when its human-confirmed claims rest on
// agent evidence: confirmationReview rejects agent confirmations, so a
// report that counted them as human proof must be revalidated, not
// relabelled. Returns { consistent, issues }.
export function validateStoredPass(report, humanRaw) {
    const issues = [];
    if (!report?.passed) return { consistent: true, issues };
    const claimed = report.fidelity?.humanConfirmed || [];
    if (claimed.length) {
        const review = confirmationReview(humanRaw);
        if (review.reviewerType !== 'human') {
            issues.push(
                `stored PASS claims ${claimed.length} human confirmation(s) but evidence human.json has reviewerType "${review.reviewerType || 'missing'}": treat as inconsistent/stale and revalidate`
            );
        }
        const unmatched = unmatchedConfirmations(review.confirmed, {
            elements: (report.fidelity?.elements || []).map((entry) => entry.element),
            mappings: (report.fidelity?.rows || []).map((row) => ({ fact: row.fact })),
        });
        for (const key of unmatched) {
            issues.push(`stored PASS confirmation matches no current claim: "${key}"`);
        }
    }
    if ((report.loop || 1) > 3 && !report.handoff) {
        issues.push(
            `stored PASS at loop ${report.loop} has no handoff record explaining the stop-rule history`
        );
    }
    if (!isCompletedCrownRoute(report.telemetry?.outcome)) {
        issues.push(
            `stored PASS has no completed crown route (outcome: ${report.telemetry?.outcome || 'none'}): route coverage is partial`
        );
    }
    return { consistent: issues.length === 0, issues };
}

// ---------- Runs: judge the distribution, never the best run ----------

// Immutable append: a second pass must never erase a first failure. Runs
// carry runId, outcome, telemetry summary, shots, and flaw votes.
export function appendRun(runs, run) {
    return [...(runs || []), { ...(run || {}) }];
}

// Flaws named in at least two distinct runs (any persona). A hotspot is
// only unfair after it repeats across fresh starts/phases.
export function repeatedFlawsAcrossRuns(runs) {
    const seenIn = new Map();
    for (const run of runs || []) {
        const flaws = new Set(
            (run?.flaws || run?.reports?.map((report) => report.flaw) || []).filter(
                (flaw) => flaw && flaw !== 'none'
            )
        );
        for (const flaw of flaws) {
            seenIn.set(flaw, (seenIn.get(flaw) || 0) + 1);
        }
    }
    return [...seenIn.entries()].filter(([, count]) => count >= 2).map(([flaw]) => flaw);
}

// ---------- Death clusters: judge the hotspot, not the first death ----------

// Largest cluster of death x-positions within `radius` of each other.
// Ties break toward the most recent cluster in array order. A lone death
// is not a cluster: single deaths return count 1 and never corroborate.
export function dominantDeathCluster(deathSpots, radius = 200) {
    const spots = (deathSpots || []).filter((x) => Number.isFinite(x));
    if (!spots.length) return null;
    const indexed = spots.map((x, index) => ({ x, index })).sort((a, b) => a.x - b.x);
    const clusters = [];
    for (const spot of indexed) {
        const current = clusters.at(-1);
        if (current && spot.x - current.spots[0].x <= radius) {
            current.spots.push(spot);
        } else {
            clusters.push({ spots: [spot] });
        }
    }
    let best = clusters[0];
    for (const cluster of clusters) {
        if (cluster.spots.length > best.spots.length) best = cluster;
        else if (cluster.spots.length === best.spots.length) {
            const clusterLast = Math.max(...cluster.spots.map((spot) => spot.index));
            const bestLast = Math.max(...best.spots.map((spot) => spot.index));
            if (clusterLast > bestLast) best = cluster;
        }
    }
    const xs = best.spots.map((spot) => spot.x);
    return {
        center: Math.round(xs.reduce((sum, x) => sum + x, 0) / xs.length),
        count: xs.length,
        spots: xs,
    };
}

// Mechanical flags that corroborate a panel flaw vote. A clone vote with
// no clone-similarity flag, or a flat vote with no deck evidence, is an
// uncorroborated claim routed to investigation, not a level edit.
export const FLAW_SUPPORTING_FLAGS = {
    clone: ['clone-suspect', 'skeleton-rhyme'],
    flat: ['flat-deck'],
    stale: ['clone-suspect', 'skeleton-rhyme', 'background-recycled'],
    'sleeping-finale': ['sleeping-finale', 'finale-invisible'],
    'empty-route': ['checkpoint-desert'],
    'off-theme': ['background-recycled'],
    unreadable: ['flat-deck'],
};

export function isCorroboratedFlaw(
    flaw,
    { voteCount = 0, repeatedFlaws = [], telemetry = null, flags = [] } = {}
) {
    if ((voteCount || 0) >= 2) return true;
    if ((repeatedFlaws || []).includes(flaw)) return true;
    if (flaw === 'blind' || flaw === 'cheap') {
        const cluster = dominantDeathCluster(telemetry?.deathSpots);
        if (cluster && cluster.count >= 2) return true;
    }
    const supporting = FLAW_SUPPORTING_FLAGS[flaw] || [];
    const flagIds = new Set((flags || []).map((flag) => flag.id));
    return supporting.some((id) => flagIds.has(id));
}

// Attribution for a failed capture: separate a bot-policy defect (spread
// deaths, stalls no hazard explains), a capture defect (errors, no
// evidence), and a reproducible design problem (a repeated cluster).
// Anything else is insufficient evidence, named as such.
export function attributeFailure({ telemetry = null, repeated = false } = {}) {
    if (!telemetry || (telemetry.errors || []).length) {
        return {
            attribution: 'capture-defect',
            reason: 'no usable telemetry or page errors during capture; fix capture before judging the level',
        };
    }
    const cluster = dominantDeathCluster(telemetry.deathSpots);
    if (cluster && cluster.count >= 2) {
        return repeated
            ? {
                  attribution: 'suspected-design-problem',
                  reason: `${cluster.count} deaths cluster near x=${cluster.center}; repeats across runs`,
              }
            : {
                  attribution: 'insufficient-evidence',
                  reason: `${cluster.count} deaths cluster near x=${cluster.center} but the hotspot has not repeated across fresh starts/phases yet`,
              };
    }
    if ((telemetry.deaths || 0) > 0) {
        return {
            attribution: 'bot-policy-defect',
            reason: 'deaths are spread with no hotspot; pilot skill or policy, not a proven level defect',
        };
    }
    if (telemetry.outcome === 'timeout') {
        return {
            attribution: 'insufficient-evidence',
            reason: `timeout at x=${telemetry.maxX || 0} with no deaths; stall needs input history and phase-varied repeats before it names a design flaw`,
        };
    }
    return { attribution: 'insufficient-evidence', reason: 'no failure to attribute' };
}

// ---------- Evidence batching: judge everything, in capped requests ----------

// Split the full beat sheet into request-sized batches (at most `max`
// shots each) that together cover every beat. Panels must batch, never
// silently drop beats past the cap.
export function batchPanelShots(shots, max = 4) {
    if (!(max > 0)) {
        throw new Error(`batchPanelShots needs a positive batch size, got ${max}`);
    }
    const list = shots || [];
    const batches = [];
    for (let i = 0; i < list.length; i += max) {
        batches.push(list.slice(i, i + max));
    }
    return batches;
}

// Split an element inventory or fact→mechanic table into request-sized
// chunks (at most `size` each) that together cover every entry.
export function batchInventory(items, size = 6) {
    if (!(size > 0)) {
        throw new Error(`batchInventory needs a positive batch size, got ${size}`);
    }
    const list = items || [];
    const batches = [];
    for (let i = 0; i < list.length; i += size) {
        batches.push(list.slice(i, i + size));
    }
    return batches;
}

// Merge fidelity judgments across evidence batches. Visibility is
// existential: an element shown in any batch is shown. Row verdicts take
// the strongest claim (contradicts beats supports beats unsupported);
// scalar fidelities average across batches. evidenceSeen records exactly
// which shots every judgment saw.
export function mergeFidelityBatches(batches) {
    const list = batches || [];
    const byElement = new Map();
    for (const batch of list) {
        for (const entry of batch?.elements || []) {
            const prior = byElement.get(entry.element);
            if (!prior || (entry.noul ?? 0) > (prior.noul ?? 0)) {
                byElement.set(entry.element, { ...entry });
            }
        }
    }
    const elements = [...byElement.values()].map((entry) => ({
        ...entry,
        verdict: elementVerdict(entry.noul ?? 0),
    }));
    const rowRank = { contradicts: 3, supports: 2, unsupported: 1 };
    const byFact = new Map();
    for (const batch of list) {
        for (const row of batch?.rows || []) {
            const prior = byFact.get(row.fact);
            const rank = rowRank[row.choice] || 0;
            const priorRank = rowRank[prior?.choice] || 0;
            if (
                !prior ||
                rank > priorRank ||
                (rank === priorRank && (row.confidence ?? 0) > (prior.confidence ?? 0))
            ) {
                byFact.set(row.fact, { ...row });
            }
        }
    }
    const mean = (key) =>
        list.length ? list.reduce((sum, batch) => sum + (batch?.[key] ?? 0), 0) / list.length : 0;
    const flawRank = [
        'tasteless',
        'wrong-story',
        'scenery-only',
        'missing-elements',
        'palette-swap',
        'none',
        'unsupported',
    ];
    let fidelityFlaw = 'unsupported';
    for (const batch of list) {
        const candidate = batch?.fidelityFlaw || 'unsupported';
        if (flawRank.indexOf(candidate) < flawRank.indexOf(fidelityFlaw)) {
            fidelityFlaw = candidate;
        }
    }
    const universeFit = list.length
        ? Math.max(...list.map((batch) => batch?.universeFit ?? 0))
        : null;
    const evidenceSeen = [...new Set(list.flatMap((batch) => batch?.shotIds || []))];
    return {
        elements,
        rows: [...byFact.values()],
        mechanicFidelity: mean('mechanicFidelity'),
        visualFidelity: mean('visualFidelity'),
        fidelityFlaw,
        universeFit,
        evidenceSeen,
    };
}

// Merge one persona's judgments across shot batches: scores average, the
// flaw is the most frequent non-none vote (structural flaws win ties),
// the verdict is the worst across batches. evidenceSeen names the shots.
export function mergePersonaBatches(personaReports) {
    const list = personaReports || [];
    if (!list.length) return null;
    const mean = (key) => list.reduce((sum, report) => sum + (report[key] || 0), 0) / list.length;
    const votes = new Map();
    for (const report of list) {
        const flaw = report.flaw || 'none';
        if (flaw !== 'none') votes.set(flaw, (votes.get(flaw) || 0) + 1);
    }
    let flaw = 'none';
    let best = 0;
    for (const [candidate, count] of votes) {
        if (
            count > best ||
            (count === best && STRUCTURAL_FLAWS.has(candidate) && !STRUCTURAL_FLAWS.has(flaw))
        ) {
            flaw = candidate;
            best = count;
        }
    }
    const verdictRank = { rework: 3, iterate: 2, ship: 1 };
    let verdict = 'ship';
    for (const report of list) {
        if ((verdictRank[report.verdict] || 0) > (verdictRank[verdict] || 0)) {
            verdict = report.verdict;
        }
    }
    return {
        persona: list[0].persona,
        name: list[0].name,
        fun: mean('fun'),
        fairness: mean('fairness'),
        readability: mean('readability'),
        novelty: mean('novelty'),
        pacing: mean('pacing'),
        theme: mean('theme'),
        flaw,
        verdict,
        evidenceSeen: [...new Set(list.flatMap((report) => report.shotIds || []))],
    };
}

// ---------- Evidence-validity stage ----------

// Separate statuses for capture validity, completion/route coverage,
// mechanical checks, quality, fidelity, and overall release eligibility.
// `Run: full` means the pipeline ran; only routeCoverage complete means a
// full traversal happened. Unplayed branches/tiers stay unverified.
export function assessCaptureValidity({ telemetry = null, analysis = null } = {}) {
    if (!telemetry || (telemetry.errors || []).length) {
        return {
            status: 'invalid',
            detail: 'no usable capture; telemetry missing or page errors during the run',
        };
    }
    if (isCompletedCrownRoute(telemetry.outcome)) {
        return { status: 'valid', detail: `full traversal to the crown (${telemetry.outcome})` };
    }
    return {
        status: 'partial',
        detail: `${telemetry.outcome} at x=${telemetry.maxX || 0} of crown x=${analysis?.crownX ?? '?'}: local findings stand, whole-level verdicts do not`,
    };
}

export function assessRouteCoverage({ telemetry = null, analysis = null } = {}) {
    const visitedBranches = telemetry?.routeBranches || [];
    const visitedTiers = telemetry?.tiersVisited || [];
    if (isCompletedCrownRoute(telemetry?.outcome)) {
        return {
            status: 'complete',
            detail: `crown collected; branches visited: ${visitedBranches.join(', ') || 'unrecorded'}; tiers visited: ${visitedTiers.join(', ') || 'unrecorded'}`,
            visitedBranches,
            visitedTiers,
            unverified: [],
        };
    }
    return {
        status: 'partial',
        detail: `no completed crown route (outcome: ${telemetry?.outcome || 'none'}); sections past x=${telemetry?.maxX || 0} are unverified`,
        visitedBranches,
        visitedTiers,
        unverified: [`x>${telemetry?.maxX || 0} to crown x=${analysis?.crownX ?? '?'}`],
    };
}

export function assessMechanicalStatus({ flags = [] } = {}) {
    const blocking = flags.filter(
        (flag) => flag.id === 'clone-suspect' || flag.id === 'skeleton-rhyme'
    );
    if (blocking.length) {
        return {
            status: 'blocked',
            detail: `blocking flags: ${blocking.map((flag) => flag.id).join(', ')}`,
        };
    }
    if (flags.length) {
        return {
            status: 'flags-raised',
            detail: `non-blocking flags: ${flags.map((flag) => flag.id).join(', ')}`,
        };
    }
    return { status: 'clear', detail: 'no mechanical flags' };
}

export function assessQualityStatus(
    { reports = [], flags = [], screenshotsSent = false } = {},
    { news = false } = {}
) {
    if (!reports.length || screenshotsSent === false) {
        return { status: 'unjudged', detail: 'quality panel did not run or saw no shots' };
    }
    if (panelPassed(reports, flags, screenshotsSent, { news })) {
        return { status: 'pass', detail: 'quality panel passed' };
    }
    return { status: 'fail', detail: 'quality panel did not pass' };
}

export function assessFidelityStatus({ fidelity = null, isNewsLevel = false } = {}) {
    if (!isNewsLevel) {
        return { status: 'not-applicable', detail: 'campaign level; no fidelity gate' };
    }
    if (!fidelity) return { status: 'unjudged', detail: 'fidelity panel did not run' };
    if (fidelity.gate?.passed) return { status: 'pass', detail: 'fidelity gate passed' };
    return { status: 'fail', detail: 'fidelity gate did not pass' };
}

export function assessEvidenceValidity({
    telemetry = null,
    runs = [],
    analysis = null,
    flags = [],
    reports = [],
    fidelity = null,
    screenshotsSent = false,
    concept = null,
    isNewsLevel = false,
} = {}) {
    const captureValidity = assessCaptureValidity({ telemetry, analysis });
    const routeCoverage = assessRouteCoverage({ telemetry, analysis });
    const mechanical = assessMechanicalStatus({ flags });
    const quality = assessQualityStatus({ reports, flags, screenshotsSent }, { news: isNewsLevel });
    const fidelityStatus = assessFidelityStatus({ fidelity, isNewsLevel });
    const blockers = [];
    if (captureValidity.status === 'invalid') blockers.push('capture invalid');
    if (routeCoverage.status !== 'complete') {
        blockers.push(`no completed crown route (${telemetry?.outcome || 'none'})`);
    }
    if (mechanical.status === 'blocked') blockers.push(mechanical.detail);
    if (quality.status !== 'pass') blockers.push(`quality ${quality.status}`);
    if (fidelityStatus.status !== 'pass' && fidelityStatus.status !== 'not-applicable') {
        blockers.push(`fidelity ${fidelityStatus.status}`);
    }
    if (isNewsLevel && concept && !concept.passed) blockers.push('concept gate failed');
    if ((runs || []).length < 1 && telemetry) blockers.push('no retained runs');
    return {
        captureValidity,
        routeCoverage,
        mechanical,
        quality,
        fidelity: fidelityStatus,
        releaseEligibility: {
            eligible: blockers.length === 0,
            blockers,
        },
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

// Beat sheet derived from level data: opener, signature beats before
// generic ones (themed/keyed hazards and bonk verbs, then other hazard
// types), signature set-piece props, then the finale. Presence stills
// cannot prove synchrony, rides, or bonk-dependent reachability — those
// need the motion/telemetry evidence the QA skill requires — but the
// sheet must at least spend its slots on the beats the brief advertises.
// Beats closer than 350px to an earlier beat are merged; at most 6 shot.
export function planBeats(analysis, content) {
    const crownX = analysis?.crownX || 600;
    const candidates = [{ slug: 'opener', x: 150, y: 480, proves: 'spawn read and first move' }];
    const push = (candidate) => {
        if (candidates.every((beat) => Math.abs(beat.x - candidate.x) > 350)) {
            candidates.push(candidate);
        }
    };
    const clampY = (y) => Math.min(560, Math.max(140, y ?? 400));
    const byX = (a, b) => (a.x || 0) - (b.x || 0);
    const sorted = [...(content?.dynamic || [])].sort(byX);
    const isSignature = (hazard) => Boolean(hazard.key || hazard.enemy || hazard.type === 'bonk');
    const dynamic = [...sorted.filter(isSignature), ...sorted.filter((h) => !isSignature(h))];
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
    candidates.sort((a, b) => a.x - b.x);
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
    flat: 'Diagnose repetitive play from route evidence (connectivity, height changes, encounter choices, waiting time, repeated decisions), not paint: add a route decision or set piece to the flagged stretch, and only repaint if the build report cannot justify the look as art direction.',
    clone: 'Change the Topology Fingerprint: new route shape plus a new finale rule; do not re-skin the copied skeleton.',
    stale: 'Replace the signature decision with a verb no sibling teaches the same way, with teach/press/twist beats.',
    sponge: 'Cut or compress the lowest-decision stretch so length carries new decisions.',
    'empty-route': 'Pay or threaten the empty line: a hazard, a bonk, or a bypass that matters.',
    'sleeping-finale': 'Add finale pressure within 900px of the crown on every route to it.',
    'finale-invisible':
        'Re-shoot the finale across timing phases first: if telemetry shows real pressure on the crown deck, fix visibility (a body hazard or mostly-on beam the still can show); never add hazards merely to satisfy a frozen still.',
    'skeleton-rhyme':
        'Re-lay the decks: change the world width and the deck x sequence, not just the paints. A copied x-list under new textures is still the copied skeleton.',
    blind: 'Make the landing/hazard readable in time: move the hazard off the blind landing or add a tell/landmark before the drop.',
    cheap: 'Fix the clustered death spot: widen the tell window or move the hazard so the death traces to a missed tell.',
    unreadable:
        'Repaint for contrast at gameplay size: solid, decorative, and lethal must read apart without the instructions.',
    'off-theme':
        'Re-theme the actor/look so fiction, hazards, and objective reinforce the story; a palette swap does not count.',
    'flat-deck':
        'Visual-variety heuristic, not a quality proof: either justify the single-key look as art direction in the build report, or use at least three platform reads with no key above 80% of decks.',
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
        // Cite the dominant death cluster, not the first death: the fix
        // belongs at the hotspot that killed repeatedly.
        const cluster = dominantDeathCluster(telemetry.deathSpots);
        const near = cluster
            ? list.find((shot) => Math.abs((shot.x || 0) - cluster.center) <= 700)
            : null;
        const gameplay = near?.capture === 'gameplay' ? ' (gameplay frame)' : ' (staged still)';
        return cluster && cluster.count >= 2
            ? `${cluster.count} deaths cluster near x=${cluster.center} (spots x=${cluster.spots.join(', ')})${near ? `; nearest shot ${near.file}${gameplay}` : ''}`
            : `lone death at x=${telemetry.deathSpots[0]} (no cluster; uncorroborated)${near ? `; nearest shot ${near.file}${gameplay}` : ''}`;
    }
    if (mid) return `${mid.file} (${mid.proves})`;
    return list[0] ? `${list[0].file} (${list[0].proves})` : 'telemetry only; no shot captured';
}

// Rechecks measure behavior, not model labels: each recheck names the
// observable before/after the next run must show.
function recheckFor(flaw, ctx = {}) {
    const cluster = ctx.cluster || dominantDeathCluster(ctx.telemetry?.deathSpots);
    if ((flaw === 'blind' || flaw === 'cheap') && cluster && cluster.count >= 2) {
        return `Re-run the full critic twice from fresh starts: deaths near x=${cluster.center} must not recur as a cluster and maxX must pass x=${cluster.center} on both runs.`;
    }
    if (flaw === 'sleeping-finale' || flaw === 'finale-invisible') {
        return `Re-run the full critic: the finale still must show pressure and telemetry must confirm a hazard within 900px of the crown on the taken route.`;
    }
    if (flaw === 'clone' || flaw === 'clone-suspect' || flaw === 'skeleton-rhyme') {
        return `Re-run the full critic: the clone-similarity flag must clear and no persona may name clone from the new route/mechanic evidence.`;
    }
    if (flaw === 'flat' || flaw === 'flat-deck') {
        return `Re-run the full critic: route evidence (not paint) must show a new decision in the flagged stretch, or the build report must carry the art-direction exception.`;
    }
    return `Re-run the full critic (npm run critic:level); "${flaw}" must be gone from telemetry and shots, and no new structural flaw may appear.`;
}

// Evidence-linked diagnosis for one finding: observed behavior, location,
// evidence id, confidence and limitations, a plausible alternative cause,
// the smallest change, and a measurable acceptance. When the fields are
// unavailable the finding becomes an investigation, never a level edit.
export function diagnoseFinding({
    flaw,
    source = 'quality',
    voteCount = 0,
    telemetry = null,
    analysis = null,
    shots = [],
    flags = [],
    repeatedFlaws = [],
    evidence = '',
} = {}) {
    const cluster = dominantDeathCluster(telemetry?.deathSpots);
    const corroborated = isCorroboratedFlaw(flaw, { voteCount, repeatedFlaws, telemetry, flags });
    const attribution = attributeFailure({
        telemetry,
        repeated: (repeatedFlaws || []).includes(flaw),
    });
    const nearestShot =
        cluster && cluster.count >= 2
            ? (shots || []).find((shot) => Math.abs((shot.x || 0) - cluster.center) <= 700)
            : null;
    const location =
        cluster && cluster.count >= 2
            ? `x=${cluster.center} (${cluster.count}-death cluster)`
            : telemetry?.outcome === 'timeout'
              ? `stall near x=${telemetry.maxX || 0} (outcome: timeout)`
              : `crown x=${analysis?.crownX ?? '?'}`;
    const alternativeCause =
        attribution.attribution === 'suspected-design-problem'
            ? 'Pilot mistiming on one phase; confirm by repeating across fresh starts/phases.'
            : attribution.attribution === 'bot-policy-defect'
              ? 'Pilot skill or policy failure; a human play observation or a policy fix, not a level edit.'
              : attribution.attribution === 'capture-defect'
                ? 'Capture or infrastructure failure; no level conclusion is supported.'
                : 'Unrepeated hotspot or single-run noise; needs a phase-varied repeat.';
    return {
        observedBehavior:
            evidence ||
            `${voteCount || 0}/4 personas named "${flaw}" (${source}); telemetry outcome ${telemetry?.outcome || 'none'}, deaths ${telemetry?.deaths ?? 0}, maxX ${telemetry?.maxX ?? 0}.`,
        location,
        evidenceId: nearestShot ? nearestShot.file : (shots || [])[0]?.file || 'telemetry-only',
        confidence: corroborated ? 'medium' : 'low',
        limitations: corroborated
            ? 'Single-route bot capture; unplayed branches/tiers stay unverified.'
            : `Uncorroborated: ${attribution.reason}. Four personas judging one summary are four model perspectives, not four playtests.`,
        alternativeCause,
        smallestFix: corroborated
            ? FIX_ACTIONS[flaw] || `Fix the named flaw: ${flaw}.`
            : `Investigate before editing: re-run the capture across fresh starts/phases, record the input trace and the encounter at ${location}, and only propose a level edit if the flaw repeats.`,
        acceptance: recheckFor(flaw, { telemetry, cluster }),
        corroborated,
        attribution: attribution.attribution,
    };
}

function fixesFromFlags(add, flags, ctx = {}) {
    for (const flag of flags || []) {
        const visualHeuristic = flag.kind === 'visual-variety';
        add(
            flag.id === 'clone-suspect' || flag.id === 'skeleton-rhyme'
                ? 1
                : flag.id === 'finale-invisible'
                  ? 2
                  : visualHeuristic
                    ? 3
                    : 3,
            flag.id,
            'mechanical',
            flag.detail,
            FIX_OWNERS[flag.id] || 'skills/level-creator/SKILL.md',
            FIX_ACTIONS[flag.id] || `Resolve mechanical flag ${flag.id}.`,
            recheckFor(flag.id, ctx),
            {
                confidence: visualHeuristic ? 'low' : 'high',
                limitations: visualHeuristic
                    ? 'Texture counts diagnose paint, never play; a justified art-direction exception rebuts this flag.'
                    : 'Code-measured from level data; the panel must confirm or rebut from the numbers.',
            }
        );
    }
}

function fixesFromPanel(add, reports, shots, telemetry, analysis, ctx = {}) {
    const flawCounts = new Map();
    for (const report of reports || []) {
        if (report.flaw && report.flaw !== 'none') {
            flawCounts.set(report.flaw, (flawCounts.get(report.flaw) || 0) + 1);
        }
    }
    for (const [flaw, count] of flawCounts) {
        const corroborated = isCorroboratedFlaw(flaw, {
            voteCount: count,
            repeatedFlaws: ctx.repeatedFlaws || [],
            telemetry,
            flags: ctx.flags || [],
        });
        const evidence = `${count}/4 personas named "${flaw}"; ${shotEvidence(shots, flaw, telemetry, analysis)}`;
        const diagnosis = diagnoseFinding({
            flaw,
            source: corroborated ? 'quality' : 'investigation',
            voteCount: count,
            telemetry,
            analysis,
            shots,
            flags: ctx.flags || [],
            repeatedFlaws: ctx.repeatedFlaws || [],
            evidence,
        });
        // Uncorroborated panel claims route to investigation: a single
        // blind vote with no repeating hotspot is instrument noise until
        // a repeat or a death cluster says otherwise. Never invent a
        // clone finding from rework verdicts alone (no comparator, no
        // route/mechanic evidence).
        add(
            STRUCTURAL_FLAWS.has(flaw) ? 1 : 2,
            flaw,
            corroborated ? 'quality' : 'investigation',
            evidence,
            corroborated
                ? FIX_OWNERS[flaw] || 'skills/level-creator/SKILL.md'
                : 'investigation (capture/panel rerun)',
            diagnosis.smallestFix,
            diagnosis.acceptance,
            {
                confidence: diagnosis.confidence,
                limitations: diagnosis.limitations,
                alternativeCause: diagnosis.alternativeCause,
                diagnosis,
            }
        );
    }
}

function fixesFromConcept(add, concept) {
    if (!concept || concept.passed) return;
    const missing = [
        ...(concept.missing || []),
        ...(concept.sceneryOnlyFacts || []).map((fact) => `scenery-only:${fact}`),
    ];
    // A missing concept prerequisite outranks redesign fixes: resolve the
    // concept/evidence dependency before spending on panels or rebuilds.
    add(
        0,
        'concept:incomplete-brief',
        'concept',
        `build brief fails the concept gate: missing ${missing.join(', ')}`,
        'skills/level-creator/SKILL.md',
        `Complete the missing concept artefacts in the build brief (${missing.join(', ')}), then re-run npm run critic:concept.`,
        'Concept gate passes (npm run critic:concept) before any art or build spend.',
        {
            confidence: 'high',
            limitations: 'Code-measured from the brief; no model judgment involved.',
        }
    );
}

// needsHuman keys that name missing evidence or infrastructure, not work
// for a human reviewer. Panel unavailability is an infrastructure issue:
// retry the panel, do not ask a human to stand in for it.
export function isInfrastructureKey(key) {
    return /^(panel-unavailable|fidelity-panel-unavailable|no-screenshots)$/.test(key || '');
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
        if (isInfrastructureKey(key)) {
            add(
                0,
                key,
                'infrastructure',
                `${key}: the fidelity panel never judged this level (no key, images off, size limit, or no screenshots captured)`,
                'infrastructure (panel/capture rerun)',
                'Restore the evidence path and re-run the full critic: set TYPESAFE_API_KEY, re-capture the beat sheet, and confirm the panel runs. Do not ask a human to stand in for the missing panel.',
                'Re-run the full critic; the fidelity panel must run and judge the full beat sheet.',
                {
                    confidence: 'high',
                    limitations: 'Infrastructure state, not a level flaw.',
                }
            );
            continue;
        }
        add(
            4,
            'needs-human',
            'fidelity',
            `${key} is low-confidence; a human must open the named screenshot in docs/level-reviews/evidence/`,
            'human reviewer (docs/level-reviews/evidence/human.json)',
            `Confirm or override "${key}" against the screenshot and record it in human.json.`,
            'Re-run the full critic; needsHuman must be empty for the fidelity gate.',
            {
                confidence: 'medium',
                limitations: 'Low-confidence model judgment; only a human check resolves it.',
            }
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

// Deduplicate findings with a common cause: repeated missing-elements
// entries merge into one, and one flaw named from several sources keeps
// the strongest entry with combined evidence. Never drops a blocker.
export function dedupeFixes(fixes) {
    const byFlaw = new Map();
    for (const fix of fixes || []) {
        const key = `${fix.flaw}`;
        const prior = byFlaw.get(key);
        if (!prior) {
            byFlaw.set(key, { ...fix });
            continue;
        }
        const mergedEvidence =
            prior.evidence === fix.evidence
                ? prior.evidence
                : `${prior.evidence} AND ${fix.evidence}`;
        const winner = fix.priority < prior.priority ? fix : prior;
        byFlaw.set(key, { ...winner, evidence: mergedEvidence });
    }
    return [...byFlaw.values()];
}

// One justified next action from a ranked contract: the top fix plus the
// confidence/impact/dependency reason it leads. Infrastructure and concept
// prerequisites always lead because nothing downstream is meaningful
// without evidence and a brief.
export function recommendNextAction(fixes) {
    const [top] = fixes || [];
    if (!top) return null;
    const why =
        top.source === 'infrastructure'
            ? 'missing evidence or panel infrastructure blocks every other judgment; restore it first'
            : top.source === 'concept'
              ? 'the concept prerequisite gates all art and build spend'
              : top.source === 'investigation'
                ? 'the top claim is uncorroborated; a bounded rerun decides whether a level edit exists at all'
                : top.confidence === 'high'
                  ? 'code-measured with a named comparator and a behavioral recheck'
                  : 'highest-confidence corroborated finding with a behavioral recheck';
    return {
        flaw: top.flaw,
        source: top.source,
        owner: top.owner,
        smallestFix: top.smallestFix,
        justification: `${top.flaw} leads (${why}).`,
    };
}

export function buildFixContract({
    reports = [],
    flags = [],
    fidelity = null,
    concept = null,
    telemetry = null,
    analysis = null,
    shots = [],
    repeatedFlaws = [],
    panelUnavailable = false,
} = {}) {
    const fixes = [];
    const add = (priority, flaw, source, evidence, owner, smallestFix, recheck, extra = {}) => {
        fixes.push({
            priority,
            flaw,
            source,
            evidence,
            owner,
            smallestFix,
            recheck,
            confidence: extra.confidence || 'medium',
            limitations: extra.limitations || '',
            ...(extra.alternativeCause ? { alternativeCause: extra.alternativeCause } : {}),
            ...(extra.diagnosis ? { diagnosis: extra.diagnosis } : {}),
        });
    };
    if (panelUnavailable) {
        add(
            0,
            'panel-unavailable',
            'infrastructure',
            'quality panel never ran (no API key or request failure); at most a mechanical pass is meaningful',
            'infrastructure (panel/capture rerun)',
            'Restore the panel path and re-run the full critic with TYPESAFE_API_KEY set.',
            'Re-run the full critic; the quality panel must judge the full beat sheet.',
            { confidence: 'high', limitations: 'Infrastructure state, not a level flaw.' }
        );
    }
    const ctx = { telemetry, analysis, shots, flags, repeatedFlaws };
    fixesFromFlags(add, flags, ctx);
    fixesFromPanel(add, reports, shots, telemetry, analysis, ctx);
    fixesFromConcept(add, concept);
    fixesFromFidelity(add, fidelity);
    const deduped = dedupeFixes(fixes);
    deduped.sort((a, b) => a.priority - b.priority || a.flaw.localeCompare(b.flaw));
    // The contract keeps the complete blocker list: maker skills consume
    // fixes[0] only, but the remaining blockers stay visible for the loop
    // after, instead of hiding past a truncation.
    return deduped.map((fix, index) => ({ rank: index + 1, ...fix }));
}

// ---------- Capture: pilot telemetry + screenshot beat sheet ----------

function sampleLevel() {
    const snap = window.__spaceChickenDebug.getBotSnapshot();
    return {
        level: snap.level,
        ready: snap.ready,
        deaths: snap.deaths,
        lastDeathKind: snap.lastDeathKind ?? null,
        player: snap.player
            ? {
                  x: Math.round(snap.player.x),
                  y: Math.round(snap.player.y),
                  grounded: Boolean(snap.player.grounded),
              }
            : null,
        botInput: window.__spaceChickenBotInput ? { ...window.__spaceChickenBotInput } : null,
        crownShield: snap.crown?.shielded,
        hazards: (snap.hazards || []).map((h) => ({
            id: h.id,
            type: h.type,
            x: Math.round(h.x || 0),
            phase: h.phase || null,
            timeUntilPhaseChangeMs: h.timeUntilPhaseChangeMs ?? null,
        })),
        hazardSchedules: (snap.hazardSchedules || []).map((schedule) => ({
            id: schedule.id,
            type: schedule.type,
            phase: schedule.phase,
            warningDurationMs: schedule.warningDurationMs ?? null,
        })),
        awaitingBranch: Boolean(snap.awaitingBranch),
        branchOptions: snap.branchOptions || null,
    };
}

function nearestHazardTo(hazards, x) {
    return (hazards || [])
        .filter((hazard) => Math.abs((hazard.x || 0) - x) <= 300)
        .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
}

async function recordDeaths(page, sample, ctx) {
    const { telemetry, shots, evidenceDir, filePrefix } = ctx;
    if (ctx.deaths0 == null) {
        ctx.deaths0 = sample.deaths || 0;
        ctx.prevDeaths = ctx.deaths0;
    }
    telemetry.deaths = (sample.deaths || 0) - ctx.deaths0;
    // The poll may catch the pilot already respawned, so the death
    // spot is the last position BEFORE the death counter moved.
    if ((sample.deaths || 0) <= ctx.prevDeaths || ctx.prevX == null) return;
    const nearest = nearestHazardTo(sample.hazards, ctx.prevX);
    for (let d = ctx.prevDeaths; d < (sample.deaths || 0); d += 1) {
        telemetry.deathSpots.push(ctx.prevX);
        telemetry.deathEvents.push({
            x: ctx.prevX,
            cause: sample.lastDeathKind || null,
            hazardId: nearest?.id || null,
            hazardType: nearest?.type || null,
            hazardPhase: nearest?.phase || null,
            tSec: ctx.elapsedSec(),
            replaySec: null,
        });
    }
    ctx.pendingReplay = { x: ctx.prevX, tSec: ctx.elapsedSec() };
    ctx.prevDeaths = sample.deaths || 0;
    // Gameplay frame at the death: real play evidence, not a
    // staged still. Capped so a death spiral cannot flood disk.
    if (ctx.deathFrames >= 6) return;
    ctx.deathFrames += 1;
    const file = `${filePrefix}death-${ctx.deathFrames}.jpg`;
    await page.screenshot({ path: path.join(evidenceDir, file), type: 'jpeg', quality: 72 });
    shots.push({
        id: `${filePrefix}death-${ctx.deathFrames}`,
        file,
        path: path.join(evidenceDir, file),
        x: ctx.prevX,
        y: 400,
        capture: 'gameplay',
        proves: `gameplay frame at death ${ctx.deathFrames} (x=${ctx.prevX}, cause ${sample.lastDeathKind || 'unknown'}); the poll may catch the pilot already respawned, so the frame shows the aftermath, not necessarily the killing blow`,
    });
}

function flushStall(ctx, now = Date.now()) {
    if (ctx.stallSince != null && ctx.stallX != null && now - ctx.stallSince >= 1500) {
        ctx.telemetry.stalls.push({
            x: ctx.stallX,
            durationSec: Math.round((now - ctx.stallSince) / 100) / 10,
        });
    }
}

function recordProgress(sample, ctx) {
    const { telemetry } = ctx;
    if (!sample.player) return;
    telemetry.maxX = Math.max(telemetry.maxX, sample.player.x);
    // Stall: under 8px of progress across polls. Named with its
    // stretch so the fix can find the encounter, not the paint.
    if (ctx.stallX == null || Math.abs(sample.player.x - ctx.stallX) > 8) {
        flushStall(ctx);
        ctx.stallX = sample.player.x;
        ctx.stallSince = Date.now();
    }
    if (ctx.pendingReplay && sample.player.x >= ctx.pendingReplay.x) {
        const event = telemetry.deathEvents.at(-1);
        if (event) {
            event.replaySec = Math.round((ctx.elapsedSec() - ctx.pendingReplay.tSec) * 10) / 10;
        }
        ctx.pendingReplay = null;
    }
    if (sample.player.grounded) ctx.tiers.add(Math.round(sample.player.y / 60));
    ctx.prevX = sample.player.x;
}

function recordHazards(sample, ctx) {
    const { telemetry } = ctx;
    for (const hazard of sample.hazards || []) {
        if (hazard.type) ctx.seen.add(hazard.type);
        if (hazard.id && hazard.phase) {
            if (!ctx.phasesSeen.has(hazard.id)) ctx.phasesSeen.set(hazard.id, new Set());
            ctx.phasesSeen.get(hazard.id).add(hazard.phase);
        }
    }
    for (const schedule of sample.hazardSchedules || []) {
        if (
            schedule.type &&
            schedule.warningDurationMs != null &&
            telemetry.telegraphMs[schedule.type] == null
        ) {
            telemetry.telegraphMs[schedule.type] = schedule.warningDurationMs;
        }
    }
    if (sample.awaitingBranch && sample.branchOptions) {
        ctx.branchesSeen.add(sample.branchOptions.join('>'));
    }
}

function finalizePilotTelemetry(ctx, analysis) {
    const { telemetry } = ctx;
    flushStall(ctx);
    telemetry.durationSec = ctx.elapsedSec();
    telemetry.hazardTypesSeen = [...ctx.seen];
    telemetry.hazardPhasesSeen = Object.fromEntries(
        [...ctx.phasesSeen.entries()].map(([id, phases]) => [id, [...phases]])
    );
    telemetry.tiersVisited = [...ctx.tiers].sort((a, b) => a - b);
    telemetry.branchOptionsSeen = [...ctx.branchesSeen];
    if (telemetry.outcome === 'timeout' && telemetry.gateOpened) {
        telemetry.outcome = 'gate-open';
    } else if (telemetry.outcome === 'timeout' && telemetry.maxX > (analysis?.crownX || 0) - 200) {
        telemetry.outcome = 'reached-crown-area';
    }
}

async function captureBeatSheet(
    page,
    { levelId, analysis, content, evidenceDir, filePrefix, shots }
) {
    // Re-enter the level under review first: a crown-collect during the
    // pilot run advances to NEXT_LEVEL, and beats shot there would judge
    // the wrong level.
    await page.evaluate((id) => window.__spaceChickenDebug.goToLevel(id), levelId);
    await page.waitForFunction(() => window.__spaceChickenDebug?.ready(), null, {
        timeout: 20000,
    });
    await page.waitForTimeout(800);
    for (const beat of planBeats(analysis, content)) {
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
        const file = `${filePrefix}${beat.id}.jpg`;
        await page.screenshot({
            path: path.join(evidenceDir, file),
            type: 'jpeg',
            quality: 72,
        });
        shots.push({
            ...beat,
            file,
            path: path.join(evidenceDir, file),
            capture: 'staged-teleport',
        });
    }
}

export async function captureEvidence(levelId, analysis, content = null, options = {}) {
    const { createServer } = require(path.join(ROOT, 'server.cjs'));
    const { chromium } = await import(path.join(ROOT, 'node_modules/playwright/index.mjs'));
    const { buildPilotSource } = await import('./pilot-brain.mjs');
    const evidenceDir = path.join(ROOT, 'docs/level-reviews/evidence', `level-${levelId}`);
    mkdirSync(evidenceDir, { recursive: true });
    // Never delete earlier JPGs: each run keeps its evidence. Later runs
    // take a run prefix so filenames never collide with run 1.
    const filePrefix = options.runLabel ? `run${options.runLabel}-` : '';
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
        deathEvents: [],
        stalls: [],
        inputHistory: [],
        maxX: 0,
        tiersVisited: [],
        routeBranches: [],
        branchOptionsSeen: [],
        gateOpened: false,
        hazardTypesSeen: [],
        hazardPhasesSeen: {},
        telegraphMs: {},
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
        const ctx = {
            telemetry,
            shots,
            evidenceDir,
            filePrefix,
            elapsedSec: () => Math.round((Date.now() - start) / 100) / 10,
            seen: new Set(),
            phasesSeen: new Map(),
            tiers: new Set(),
            branchesSeen: new Set(),
            deaths0: null,
            prevDeaths: 0,
            prevX: null,
            pendingReplay: null,
            deathFrames: 0,
            stallX: null,
            stallSince: null,
            polls: 0,
        };
        const budgetMs = pilotBudgetSec(analysis?.worldWidth) * 1000;
        while (Date.now() - start < budgetMs) {
            const sample = await page.evaluate(sampleLevel);
            ctx.polls += 1;
            await recordDeaths(page, sample, ctx);
            recordProgress(sample, ctx);
            recordHazards(sample, ctx);
            if (ctx.polls % 4 === 0 && sample.botInput) {
                telemetry.inputHistory.push({ tSec: ctx.elapsedSec(), input: sample.botInput });
            }
            if (sample.level !== levelId) {
                telemetry.outcome = 'crown-collected';
                if (sample.level != null) telemetry.routeBranches.push(sample.level);
                break;
            }
            // Past the boss shield is not past the level: keep playing to
            // the crown. Gate-open alone never counts as a completed route.
            if (analysis?.hasBoss && sample.crownShield === false) {
                telemetry.gateOpened = true;
            }
            await page.waitForTimeout(150);
        }
        finalizePilotTelemetry(ctx, analysis);
        // Beat sheet: opener, mid set piece, finale.
        await captureBeatSheet(page, {
            levelId,
            analysis,
            content,
            evidenceDir,
            filePrefix,
            shots,
        });
        const manifestShots = shots.map((shot) => ({
            id: shot.id,
            file: shot.file,
            x: shot.x ?? null,
            y: shot.y ?? null,
            proves: shot.proves,
            capture: shot.capture || 'staged-teleport',
            hash: revisionHashOfFile(shot.path),
        }));
        writeFileSync(
            path.join(
                evidenceDir,
                `shots${options.runLabel ? `-run${options.runLabel}` : ''}.json`
            ),
            `${JSON.stringify({ level: levelId, runLabel: options.runLabel || 1, shots: manifestShots }, null, 2)}\n`
        );
    } finally {
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
    return { telemetry, shots, evidenceDir };
}

// ---------- Jev panels ----------

function qualityQuestions(persona) {
    const head = `You are ${persona.name}. ${persona.profile} Judge ONLY the level described in state.level from state.telemetry, state.mechanicalFlags, and the screenshots referenced in state.shots. The telemetry comes from a mid-skill bot pilot. telemetry.deathSpots lists the x-position of each death: deaths clustered within ~200px suggest a cheap spot, spread-out deaths suggest pilot skill, so judge cheapness by that pattern and flags, not raw counts. Judge the level in its campaign role: levels 1-3 are teaching levels and levels 8-16 are contra stages; a short teaching level is not a failed contra stage, but no role excuses clones, blind deaths, or a sleeping finale for its size. If telemetry.maxX never neared state.level.crownX, the finale is untested: name what blocked progress instead of 'sleeping-finale'. Finale pressure is judged from BOTH the finale still and the data: state.level.finaleHazardCount counts hazards within 900px of the crown and state.level.finaleVisible says whether a frozen still can show one; a timed beam caught off-phase in one still is not a sleeping finale when the data shows pressure on the crown deck, and an empty still with finaleVisible=false is a visibility flaw in the level, not proof the crown is unguarded in play. Shots carry a capture kind: gameplay frames show real play; staged-teleport stills show teleported camera positions, never play. Mechanic claims (rides, bonks, synchrony, formation flying) need telemetry or motion, not stills. "Not visible in the judged shots" is not "missing from the game": only call an element missing when the beat sheet covered its location and it still does not read. If state.screenshotsSent is false, cap readability at 2 and say the visual evidence was missing. Score as this persona, not as the designer.`;
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
    // The full beat sheet is judged in request-sized batches (at most 4
    // shots each): every beat reaches a persona, and each merged report
    // records exactly which shots it saw in evidenceSeen.
    const batches = batchPanelShots(shots, 4);
    if (!batches.length) batches.push([]);
    const reports = [];
    for (const persona of PERSONAS) {
        const perBatch = [];
        for (const [batchIndex, batch] of batches.entries()) {
            const shotState = [];
            for (const shot of batch) {
                shotState.push({
                    beat: shot.id,
                    proves: shot.proves,
                    capture: shot.capture || 'staged-teleport',
                    image: image(await openAsBlob(shot.path)),
                });
            }
            const screenshotsSent = shotState.length > 0;
            const response = await client.systemOne(
                {
                    state: {
                        level: { id: levelId, ...analysis },
                        telemetry,
                        mechanicalFlags: flags,
                        roster,
                        screenshotsSent,
                        shotBatch: `${batchIndex + 1}/${batches.length}`,
                        shots: shotState,
                        persona: { id: persona.id, profile: persona.profile },
                    },
                    questions: qualityQuestions(persona),
                },
                {
                    timeout: 30000,
                    retry: { maxRetries: 1 },
                    headers: screenshotsSent
                        ? { 'TypeSafe-Danger-Zone-Images': 'true' }
                        : undefined,
                }
            );
            const answers = response.answers;
            perBatch.push({
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
                shotIds: batch.map((shot) => shot.id),
            });
            console.log(
                `${persona.name} [${batchIndex + 1}/${batches.length}]: fun=${answers.fun.score.toFixed(1)} fair=${answers.fairness.score.toFixed(1)} novel=${answers.novelty.score.toFixed(1)} flaw=${answers.flaw.choice} -> ${answers.verdict.choice}`
            );
        }
        reports.push(mergePersonaBatches(perBatch));
    }
    return reports;
}

// Send screenshots to the fidelity panel over raw HTTP with base64 assets.
// The SDK has an image() helper now, but this path is proven and stays.
// One request judges one shot batch (at most 4) against one question
// chunk (at most 6 elements / 6 rows); every shot batch crosses every
// question chunk so each element is judged against the full beat sheet.
async function sendFidelityBatch({
    apiKey,
    baseURL,
    brief,
    codeChecks,
    shots,
    elements,
    rows,
    telemetry,
}) {
    const assets = {};
    const shotState = [];
    for (const shot of shots) {
        const blob = await openAsBlob(shot.path);
        const buffer = Buffer.from(await blob.arrayBuffer());
        const ref = `${randomUUID()}-shot`;
        assets[ref] = {
            type: 'image',
            format: 'jpg',
            data_base64: buffer.toString('base64'),
        };
        shotState.push({
            beat: shot.id,
            proves: shot.proves,
            capture: shot.capture || 'staged-teleport',
            image: ref,
        });
    }
    const elementQuestions = {};
    (elements || []).forEach((element, index) => {
        elementQuestions[`element_${index}`] = {
            type: 'noul',
            instructions: `Is the story element "${element}" recognisably visible in \`shots\` at gameplay size, without reading the level instructions? Judge only what the screenshots show. Shots marked capture gameplay show real play; staged-teleport stills show teleported camera positions. "Not visible in these shots" is not "missing from the game".`,
        };
    });
    const rowQuestions = {};
    (rows || []).forEach((row, index) => {
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
    const judgedElements = (elements || []).map((element, index) => ({
        element,
        signature: Boolean(markByElement.get(element)),
        noul: answers[`element_${index}`]?.noul ?? 0,
        verdict: elementVerdict(answers[`element_${index}`]?.noul ?? 0),
    }));
    const judgedRows = (rows || []).map((row, index) => ({
        fact: row.fact,
        mechanic: row.mechanic,
        signature: Boolean(markByFact.get(row.fact) || row.signature),
        choice: answers[`row_${index}`]?.choice || 'unsupported',
        confidence: answers[`row_${index}`]?.confidence ?? 0,
    }));
    return {
        sent: true,
        elements: judgedElements,
        rows: judgedRows,
        mechanicFidelity: answers.mechanic_fidelity?.score ?? 0,
        visualFidelity: answers.visual_fidelity?.score ?? 0,
        fidelityFlaw: answers.fidelity_flaw?.choice || 'unsupported',
        universeFit: answers.universe_fit?.noul ?? null,
        shotIds: shots.map((shot) => shot.id),
        usage: payload.usage || null,
    };
}

export async function sendScreenshots({ apiKey, baseURL, brief, codeChecks, shots, telemetry }) {
    const shotBatches = batchPanelShots(shots, 4);
    if (!shotBatches.length) return { sent: false, reason: 'no screenshots captured' };
    // Question chunks zip by index (the shorter list cycles); each chunk
    // then crosses every shot batch so no element or row goes unjudged.
    const elementChunks = batchInventory(brief.elements || [], 6);
    const rowChunks = batchInventory(brief.mappings || [], 6);
    const chunkCount = Math.max(elementChunks.length, rowChunks.length, 1);
    const questionChunks = [];
    for (let i = 0; i < chunkCount; i += 1) {
        questionChunks.push({
            elements: elementChunks.length ? elementChunks[i % elementChunks.length] : [],
            rows: rowChunks.length ? rowChunks[i % rowChunks.length] : [],
        });
    }
    const batchResults = [];
    const usages = [];
    for (const shotBatch of shotBatches) {
        for (const chunk of questionChunks) {
            const judged = await sendFidelityBatch({
                apiKey,
                baseURL,
                brief,
                codeChecks,
                shots: shotBatch,
                elements: chunk.elements,
                rows: chunk.rows,
                telemetry,
            });
            batchResults.push(judged);
            if (judged.usage) usages.push(judged.usage);
        }
    }
    const merged = mergeFidelityBatches(batchResults);
    return {
        sent: true,
        ...merged,
        evidenceTotal: (shots || []).length,
        usage: usages,
    };
}

// ---------- Reports + main ----------

function renderHeaderLines(report) {
    const statuses = report.statuses || null;
    const qualityLine = statuses
        ? `Quality gate: ${statuses.quality.status.toUpperCase()} (${statuses.quality.detail})`
        : `Quality gate: ${report.passed ? 'PASS' : 'ITERATE/REWORK'} (legacy report: combined verdict, not the quality panel alone)`;
    const lines = [
        `# Level critic — level ${report.level} (${report.analysis?.title || 'untitled'})`,
        '',
        `- Run: ${report.run} (pipeline ran; only Route coverage below says how far play reached)`,
        `- Screenshots sent to critic: ${report.screenshotsSent}`,
        `- Mechanical flags: ${report.flags.length ? report.flags.map((f) => `${f.id} (${f.detail})`).join('; ') : 'none'}`,
        `- Telemetry: ${report.telemetry ? JSON.stringify(report.telemetry) : 'static run, no capture'}`,
        `- ${qualityLine}`,
    ];
    if (statuses) {
        lines.push(...renderStatusLines(statuses));
    }
    return lines;
}

function renderStatusLines(statuses) {
    return [
        `- Capture validity: ${statuses.captureValidity.status} — ${statuses.captureValidity.detail}`,
        `- Route coverage: ${statuses.routeCoverage.status} — ${statuses.routeCoverage.detail}`,
        `- Mechanical checks: ${statuses.mechanical.status} — ${statuses.mechanical.detail}`,
        `- Fidelity: ${statuses.fidelity.status} — ${statuses.fidelity.detail}`,
        `- Release eligibility: ${statuses.releaseEligibility.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}${statuses.releaseEligibility.blockers.length ? ` (blockers: ${statuses.releaseEligibility.blockers.join('; ')})` : ''}`,
    ];
}

function renderLoopLines(report) {
    const lines = [
        `- Loop: ${report.loop ?? 1}${report.priorFlaw ? ` (prior top flaw: ${report.priorFlaw})` : ''}${report.calibrationRuns ? `; calibration reruns at this loop: ${report.calibrationRuns}` : ''}${report.loopExceeded ? ' — LOOP LIMIT REACHED: hand to the user, do not lower the gate' : ''}`,
        `- Pilot runs: ${report.pilotRuns ?? (report.telemetry ? 1 : 0)}${report.repeatedFlaws?.length ? `; repeated flaws across runs: ${report.repeatedFlaws.join(', ')}` : ''}`,
    ];
    if (report.runs?.length > 1) {
        for (const run of report.runs) {
            lines.push(
                `  - run ${run.runLabel}: ${run.telemetry?.outcome || 'unknown'} in ${run.telemetry?.durationSec ?? '?'}s, deaths ${run.telemetry?.deaths ?? '?'}, maxX ${run.telemetry?.maxX ?? '?'}; flaws: ${(run.flaws || []).join(', ') || 'none'}`
            );
        }
    }
    if (report.provenance) {
        const provenance = report.provenance;
        lines.push(
            `- Provenance: rubric ${provenance.rubricVersion}, pilot ${provenance.pilotRevision}, critic ${provenance.criticRevision}, model ${provenance.model}, level ${provenance.analysisHash}, runs [${(provenance.runIds || []).join(', ')}]`
        );
    }
    if (report.priorStalePassIssues?.length) {
        lines.push(
            `- Prior stored PASS was stale; revalidating at this loop: ${report.priorStalePassIssues.join('; ')}`
        );
    }
    if (report.nextAction) {
        lines.push(
            `- Next action: [${report.nextAction.flaw}] ${report.nextAction.smallestFix} (${report.nextAction.justification})`
        );
    }
    if (report.concept) {
        lines.push(
            `- Concept gate: ${report.concept.passed ? 'PASS' : `FAIL (missing: ${[...(report.concept.missing || []), ...(report.concept.sceneryOnlyFacts || []).map((fact) => `scenery-only:${fact}`)].join(', ') || 'none'})`}`
        );
    }
    return lines;
}

function renderQualityLines(report) {
    if (!report.reports?.length) {
        return [
            '',
            '## Quality panel',
            '',
            '- unavailable (no API key or static run); mechanical pass only.',
        ];
    }
    const lines = ['', '## Quality panel', ''];
    for (const entry of report.reports) {
        lines.push(
            `- ${entry.name}: fun=${entry.fun.toFixed(1)} fair=${entry.fairness.toFixed(1)} read=${entry.readability.toFixed(1)} novel=${entry.novelty.toFixed(1)} pace=${entry.pacing.toFixed(1)} theme=${entry.theme.toFixed(1)} flaw=${entry.flaw} -> ${entry.verdict}${entry.evidenceSeen?.length ? ` (saw: ${entry.evidenceSeen.join(', ')})` : ''}`
        );
    }
    const means = panelMeans(report.reports);
    lines.push(
        `- Means: fun=${means.fun.toFixed(2)} fair=${means.fairness.toFixed(2)} read=${means.readability.toFixed(2)} novel=${means.novelty.toFixed(2)} pace=${means.pacing.toFixed(2)} theme=${means.theme.toFixed(2)}`
    );
    if (report.newsFloorFailures?.length) {
        lines.push(`- News floor failures: ${report.newsFloorFailures.join('; ')}`);
    }
    return lines;
}

export function renderReport(report) {
    return [
        ...renderHeaderLines(report),
        ...renderLoopLines(report),
        ...renderQualityLines(report),
        ...renderFidelityLines(report),
        ...renderFixLines(report),
    ].join('\n');
}

function fidelityElementLine(entry) {
    const verdict =
        entry.verdict ||
        (entry.claimed === undefined
            ? 'unjudged'
            : entry.claimed
              ? 'claimed-in-data (not judged)'
              : 'unclaimed-in-data');
    const noul = entry.noul == null ? '' : ` (noul=${entry.noul.toFixed(2)})`;
    return `- Element "${entry.element}"${entry.signature ? ' [signature]' : ''}: ${verdict}${noul}`;
}

function fidelityRowLine(row) {
    const confidence = row.confidence == null ? '' : ` (confidence=${row.confidence.toFixed(2)})`;
    return `- Row "${row.fact}"${row.signature ? ' [signature]' : ''} -> ${row.choice}${confidence}`;
}

function renderFidelityLines(report) {
    if (!report.fidelity) return [];
    const lines = ['', '## News fidelity', ''];
    lines.push(`- Brief: ${report.fidelity.briefHeadline || 'missing'}`);
    lines.push(`- Gate: ${report.fidelity.gate?.passed ? 'PASS' : 'FAIL'}`);
    if (report.fidelity.evidenceSeen || report.fidelity.evidenceTotal != null) {
        const seen = (report.fidelity.evidenceSeen || []).length;
        const total = report.fidelity.evidenceTotal ?? seen;
        lines.push(
            `- Evidence judged: ${seen} of ${total} shots (${(report.fidelity.evidenceSeen || []).join(', ') || 'none'}); "missing" below means not visible in the judged evidence, not proven missing from the game`
        );
    }
    for (const entry of report.fidelity.elements || []) {
        lines.push(fidelityElementLine(entry));
    }
    for (const row of report.fidelity.rows || []) {
        lines.push(fidelityRowLine(row));
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

// Human confirmations are evidence, not a rubber stamp: only a named
// human reviewer counts toward the fidelity gate. Agent visual review is
// recorded separately and never silently stands in for the human check
// the skill requires. Confirmations name no shot or basis at their peril:
// missing reviewer/reasoning is reported as an issue by callers.
export function confirmationReview(human) {
    const confirmed = Array.isArray(human?.confirmed) ? human.confirmed : [];
    const reviewerType =
        human?.reviewerType || (/agent/i.test(human?.reviewer || '') ? 'agent' : null);
    const issues = [];
    if (confirmed.length && reviewerType !== 'human') {
        issues.push('confirmations are not from a named human reviewer (reviewerType)');
    }
    if (confirmed.length && !human?.reviewer) issues.push('confirmation has no reviewer');
    if (confirmed.length && !human?.reasoning) issues.push('confirmation has no observed basis');
    return {
        confirmed: reviewerType === 'human' ? confirmed : [],
        agentConfirmed: reviewerType === 'human' ? [] : confirmed,
        reviewerType,
        issues,
    };
}

function loadHumanConfirmations(evidenceDir) {
    try {
        const human = JSON.parse(readFileSync(path.join(evidenceDir, 'human.json'), 'utf8'));
        const review = confirmationReview(human);
        for (const issue of review.issues) {
            console.warn(`warning: human.json ${issue}`);
        }
        return review.confirmed;
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
            (flag) => flag.id === 'clone-suspect' || flag.id === 'skeleton-rhyme'
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

function runConceptGate(args, briefPath) {
    const rawId = Number(args.find((arg) => /^\d+$/.test(arg)));
    const conceptPath =
        briefPath || (Number.isFinite(rawId) && rawId > 0 ? `docs/level-builds/${rawId}.md` : null);
    if (!conceptPath) {
        throw new Error('usage: node scripts/level-critic.mjs --concept --brief <build-note.md>');
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
}

// News brief resolution: explicit path, else build report, else selection.
function resolveNewsBrief(briefPath, levelId) {
    let brief = null;
    let briefSource = null;
    let briefRaw = null;
    const candidates = [briefPath, path.join(ROOT, 'docs/level-builds', `${levelId}.md`)].filter(
        Boolean
    );
    for (const candidate of candidates) {
        const resolved = path.isAbsolute(candidate) ? candidate : path.join(ROOT, candidate);
        if (existsSync(resolved)) {
            briefRaw = readFileSync(resolved, 'utf8');
            brief = parseNewsBrief(briefRaw);
            briefSource = resolved;
            if (brief.elements.length || brief.mappings.length) break;
        }
    }
    return { brief, briefSource, briefRaw };
}

function buildRunRecord({ runLabel, pilotRevision, startedAt, telemetry, shots, panel }) {
    return {
        runId: randomUUID(),
        runLabel,
        pilotRevision,
        seed: null,
        phaseNote: 'pilot unseeded; timing phase varies run to run',
        startedAt,
        telemetry,
        shots: shots.map(({ id, file, proves, capture }) => ({ id, file, proves, capture })),
        flaws: (panel?.reports || []).map((report) => report.flaw).filter(Boolean),
        verdicts: (panel?.reports || []).map((report) => report.verdict).filter(Boolean),
        screenshotsSent: panel?.screenshotsSent ?? false,
    };
}

function loadPriorReport(reportPath, { isStatic, humanRaw }) {
    let priorReport = null;
    try {
        priorReport = JSON.parse(readFileSync(reportPath, 'utf8'));
    } catch {
        return { priorReport: null, priorStalePassIssues: [] };
    }
    // A stored PASS that rests on agent confirmations or a partial route
    // is stale: revalidate at the same loop instead of certifying it.
    const priorStalePassIssues = [];
    if (priorReport?.passed && !isStatic) {
        const stored = validateStoredPass(priorReport, humanRaw);
        if (!stored.consistent) {
            for (const issue of stored.issues) {
                priorStalePassIssues.push(issue);
                console.warn(`warning: prior stored PASS is stale: ${issue}`);
            }
            priorReport = { ...priorReport, stalePass: true };
        }
    }
    return { priorReport, priorStalePassIssues };
}

function computeLoopInfo({ isStatic, priorReport, analysis }) {
    const currentHash = analysisHash(analysis);
    const priorHash = priorReport?.provenance?.analysisHash
        ? priorReport.provenance.analysisHash
        : priorReport?.analysis
          ? analysisHash(priorReport.analysis)
          : null;
    const designChanged = priorHash ? priorHash !== currentHash : true;
    // Static checks are free verification; only full runs advance the loop,
    // and only design revisions advance it (calibration reruns hold it).
    if (isStatic && priorReport && !priorReport.passed) {
        return {
            loop: priorReport.loop || 1,
            priorFlaw: priorReport.fixes?.[0]?.flaw || priorReport.priorFlaw || null,
            calibrationRuns: priorReport.calibrationRuns || 0,
        };
    }
    return nextRevisionLoop(priorReport, { designChanged: designChanged && !isStatic });
}

function assembleReport({
    levelId,
    isStatic,
    apiKey,
    analysis,
    flags,
    telemetry,
    runs,
    shots,
    screenshotsSent,
    reports,
    fidelity,
    concept,
    isNewsLevel,
    loopInfo,
    priorStalePassIssues,
    pilotRuns,
    repeatedFlaws,
    passed,
}) {
    const fixes = buildFixContract({
        reports,
        flags,
        fidelity,
        concept: isNewsLevel ? concept : null,
        telemetry,
        analysis,
        shots,
        repeatedFlaws,
        panelUnavailable: !isStatic && !apiKey,
    });
    const statuses = assessEvidenceValidity({
        telemetry,
        runs,
        analysis,
        flags,
        reports,
        fidelity,
        screenshotsSent,
        concept: isNewsLevel ? concept : null,
        isNewsLevel,
    });
    // Release eligibility is the ship verdict: panels plus a completed
    // crown route on valid capture. `passed` stays the panel-gate result
    // so the Quality gate line reports what the panel actually said.
    const releaseEligible = !isStatic && apiKey ? statuses.releaseEligibility.eligible : false;
    const loopExceeded = loopInfo.loop > 3;
    return {
        level: levelId,
        run: isStatic ? 'static' : apiKey ? 'full' : 'mechanical-only',
        analysis,
        flags,
        telemetry,
        runs,
        shots: shots.map(({ id, file, proves, capture }) => ({ id, file, proves, capture })),
        screenshotsSent,
        reports,
        fidelity,
        concept: isNewsLevel ? concept : null,
        newsFloorFailures: isNewsLevel && reports.length ? newsFloorFailures(reports) : [],
        fixes,
        nextAction: recommendNextAction(fixes),
        statuses,
        provenance: buildProvenance({
            levelId,
            analysis,
            runIds: runs.map((run) => run.runId),
            captureConfig: {
                budgetSec: pilotBudgetSec(analysis?.worldWidth),
                runCount: runs.length,
            },
        }),
        loop: loopInfo.loop,
        priorFlaw: loopInfo.priorFlaw,
        calibrationRuns: loopInfo.calibrationRuns || 0,
        loopExceeded,
        handoff: loopExceeded
            ? {
                  handedOff: true,
                  remainingFlaw: fixes[0]?.flaw || null,
                  evidence: fixes[0]?.evidence || null,
                  owner: fixes[0]?.owner || null,
                  note: 'Three design revisions failed; handed to the user. Do not lower the gate to escape the loop.',
              }
            : null,
        priorStalePassIssues,
        pilotRuns,
        repeatedFlaws,
        passed,
        releaseEligible,
    };
}

function writeCriticReport(levelId, report) {
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
    const { passed, releaseEligible } = report;
    const shipVerdict = releaseEligible || (report.run === 'static' && passed);
    console.log(
        shipVerdict
            ? 'CRITIC: PASS'
            : passed
              ? 'CRITIC: PANELS PASSED, ROUTE UNVERIFIED'
              : 'CRITIC: ITERATE'
    );
    process.exitCode = shipVerdict ? 0 : 2;
}

// eslint-disable-next-line complexity -- orchestrates static/capture/panel stages in order
async function main() {
    const args = process.argv.slice(2).filter((arg) => arg !== '--');
    const isStatic = args.includes('--static') || process.env.CRITIC_STATIC === '1';
    const briefFlagIndex = args.indexOf('--brief');
    const briefPath =
        (briefFlagIndex >= 0 ? args[briefFlagIndex + 1] : null) || process.env.NEWS_BRIEF || null;
    if (args.includes('--concept')) {
        runConceptGate(args, briefPath);
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
    // Immutable runs: every capture is retained with its seeds/phases,
    // pilot revision, inputs, outcomes, death events, and evidence paths.
    // A second pass never replaces the first.
    let runs = [];
    const pilotRevision = revisionHashOfFile(path.join(ROOT, 'scripts/pilot-brain.mjs'));

    let humanConfirmed = [];
    let humanRaw = null;
    let firstRunAt = null;
    if (!isStatic) {
        firstRunAt = new Date().toISOString();
        const captured = await captureEvidence(levelId, analysis, content);
        telemetry = captured.telemetry;
        shots = captured.shots;
        if (telemetry.errors?.length) {
            throw new Error(`page errors during capture: ${telemetry.errors.join(' | ')}`);
        }
        humanConfirmed = loadHumanConfirmations(captured.evidenceDir);
        try {
            humanRaw = JSON.parse(
                readFileSync(path.join(captured.evidenceDir, 'human.json'), 'utf8')
            );
        } catch {
            humanRaw = null;
        }
    }

    const resolvedBrief = resolveNewsBrief(briefPath, levelId);
    let brief = resolvedBrief.brief;
    const { briefSource, briefRaw } = resolvedBrief;
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
    if (telemetry) {
        runs = appendRun(
            runs,
            buildRunRecord({
                runLabel: 1,
                pilotRevision,
                startedAt: firstRunAt,
                telemetry,
                shots,
                panel,
            })
        );
    }
    if (!passed && !isStatic && apiKey && reports.length) {
        // A lone flaw on one pilot run is instrument noise: capture and
        // judge a second run, and record which flaws repeat. The first
        // run stays in runs[] untouched.
        const captured = await captureEvidence(levelId, analysis, content, { runLabel: 2 });
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
        runs = appendRun(
            runs,
            buildRunRecord({
                runLabel: 2,
                pilotRevision,
                startedAt: new Date().toISOString(),
                telemetry,
                shots,
                panel,
            })
        );
        repeatedFlaws = repeatedFlawsAcrossRuns(runs);
    }

    const reportPath = path.join(ROOT, 'docs/level-reviews', `level-${levelId}.json`);
    const { priorReport, priorStalePassIssues } = loadPriorReport(reportPath, {
        isStatic,
        humanRaw,
    });
    const loopInfo = computeLoopInfo({ isStatic, priorReport, analysis });
    const report = assembleReport({
        levelId,
        isStatic,
        apiKey,
        analysis,
        flags,
        telemetry,
        runs,
        shots,
        screenshotsSent,
        reports,
        fidelity,
        concept,
        isNewsLevel,
        loopInfo,
        priorStalePassIssues,
        pilotRuns,
        repeatedFlaws,
        passed,
    });
    writeCriticReport(levelId, report);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    });
}
