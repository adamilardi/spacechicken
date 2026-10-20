import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { defaultLaunchOptions } from '../rl/chrome.mjs';
import { buildPilotSource } from '../pilot-brain.mjs';
import { ACTION_NAMES } from '../rl/features.mjs';
import { installFastRuntime } from './runtime.mjs';

const require = createRequire(import.meta.url);
const { createServer } = require('../../server.cjs');
const pilotSource = buildPilotSource();

// Keep the encoder/rewards identical to the Node runner. Only replace its
// filesystem-based contract loader; all exported functions remain unchanged.
export function browserPolicySources() {
    const source = readFileSync(new URL('../rl/features.mjs', import.meta.url), 'utf8');
    const marker = source.indexOf('export const ACTION_NAMES');
    if (marker < 0) throw Error('Cannot locate feature-module exports');
    const contract = JSON.parse(readFileSync(new URL('../../rl/contract.json', import.meta.url)));
    return {
        features: `const contract = ${JSON.stringify(contract)};\nconst GAME_TEST_ACTIONS = ${JSON.stringify(ACTION_NAMES)};\n${source.slice(marker)}`,
        inference: readFileSync(new URL('../rl/policy-infer.mjs', import.meta.url), 'utf8'),
    };
}

export class FastSession {
    async open() {
        try {
            this.server = createServer();
            await new Promise((resolve, reject) => {
                this.server.once('error', reject);
                this.server.listen(0, '127.0.0.1', resolve);
            });
            this.baseURL = `http://127.0.0.1:${this.server.address().port}/`;
            this.browser = await chromium.launch(defaultLaunchOptions(true));
            return this;
        } catch (error) {
            await this.close();
            throw error;
        }
    }
    async reset(level, seed, { draw = false, pilot = false } = {}) {
        if (this.level !== level || !this.page) {
            await this.context?.close();
            this.context = await this.browser.newContext({ viewport: { width: 800, height: 450 } });
            this.page = await this.context.newPage();
            this.errors = [];
            this.policyLoaded = false;
            this.page.on('pageerror', (error) => this.errors.push(error.message));
            await this.page.route('**/GameConfig.js', async (route) => {
                const response = await route.fetch();
                const source = await response.text();
                if (!source.includes('type: resolveRendererType(),'))
                    throw Error('Game config changed');
                await route.fulfill({
                    response,
                    body: source.replace(
                        'type: resolveRendererType(),',
                        'type: Phaser.CANVAS, audio: { noAudio: true },'
                    ),
                });
            });
            await this.page.goto(
                `${this.baseURL}?bot=1&level=${level}&seed=${seed}&renderer=canvas`
            );
            await this.page.waitForFunction(() => window.__spaceChickenDebug?.ready(), null, {
                timeout: 25000,
            });
            await installFastRuntime(this.page);
            await this.page.evaluate(async (sources) => {
                async function load(source) {
                    const url = URL.createObjectURL(
                        new Blob([source], { type: 'text/javascript' })
                    );
                    try {
                        return await import(url);
                    } finally {
                        URL.revokeObjectURL(url);
                    }
                }
                window.__spaceChickenPolicyModules = {
                    features: await load(sources.features),
                    inference: await load(sources.inference),
                };
            }, browserPolicySources());
            this.level = level;
        }
        this.checkErrors();
        await this.page.evaluate((options) => window.__spaceChickenFast.reset(options), {
            seed,
            draw,
        });
        if (pilot) await this.page.evaluate(pilotSource);
    }
    async configurePolicy(options) {
        const payload = { ...options };
        if (this.policyLoaded) delete payload.weights;
        // JSON avoids CDP's per-number object marshalling for large weight arrays.
        await this.page.evaluate((json) => {
            const options = JSON.parse(json);
            if (options.weights) window.__spaceChickenFastWeights = options.weights;
            options.weights = window.__spaceChickenFastWeights;
            window.__spaceChickenFast.configurePolicy(options);
        }, JSON.stringify(payload));
        this.policyLoaded = true;
    }
    checkErrors() {
        if (this.errors?.length) throw Error(this.errors.join('\n'));
    }
    async close() {
        await this.browser?.close();
        if (this.server?.listening) await new Promise((resolve) => this.server.close(resolve));
    }
}
