/**
 * Shared Playwright browser resolution for repo scripts.
 *
 * The pinned playwright version expects a chromium revision that is not in
 * the local cache, so `chromium.launch()` with no executablePath fails with
 * "Executable doesn't exist". Probe the cache for a real binary instead,
 * newest revision first, full chrome before headless shell.
 */
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function revisionOf(name) {
    const match = /-(\d+)$/.exec(name);
    return match ? Number(match[1]) : -1;
}

export function resolveChromeExecutable() {
    const override = process.env.PLAYWRIGHT_CHROME;
    if (override) {
        return existsSync(override) ? override : undefined;
    }
    let entries = [];
    try {
        entries = readdirSync(join(homedir(), '.cache', 'ms-playwright'), {
            withFileTypes: true,
        });
    } catch (err) {
        return undefined;
    }
    const dirs = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => revisionOf(b) - revisionOf(a));
    const cache = join(homedir(), '.cache', 'ms-playwright');
    const layouts = [
        ['chrome-linux64', 'chrome'],
        ['chrome-linux', 'chrome'],
        ['chrome-headless-shell-linux64', 'chrome-headless-shell'],
        ['chrome-linux', 'headless_shell'],
    ];
    for (const dir of dirs) {
        if (!dir.startsWith('chromium')) {
            continue;
        }
        for (const [folder, binary] of layouts) {
            const candidate = join(cache, dir, folder, binary);
            if (existsSync(candidate)) {
                return candidate;
            }
        }
    }
    return undefined;
}
