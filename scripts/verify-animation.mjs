import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const cachedChrome = join(homedir(), '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome');
const browser = await chromium.launch({
    executablePath:
        process.env.PLAYWRIGHT_CHROME || (existsSync(cachedChrome) ? cachedChrome : undefined),
    headless: true,
    args: ['--no-sandbox'],
});
try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(process.env.SPACE_CHICKEN_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME?.scene.getScenes(true)[0]?.awaitingStart
    );
    await page.keyboard.press('Space');
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].wasGrounded
    );
    await page.waitForTimeout(100);
    const state = () =>
        page.evaluate(() => {
            const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
            return {
                playing: scene.player.anims.isPlaying,
                animation: scene.player.anims.currentAnim?.key,
                texture: scene.player.texture.key,
                grounded: scene.wasGrounded,
                hitbox: [scene.player.body.sourceWidth, scene.player.body.sourceHeight],
            };
        });
    const idle = await state();
    assert.equal(idle.animation, 'chicken-idle', 'stationary chicken must stop walking');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(120);
    const walking = await state();
    assert.equal(walking.playing, true);
    assert.equal(walking.animation, 'chicken-walk');
    assert.deepEqual(walking.hitbox, idle.hitbox, 'walking must preserve collision dimensions');
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(100);
    assert.equal(
        (await state()).animation,
        'chicken-idle',
        'releasing movement must return to idle'
    );
    await page.evaluate(() => {
        const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
        window.animationFxCounts = { emitJumpPuff: 0, emitDust: 0 };
        for (const name of Object.keys(window.animationFxCounts)) {
            const original = scene.effectsManager[name].bind(scene.effectsManager);
            scene.effectsManager[name] = (...args) => {
                const particles = original(...args);
                window.animationFxCounts[name] += particles.length;
                return particles;
            };
        }
    });
    await page.keyboard.press('Space');
    await page.waitForFunction(
        () => !window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].wasGrounded
    );
    assert.equal((await state()).animation, 'chicken-jump');
    await page.waitForFunction(
        () => window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0].wasGrounded
    );
    await page.waitForFunction(() => {
        const scene = window.SPACE_CHICKEN_GAME.scene.getScenes(true)[0];
        return scene.wasGrounded && scene.player.anims.currentAnim?.key === 'chicken-idle';
    });
    const counts = await page.evaluate(() => window.animationFxCounts);
    assert.ok(counts.emitJumpPuff > 0, 'jump must emit particles');
    assert.ok(counts.emitDust > 0, 'landing must emit particles');
    assert.equal((await state()).animation, 'chicken-idle', 'landing must return to idle');
    assert.deepEqual(
        (await state()).hitbox,
        idle.hitbox,
        'jump and landing must preserve collision dimensions'
    );
    assert.deepEqual(errors, []);
    console.log(
        `PASS idle, walk, stop, jump, landing; particles ${JSON.stringify(counts)}; no page errors`
    );
} finally {
    await browser.close();
}
