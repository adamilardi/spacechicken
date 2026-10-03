import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { GAME_CONSTANTS } from '../Constants.js';

const output = process.env.GRAPHICS_SCREENSHOT_DIR || '/tmp/space-chicken-graphics-after';
mkdirSync(output, { recursive: true });
const cachedChrome = join(homedir(), '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome');
const browser = await chromium.launch({
    executablePath:
        process.env.PLAYWRIGHT_CHROME || (existsSync(cachedChrome) ? cachedChrome : undefined),
    headless: true,
    args: ['--no-sandbox'],
});
try {
    for (const mobile of [false, true]) {
        for (const level of [1, 2, 3, 4, 5, 6, 7]) {
            const context = await browser.newContext({
                viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
                hasTouch: mobile,
                isMobile: mobile,
            });
            const page = await context.newPage();
            if (process.env.GRAPHICS_BASELINE === '1') {
                for (const file of ['SpriteFactory.js', 'BackgroundRenderer.js']) {
                    const body = execFileSync('git', ['show', `HEAD:${file}`], {
                        encoding: 'utf8',
                    });
                    await page.route(`**/${file}`, (route) =>
                        route.fulfill({ contentType: 'text/javascript', body })
                    );
                }
            }
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            const url = new URL(process.env.SPACE_CHICKEN_URL || 'http://127.0.0.1:3000');
            url.searchParams.set('level', level);
            url.searchParams.set('bot', 'graphics');
            await page.goto(url.href);
            await page.waitForFunction(() => window.__spaceChickenDebug?.ready());
            await page.evaluate(() => {
                const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
                // Keep the spawn scene stable while the entrance fade completes.
                scene.physics.world.pause();
            });
            await page.waitForTimeout(2400);
            const result = await page.evaluate(() => {
                const game = window.SPACE_CHICKEN_GAME;
                const scene = game.scene.getScenes(true)[0];
                const textures = game.textures.getTextureKeys().map((key) => {
                    const source = game.textures.get(key).source[0];
                    return { key, width: source.width, height: source.height };
                });
                return { level: scene.level, textures };
            });
            assert.equal(result.level, level);
            assert.ok(result.textures.length > 5, 'expected generated game textures');
            for (const texture of result.textures) {
                assert.ok(
                    texture.width > 0 && texture.height > 0,
                    `${texture.key} has empty dimensions`
                );
                if (texture.key.startsWith('space-chicken-bg-')) {
                    assert.ok(texture.width <= GAME_CONSTANTS.BACKGROUND_BAKE_MAX_WIDTH);
                    assert.ok(texture.height <= GAME_CONSTANTS.BACKGROUND_BAKE_MAX_HEIGHT);
                }
            }
            assert.ok(
                result.textures.some((texture) => texture.key.startsWith('space-chicken-bg-')),
                'background must bake successfully'
            );
            assert.deepEqual(errors, []);
            const name = `${mobile ? 'phone' : 'desktop'}-level-${level}`;
            await page.screenshot({ path: join(output, `${name}.png`) });
            console.log(`PASS ${name}: render, textures, capped background, no page errors`);
            await context.close();
        }
    }
    console.log(`Screenshots: ${output}`);
} finally {
    await browser.close();
}
