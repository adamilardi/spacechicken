/**
 * GPU browser launcher for RL rollouts.
 *
 * Linux Chromium in WSL crashes in EGL/libd3d12core and silently falls back
 * to SwiftShader (~180ms/frame vs ~16ms/frame on a real GPU). So rollouts
 * launch native Windows Chrome with GPU and drive it from WSL over CDP.
 *
 * Escape hatch: SPACECHICKEN_SWIFTSHADER=1 explicitly allows slow Linux
 * --use-gl=swiftshader rendering.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const WIN_CHROME = '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe';
const WIN_CSC = '/mnt/c/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe';
const WIN_POWERSHELL = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const WIN_PUBLIC = '/mnt/c/Users/Public';
const RELAY_CS = `using System;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;
public class Relay {
    public static void Main(string[] args) {
        var listener = new TcpListener(IPAddress.Parse(args[0]), int.Parse(args[1]));
        listener.Start();
        Console.WriteLine("RELAY_UP");
        while (true) {
            var incoming = listener.AcceptTcpClient();
            int upstream = int.Parse(args[2]);
            Task.Run(() => Pipe(incoming, upstream));
        }
    }
    static void Pipe(TcpClient incoming, int upstream) {
        try {
            using (incoming)
            using (var remote = new TcpClient()) {
                remote.Connect("127.0.0.1", upstream);
                var a = incoming.GetStream();
                var b = remote.GetStream();
                var t1 = Task.Run(() => Copy(a, b));
                var t2 = Task.Run(() => Copy(b, a));
                Task.WaitAny(t1, t2);
            }
        } catch { }
    }
    static void Copy(NetworkStream src, NetworkStream dst) {
        try { src.CopyTo(dst); } catch { }
        try { dst.Close(); } catch { }
    }
}
`;

export function swiftshaderAllowed() {
    return process.env.SPACECHICKEN_SWIFTSHADER === '1' || process.env.NOVAWING_SWIFTSHADER === '1';
}

/**
 * @returns {string|undefined} path to a Linux chrome, or undefined to let Playwright pick
 */
export function resolveChromePath() {
    if (process.env.PLAYWRIGHT_CHROME && fs.existsSync(process.env.PLAYWRIGHT_CHROME)) {
        return process.env.PLAYWRIGHT_CHROME;
    }
    const cached = '/home/adam/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
    if (fs.existsSync(cached)) {
        return cached;
    }
    return undefined;
}

export function defaultHeadless() {
    return process.env.HEADLESS !== '0';
}

/**
 * @returns {import('playwright').LaunchOptions} Linux fallback (software rendering)
 */
export function defaultLaunchOptions(headless) {
    const opts = {
        headless: Boolean(headless),
        args: [
            '--use-gl=swiftshader',
            '--ignore-gpu-blocklist',
            '--no-sandbox',
            '--autoplay-policy=no-user-gesture-required',
        ],
    };
    const chrome = resolveChromePath();
    if (chrome) opts.executablePath = chrome;
    return opts;
}

function wslHostIp() {
    try {
        const match = fs.readFileSync('/etc/resolv.conf', 'utf8').match(/nameserver\s+(\S+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

function windowsChromePath() {
    if (swiftshaderAllowed()) return null;
    const fromEnv = process.env.SPACECHICKEN_WIN_CHROME || process.env.NOVAWING_WIN_CHROME;
    if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
    if (fs.existsSync(WIN_CHROME) && fs.existsSync(WIN_CSC)) return WIN_CHROME;
    return null;
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
            req.destroy();
            reject(new Error('timeout'));
        });
    });
}

function run(file, args) {
    const child = spawn(file, args, { stdio: 'ignore' });
    child.on('error', (error) =>
        console.error(`[browser] ${path.basename(file)}: ${error.message}`)
    );
    return child;
}

function killToken(token) {
    return new Promise((resolve) => {
        if (!fs.existsSync(WIN_POWERSHELL)) {
            resolve();
            return;
        }
        const child = spawn(WIN_POWERSHELL, [
            '-NoProfile',
            '-Command',
            `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${token}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
        ]);
        const timer = setTimeout(() => resolve(), 8000);
        const done = () => {
            clearTimeout(timer);
            resolve();
        };
        child.on('exit', done);
        child.on('error', done);
    });
}

async function sweepStaleProfiles() {
    // Self-healing: a SIGKILLed rollout can't clean up, so each launch
    // reaps profiles whose owner PID is dead and that are old enough that
    // no healthy rollout could still own them (rollouts live < 3 minutes).
    let names;
    try {
        names = fs.readdirSync(WIN_PUBLIC);
    } catch {
        return;
    }
    const now = Date.now();
    for (const name of names) {
        const match = /^spacechicken-(sccdp(\d+)x(\d+))$/.exec(name);
        if (!match) continue;
        const [, token, pidText, bornText] = match;
        const pid = Number(pidText);
        if (!Number.isFinite(pid) || now - Number(bornText) < 10 * 60 * 1000) continue;
        try {
            process.kill(pid, 0);
            continue;
        } catch {
            // Owner dead: reap it.
        }
        await killToken(token);
        try {
            fs.rmSync(`${WIN_PUBLIC}/${name}`, { recursive: true, force: true });
            console.error(`[browser] reaped stale profile ${name}`);
        } catch {
            // A later launch retries.
        }
    }
}

async function removeProfile(token) {
    const dir = `${WIN_PUBLIC}/spacechicken-${token}`;
    // Windows keeps profile files locked briefly after the process exits;
    // retry before falling back to a Windows-side delete.
    for (let attempt = 0; attempt < 15; attempt++) {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
            return;
        } catch {
            // Still locked; wait and retry.
        }
        await new Promise((r) => setTimeout(r, 1500));
    }
    await new Promise((resolve) => {
        if (!fs.existsSync(WIN_POWERSHELL)) {
            resolve();
            return;
        }
        const child = spawn(WIN_POWERSHELL, [
            '-NoProfile',
            '-Command',
            `Remove-Item -Recurse -Force 'C:\\Users\\Public\\spacechicken-${token}' -ErrorAction SilentlyContinue`,
        ]);
        const timer = setTimeout(() => resolve(), 15000);
        const done = () => {
            clearTimeout(timer);
            resolve();
        };
        child.on('exit', done);
        child.on('error', done);
    });
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch {
        // Give up loudly so loop logs show the leak.
    }
    if (fs.existsSync(dir)) {
        console.error(`[browser] profile left behind: ${dir}`);
    }
}

async function stopWindowsChrome(token, children = []) {
    for (const child of children) {
        try {
            child.kill();
        } catch {
            // Already gone.
        }
    }
    await killToken(token);
    await removeProfile(token);
}

async function ensureRelay() {
    const exe = `${WIN_PUBLIC}/spacechicken-cdp-relay.exe`;
    const cs = `${WIN_PUBLIC}/spacechicken-cdp-relay.cs`;
    if (!fs.existsSync(exe)) {
        fs.mkdirSync(WIN_PUBLIC, { recursive: true });
        fs.writeFileSync(cs, RELAY_CS);
        await new Promise((resolve, reject) => {
            const child = spawn(
                WIN_CSC,
                [
                    '/nologo',
                    '/out:C:\\Users\\Public\\spacechicken-cdp-relay.exe',
                    'C:\\Users\\Public\\spacechicken-cdp-relay.cs',
                ],
                { stdio: 'ignore' }
            );
            child.on('exit', (code) =>
                code === 0 ? resolve() : reject(new Error(`csc exited ${code}`))
            );
            child.on('error', reject);
        });
    }
    return exe;
}

/**
 * Launch native Windows Chrome (GPU) and connect over CDP through a TCP
 * relay bound to the Windows vNIC IP, since the DevTools port is
 * loopback-only and WSL cannot dial it directly.
 * @returns {Promise<import('playwright').Browser|null>}
 */
async function tryWindowsChrome(chromium, headless, slowMo = 0) {
    const chromePath = windowsChromePath();
    const host = wslHostIp();
    if (!chromePath || !host) {
        console.error('[browser] winchrome skip', Boolean(chromePath), host);
        return null;
    }
    const token = `sccdp${process.pid}x${Date.now()}`;
    const chromePort = 20000 + Math.floor(Math.random() * 20000);
    const relayPort = chromePort + 1;
    const profile = `C:\\Users\\Public\\spacechicken-${token}`;
    let relayExe;
    try {
        relayExe = await ensureRelay();
    } catch (error) {
        console.error('[browser] winchrome relay', error);
        return null;
    }
    const args = [
        '--use-angle=d3d11',
        '--enable-gpu',
        '--ignore-gpu-blocklist',
        '--disable-gpu-vsync',
        '--disable-frame-rate-limit',
        '--no-first-run',
        '--disable-extensions',
        '--mute-audio',
        '--autoplay-policy=no-user-gesture-required',
        `--remote-debugging-port=${chromePort}`,
        `--user-data-dir=${profile}`,
        'about:blank',
    ];
    if (headless) args.unshift('--headless=new');
    const chromeChild = run(chromePath, args);
    const relayChild = run(relayExe, [host, String(relayPort), String(chromePort), token]);
    const endpoint = `http://${host}:${relayPort}`;
    const deadline = Date.now() + 15000;
    let up = false;
    while (Date.now() < deadline) {
        try {
            const res = await httpGet(`${endpoint}/json/version`);
            if (res.status === 200 && res.body.includes('Browser')) {
                up = true;
                break;
            }
        } catch {
            // Chrome or the relay is still starting.
        }
        await new Promise((r) => setTimeout(r, 200));
    }
    const children = [chromeChild, relayChild];
    if (!up) {
        console.error('[browser] winchrome down', endpoint, token);
        await stopWindowsChrome(token, children);
        return null;
    }
    try {
        const browser = await chromium.connectOverCDP(endpoint, { slowMo });
        const close = browser.close.bind(browser);
        browser.close = async () => {
            try {
                await close();
            } catch {
                // Already disconnected.
            }
            await stopWindowsChrome(token, children);
        };
        return browser;
    } catch (error) {
        console.error('[browser] winchrome cdp', error);
        await stopWindowsChrome(token, children);
        return null;
    }
}

/**
 * Launch a browser for rollouts: Windows GPU Chrome over CDP when available,
 * failing fast if hardware WebGL is not actually present. Never silently
 * continues on SwiftShader.
 */
export async function launchBrowser(chromium, headless, { slowMo = 0, recordVideo = false } = {}) {
    await sweepStaleProfiles().catch(() => {});
    if (!recordVideo && windowsChromePath()) {
        const windows = await tryWindowsChrome(chromium, headless, slowMo);
        if (!windows) {
            throw new Error(
                'Windows GPU browser failed to start. Set SPACECHICKEN_SWIFTSHADER=1 to explicitly allow slow software rendering.'
            );
        }
        try {
            const page = await windows.contexts()[0].newPage();
            const renderer = await page.evaluate(() => {
                const gl = document.createElement('canvas').getContext('webgl');
                const ext = gl?.getExtension('WEBGL_debug_renderer_info');
                return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
            });
            await page.close();
            if (!renderer || /swiftshader|llvmpipe|software|basic render/i.test(renderer)) {
                throw new Error(`Hardware WebGL unavailable: ${renderer || 'no renderer'}`);
            }
            console.log(`[browser] Windows GPU: ${renderer}`);
            return windows;
        } catch (error) {
            await windows.close();
            throw error;
        }
    }
    console.warn(
        `[browser] Linux software rendering${recordVideo ? ' (video recording; disable for the Windows GPU)' : ''}`
    );
    return chromium.launch({ ...defaultLaunchOptions(headless), slowMo });
}
