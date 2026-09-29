import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const { createServer } = require('../server.cjs');
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const local = `http://127.0.0.1:${server.address().port}`;
const base = process.env.PERFORMANCE_PAGE_URL || `${local}/performance.html`;
const output = '/tmp/space-chicken-performance-page';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        bypassCSP: true,
        acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    const mutations = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
        if (request.method() !== 'GET') mutations.push(request.url());
    });
    await page.goto(base);
    await page.locator('#start').waitFor();
    await page.waitForFunction(() => !document.getElementById('start').disabled);
    await page.screenshot({ path: `${output}/setup-phone.png` });
    assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false
    );
    await page.locator('#device-label').fill('Chromium browser verification');
    await page.locator('#duration').selectOption('15000');
    await page.locator('#start').click();
    await page.waitForFunction(() => !document.getElementById('results').hidden, null, {
        timeout: 120000,
    });
    const report = JSON.parse(await page.locator('#report-text').inputValue());
    assert.equal(report.outcome, 'complete', JSON.stringify(report));
    assert.equal(report.scenarios.length, 3);
    assert.deepEqual(
        report.scenarios.map((item) => item.id),
        ['solo-level-3', 'solo-level-4', 'race-level-3']
    );
    for (const sample of report.scenarios) {
        assert.equal(sample.outcome, 'complete');
        assert.ok(sample.durationMs >= 15000);
        assert.ok(sample.frames.count >= 5);
        assert.equal(sample.frames.count, sample.frameIntervalsMs.length);
        assert.equal(sample.viewport.width, 390);
        assert.ok(sample.resourcesAfter.estimatedTextureMiB < 30);
    }
    assert.equal(report.scenarios[2].resourcesAfter.cameras, 3);
    assert.equal(report.methodology.scoresSubmitted, false);
    assert.deepEqual(mutations, []);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${output}/results-phone.png` });
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#download').click();
    const download = await downloadEvent;
    await download.saveAs(`${output}/download.json`);
    assert.ok(download.suggestedFilename().endsWith('.json'));
    // Stop and rotation preserve a labelled partial report; unsupported metrics stay null.
    await page.evaluate(() => {
        window.PerformanceObserver = undefined;
    });
    await page.locator('#again').click();
    await page.locator('#start').click();
    await page.waitForFunction(() =>
        document.getElementById('progress').textContent.includes('remaining')
    );
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForFunction(() => !document.getElementById('results').hidden);
    const interrupted = JSON.parse(await page.locator('#report-text').inputValue());
    assert.equal(interrupted.outcome, 'interrupted');
    assert.equal(interrupted.interruptions[0].reason, 'viewport-changed');
    assert.equal(interrupted.scenarios[0].outcome, 'interrupted');
    assert.equal(interrupted.scenarios[0].longTasks, null);
    await page.screenshot({ path: `${output}/results-landscape.png` });
    await page.locator('#again').click();
    await page.locator('#start').click();
    await page.locator('#stop').click();
    await page.waitForFunction(() => !document.getElementById('results').hidden);
    assert.equal(
        JSON.parse(await page.locator('#report-text').inputValue()).interruptions[0].reason,
        'cancelled'
    );
    await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
    console.log(
        `PASS performance page: scenarios, download, rotation, cancellation, unsupported APIs, no score submissions. ${output}`
    );
    await context.close();
} finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
}
