// Reproducible observation-only review. Run from repository root with Node.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { buildPilotSource } from '../../../scripts/pilot-brain.mjs';
import { LEVEL_CONTENT, LEVEL_DEFINITIONS, NEWS_LEVEL_IDS } from '../../../levels/index.js';
import { analyseLevel, mechanicalFlags } from '../../../scripts/level-critic.mjs';
const require = createRequire(import.meta.url);
const { createServer } = require('../../../server.cjs');
const out = new URL(process.env.REVIEW_OUT || './evidence/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const server = createServer();
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
});
const analyses = Object.fromEntries(
    Object.keys(LEVEL_CONTENT).map((id) => [
        id,
        analyseLevel(LEVEL_CONTENT[id], LEVEL_DEFINITIONS[id]),
    ])
);
writeFileSync(
    out + 'mechanical.json',
    JSON.stringify(
        Object.fromEntries(
            NEWS_LEVEL_IDS.map((id) => [
                id,
                { analysis: analyses[id], flags: mechanicalFlags(analyses[id], analyses, id) },
            ])
        ),
        null,
        2
    )
);
async function run(id, mode) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.addInitScript(
        (mode) => localStorage.setItem('spaceChickenDifficulty', mode),
        mode
    );
    const page = await context.newPage();
    const result = {
        id,
        mode,
        outcome: 'timeout',
        errors: [],
        deaths: [],
        samples: [],
        shots: [],
        bonks: [],
        liftSamples: 0,
        maxRescues: 0,
    };
    page.on('pageerror', (e) => result.errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debug=1&level=${id}`);
    await page.waitForFunction(() => window.__spaceChickenDebug?.ready());
    await page.evaluate(() => {
        window.reviewBonks = [];
        const proto = Object.getPrototypeOf(window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0]);
        const old = proto.boostFromBonk;
        proto.boostFromBonk = function (p, h) {
            if (!h?.bonkLock) window.reviewBonks.push({ level: this.level, x: p.x, y: p.y });
            return old.call(this, p, h);
        };
    });
    await page.evaluate(buildPilotSource());
    const start = Date.now();
    let last = null;
    const shotBands = new Set();
    while (Date.now() - start < Math.max(130000, (LEVEL_DEFINITIONS[id].WORLD_WIDTH / 35) * 1000)) {
        const state = await page.evaluate(() => ({
            snap: window.__spaceChickenDebug.getBotSnapshot(),
            bonks: window.reviewBonks,
            mode: window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0]?.difficulty,
        }));
        const s = state.snap;
        result.actualMode = state.mode;
        result.bonks = state.bonks;
        if (s.level !== id) {
            result.outcome = 'crown-collected';
            result.nextLevel = s.level;
            break;
        }
        const sample = {
            t: +((Date.now() - start) / 1000).toFixed(2),
            x: Math.round(s.player.x),
            y: Math.round(s.player.y),
            deaths: s.deaths,
            rescues: s.rescues,
            grounded: s.player.grounded,
            transition: s.transitioning,
            deathKind: s.lastDeathKind,
        };
        result.samples.push(sample);
        result.maxRescues = Math.max(result.maxRescues, s.rescues || 0);
        if (last && s.deaths > last.deaths) result.deaths.push({ ...last, kind: s.lastDeathKind });
        if (
            s.player.grounded &&
            s.movingPlatforms.some(
                (p) =>
                    Math.abs(s.player.x - p.x) < p.w / 2 + 15 &&
                    Math.abs(s.player.y - (p.top ?? p.y - p.h / 2)) < 55
            )
        )
            result.liftSamples++;
        const band = Math.min(4, Math.floor((s.player.x / LEVEL_DEFINITIONS[id].CROWN_X) * 5));
        if (mode === 'normal' && !shotBands.has(band) && !s.transitioning) {
            const file = `level-${id}-${mode}-${band}.jpg`;
            await page.screenshot({ path: out + file, type: 'jpeg', quality: 85 });
            result.shots.push({ file, ...sample });
            shotBands.add(band);
        }
        last = sample;
        await page.waitForTimeout(200);
    }
    result.seconds = +((Date.now() - start) / 1000).toFixed(1);
    result.maxX = Math.max(...result.samples.map((s) => s.x));
    result.deathCount = last?.deaths;
    writeFileSync(out + `level-${id}-${mode}.json`, JSON.stringify(result, null, 2));
    console.log(
        JSON.stringify({
            id,
            mode,
            outcome: result.outcome,
            seconds: result.seconds,
            deaths: result.deathCount,
            bonks: result.bonks.length,
            rescues: result.maxRescues,
            liftSamples: result.liftSamples,
            maxX: result.maxX,
            errors: result.errors,
        })
    );
    await context.close();
}
try {
    await Promise.all(
        (process.env.REVIEW_MODES || 'normal,hard').split(',').map(async (mode) => {
            for (const id of process.env.REVIEW_LEVELS
                ? process.env.REVIEW_LEVELS.split(',').map(Number)
                : NEWS_LEVEL_IDS)
                await run(id, mode);
        })
    );
} finally {
    await browser.close();
    await new Promise((r) => server.close(r));
}
