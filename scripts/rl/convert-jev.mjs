/**
 * Convert JEV output into BC training demos (JSONL, contract v2).
 *
 * Two inputs, one training format:
 * - Stored playtest reports under .jev-runs (any depth): legacy partial
 *   steps (player/objective only). Board slots zero-fill; rows are marked
 *   partial:true and the trainer drops them once full demos exist.
 * - Raw full-observation recordings (JEV_RECORD_DEMOS=1) under
 *   rl/demos-raw: complete board state per step, partial:false.
 *
 * Output rl/demos/demo-*.jsonl (header + step rows) for rl/train_bc.py.
 *
 *   npm run rl:convert
 *   DEMO_OUT=rl/demos DEMO_IN=rl/demos-raw npm run rl:convert
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { actionIndex, availableMask, encodeObservation, stepReward } from './features.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const JEV_DIR = path.join(ROOT, '.jev-runs');
const RAW_DIR = process.env.DEMO_IN || path.join(ROOT, 'rl', 'demos-raw');
const OUT_DIR = process.env.DEMO_OUT || path.join(ROOT, 'rl', 'demos');

const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'rl', 'contract.json'), 'utf8'));

function findFiles(dir, name) {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...findFiles(full, name));
        else if (entry.name === name || (name instanceof RegExp && name.test(entry.name))) {
            out.push(full);
        }
    }
    return out.sort();
}

function sampleWeight(record) {
    const confidence = Number.isFinite(record.confidence) ? record.confidence : 0.5;
    let weight = 0.3 + 0.7 * confidence;
    if (typeof record.source === 'string' && record.source.startsWith('fallback')) {
        weight *= 0.7;
    }
    return weight;
}

function baseHeader(extra) {
    return {
        type: 'header',
        obsVersion: contract.obsVersion,
        obsSize: contract.obsSize,
        actionSize: contract.actionSize,
        ...extra,
    };
}

function convertReport(reportPath) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const actions = Array.isArray(report.actions) ? report.actions : [];
    const steps = [];
    let prevDeaths = 0;
    let prevObs = null;
    let firstDist = null;
    let maxProgress = 0;
    const won = report.objective?.passed === true;
    // Winning episodes are the only true expert signal; clone them harder.
    const winScale = won ? 2 : 1;
    for (const record of actions) {
        const index = actionIndex(record.action);
        if (index < 0) continue;
        const obs = encodeObservation(record);
        if (!obs.every(Number.isFinite) || obs.length !== contract.obsSize) continue;
        const dist = Number(record.objective?.distance);
        if (Number.isFinite(dist)) {
            if (firstDist === null) firstDist = dist;
            maxProgress = Math.max(maxProgress, 1 - dist / Math.max(1, firstDist));
        }
        const deaths = Number(record.deaths) || 0;
        const reward = prevObs
            ? stepReward(
                  { objective: prevObs.objective, deaths: prevDeaths, player: prevObs.player },
                  { objective: record.objective, deaths, player: record.player },
                  { action: record.action }
              )
            : 0;
        prevObs = record;
        prevDeaths = deaths;
        steps.push({
            type: 'step',
            obs,
            action: index,
            actionName: record.action,
            reward,
            weight: sampleWeight(record) * winScale,
            partial: true,
            meta: {
                atMs: record.atMs ?? null,
                source: record.source ?? null,
                confidence: record.confidence ?? null,
            },
        });
    }
    if (!steps.length) return null;
    const finalObjective = report.objective || {};
    return {
        header: baseHeader({
            expert: 'jev',
            partial: true,
            model: report.model ?? null,
            level: report.level ?? null,
            seed: report.seed ?? null,
            when: report.when ?? null,
            won: finalObjective.passed === true,
            deaths: report.finalObservation?.deaths ?? null,
            maxProgress,
            steps: steps.length,
            createdAt: new Date().toISOString(),
        }),
        steps,
    };
}

function convertRaw(rawPath) {
    const lines = fs.readFileSync(rawPath, 'utf8').trim().split('\n');
    const rawHeader = JSON.parse(lines[0]);
    if (rawHeader.format !== 'spacechicken-raw-obs') return null;
    const steps = [];
    let maxProgress = 0;
    let firstDist = null;
    for (const line of lines.slice(1)) {
        const row = JSON.parse(line);
        const index = actionIndex(row.action);
        if (index < 0 || !row.obs) continue;
        const obs = encodeObservation(row.obs);
        if (!obs.every(Number.isFinite) || obs.length !== contract.obsSize) continue;
        const dist = Number(row.obs.objective?.distance);
        if (Number.isFinite(dist)) {
            if (firstDist === null) firstDist = dist;
            maxProgress = Math.max(maxProgress, 1 - dist / Math.max(1, firstDist));
        }
        steps.push({
            type: 'step',
            obs,
            action: index,
            actionName: row.action,
            reward: Number.isFinite(row.reward) ? row.reward : 0,
            weight: 1,
            partial: false,
            mask: availableMask(row.obs?.availableActions),
            meta: row.meta ?? null,
        });
    }
    if (!steps.length) return null;
    const wonRaw = rawHeader.won === true;
    if (wonRaw) {
        for (const step of steps) step.weight = Number(step.weight || 1) * 2;
    }
    return {
        header: baseHeader({
            expert: rawHeader.expert ?? 'jev',
            partial: false,
            model: rawHeader.model ?? null,
            level: rawHeader.level ?? null,
            seed: rawHeader.seed ?? null,
            when: rawHeader.when ?? null,
            won: wonRaw,
            deaths: null,
            maxProgress,
            steps: steps.length,
            createdAt: new Date().toISOString(),
        }),
        steps,
    };
}

function writeEpisode(episode, tag, number) {
    const stamp = String(episode.header.when || 'nodate')
        .slice(0, 10)
        .replaceAll('-', '');
    const name =
        `demo-${stamp}-L${episode.header.level ?? 'x'}-s${episode.header.seed ?? 'x'}` +
        `-ep${String(number).padStart(2, '0')}` +
        `-${episode.header.won ? 'win' : 'unfinished'}-${tag}.jsonl`;
    const lines = [JSON.stringify(episode.header)];
    for (const step of episode.steps) lines.push(JSON.stringify(step));
    fs.writeFileSync(path.join(OUT_DIR, name), lines.join('\n') + '\n');
    return episode.steps.length;
}

function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const seen = new Set();
    let episodes = 0;
    let steps = 0;
    for (const reportPath of findFiles(JEV_DIR, 'jev-playtest-report.json')) {
        let key = reportPath;
        try {
            const probe = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            key = `${probe.when}|${probe.seed}|${probe.level}`;
        } catch {
            // Fall through to path-keyed dedupe.
        }
        if (seen.has(key)) continue;
        seen.add(key);
        const episode = convertReport(reportPath);
        if (!episode) continue;
        episodes += 1;
        steps += writeEpisode(episode, 'partial', episodes);
    }
    for (const rawPath of findFiles(RAW_DIR, /^jev-raw-.*\.jsonl$/)) {
        if (seen.has(rawPath)) continue;
        seen.add(rawPath);
        const episode = convertRaw(rawPath);
        if (!episode) continue;
        episodes += 1;
        steps += writeEpisode(episode, 'full', episodes);
    }
    console.log(`episodes=${episodes} steps=${steps} out=${OUT_DIR}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
