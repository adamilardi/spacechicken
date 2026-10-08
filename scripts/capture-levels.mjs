/**
 * Seeded level screenshot suite: title + levels + overlays, desktop and one
 * phone frame. Deterministic background layout (seeded Math.random) so two
 * runs diff cleanly with scripts/diff-shots.mjs.
 *
 *   node scripts/capture-levels.mjs [outdir]
 *   SHOTS_OUT=/tmp/shots-after node scripts/capture-levels.mjs
 *   SHOTS_LEVELS=4-7 SHOTS_MOBILE=0 node scripts/capture-levels.mjs /tmp/review
 *
 * Requires the game server (npm start) on SPACE_CHICKEN_URL.
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveChromeExecutable } from './chrome-path.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.SPACE_CHICKEN_URL || 'http://127.0.0.1:3000';
const output = process.argv[2] || process.env.SHOTS_OUT || join(root, '..', '.screenshots');
const SEED = Number(process.env.SHOTS_SEED || 123456789);
const WITH_MOBILE = process.env.SHOTS_MOBILE !== '0';
const WITH_OVERLAYS = process.env.SHOTS_OVERLAYS !== '0';
const failures = [];

function parseLevels(raw) {
    if (!raw) {
        return Array.from({ length: 16 }, (_, index) => index + 1);
    }
    const out = [];
    for (const part of raw.split(',')) {
        const range = part.split('-').map(Number);
        if (range.length === 1 && Number.isFinite(range[0])) {
            out.push(range[0]);
        } else if (range.length === 2 && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
            for (let level = range[0]; level <= range[1]; level++) {
                out.push(level);
            }
        }
    }
    return out.filter((level) => level >= 1 && level <= 16);
}

const LEVELS = parseLevels(process.env.SHOTS_LEVELS);

function seedScript(seed) {
    return `let __s = ${seed} >>> 0;
Math.random = () => {
    __s |= 0;
    __s = (__s + 0x6d2b79f5) | 0;
    let t = Math.imul(__s ^ (__s >>> 15), 1 | __s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};`;
}

async function shot(browser, name, { level = null, mobile = false } = {}) {
    const context = await browser.newContext({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
        hasTouch: mobile,
        isMobile: mobile,
    });
    await context.addInitScript(seedScript(SEED));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const url = new URL(BASE);
    if (level) {
        url.searchParams.set('level', String(level));
        url.searchParams.set('bot', 'graphics');
    }
    await page.goto(url.href);
    if (level) {
        await page.waitForFunction(() => window.__spaceChickenDebug?.ready());
    } else {
        await page.waitForFunction(
            () => window.SPACE_CHICKEN_GAME?.scene.getScenes(true)[0]?.awaitingStart
        );
    }
    if (level) {
        await page.evaluate(() => {
            const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
            scene.physics.world.pause();
        });
        // Settled frame: entrance fade + level banner fully gone.
        await page.waitForTimeout(6500);
    } else {
        await page.waitForTimeout(2400);
    }
    if (errors.length) {
        failures.push(`${name}: ${errors.join(' | ')}`);
        console.log(`ERRORS ${name}: ${errors.join(' | ')}`);
    }
    await page.screenshot({ path: join(output, `${name}.png`) });
    console.log(`shot ${name}`);
    await context.close();
}

async function overlayShot(browser, name, setupSource) {
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
    });
    await context.addInitScript(seedScript(SEED));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(new URL(BASE).href);
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME?.scene.getScenes(true)[0]?.awaitingStart
    );
    await page.waitForTimeout(2400);
    await page.evaluate(`(() => { ${setupSource} })()`);
    await page.waitForTimeout(1200);
    if (errors.length) {
        failures.push(`${name}: ${errors.join(' | ')}`);
        console.log(`ERRORS ${name}: ${errors.join(' | ')}`);
    }
    await page.screenshot({ path: join(output, `${name}.png`) });
    console.log(`shot ${name}`);
    await context.close();
}

const OVERLAYS = [
    [
        'title-leaderboard',
        'window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager.displayLeaderboard();',
    ],
    ['title-race', "document.getElementById('race-setup-button').click();"],
    [
        'title-branch',
        `window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].uiManager.showBranchChoice(
            [{ title: 'Rust Harbor', level: 13 }, { title: 'Ember Foundry', level: 14 }],
            () => {},
            'Two routes diverge.'
        );`,
    ],
];

async function main() {
    mkdirSync(output, { recursive: true });
    const executablePath = resolveChromeExecutable();
    if (!executablePath) {
        throw new Error('No cached Playwright chromium found; set PLAYWRIGHT_CHROME.');
    }
    const browser = await chromium.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox'],
    });
    try {
        await shot(browser, 'title-desktop');
        if (WITH_MOBILE) {
            await shot(browser, 'title-phone', { mobile: true });
        }
        if (WITH_OVERLAYS) {
            for (const [name, setup] of OVERLAYS) {
                await overlayShot(browser, name, setup);
            }
        }
        for (const level of LEVELS) {
            await shot(browser, `level-${level}`, { level });
        }
        if (WITH_MOBILE && LEVELS.includes(1)) {
            await shot(browser, 'level-1-phone', { level: 1, mobile: true });
        }
        console.log(`Screenshots: ${output}`);
    } finally {
        await browser.close();
    }
    if (failures.length) {
        console.error(`${failures.length} shot(s) had page errors`);
        process.exitCode = 1;
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
