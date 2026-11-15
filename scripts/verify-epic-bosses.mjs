import fs from 'node:fs';
import path from 'node:path';
import { FastSession } from './fast/session.mjs';

const arenas = !process.argv.includes('--routes');
const levels = process.env.LEVELS
    ? process.env.LEVELS.split(/\s+/).map(Number)
    : [8, 9, 10, 11, 12, 13, 14, 15, 16];
const approaches = {
    8: [10900, 480],
    9: [10700, 300],
    10: [11760, 190],
    11: [11430, 420],
    12: [11900, 250],
    13: [12300, 280],
    14: [12050, 380],
    15: [11850, 380],
    16: [9430, 380],
};
const output = '.bot-runs/epic-bosses';
fs.mkdirSync(output, { recursive: true });
const session = await new FastSession().open();
const results = [];
try {
    for (const level of levels) {
        await session.reset(level, 42, { pilot: true, draw: arenas });
        await session.page.evaluate(
            (approach) => {
                const scene = window.SPACE_CHICKEN_GAME.scene
                    .getScenes(true)
                    .find((item) => item.player);
                window.__epicEvents = [];
                const director = scene.bosses;
                const event = director.onBossEvent.bind(director);
                director.onBossEvent = (boss, name) => {
                    window.__epicEvents.push({
                        event: name,
                        phaseTwo: boss.bossState.enraged,
                        time: scene.getGameTime(),
                    });
                    return event(boss, name);
                };
                const shift = director.beginSecondPhase.bind(director);
                director.beginSecondPhase = (boss) => {
                    window.__epicEvents.push({
                        event: 'shift',
                        phaseTwo: true,
                        time: scene.getGameTime(),
                    });
                    return shift(boss);
                };
                if (approach) window.__spaceChickenDebug.teleport(...approach);
            },
            arenas ? approaches[level] : null
        );
        let status;
        let sample;
        let maxAdds = 0;
        const captured = new Set();
        while (!status?.won && (status?.ticks || 0) < 18000) {
            status = await session.page.evaluate(
                (count) => window.__spaceChickenFast.pilotBatch({ count }),
                arenas ? 15 : 300
            );
            session.checkErrors();
            sample = await session.page.evaluate(() => {
                const scene = window.SPACE_CHICKEN_GAME.scene
                    .getScenes(true)
                    .find((item) => item.player);
                const boss = scene.bossesGroup?.getChildren()[0];
                return {
                    events: window.__epicEvents,
                    phase: boss?.bossState?.phase,
                    phaseTwo: boss?.bossState?.enraged,
                    defeated: boss?.bossDefeated,
                    deaths: scene.deathCount,
                    adds: scene.bosses.countSummoned(boss),
                    awaitingBranch: scene.awaitingBranch,
                    name: boss?.bossName,
                };
            });
            maxAdds = Math.max(maxAdds, sample.adds);
            const beat = sample.defeated
                ? 'defeat'
                : sample.phase === 'shift'
                  ? 'phase-shift'
                  : sample.phaseTwo && ['leap', 'charge'].includes(sample.phase)
                    ? `phase-two-${sample.phase}`
                    : null;
            if (arenas && beat && !captured.has(beat)) {
                captured.add(beat);
                await session.page.screenshot({ path: path.join(output, `${level}-${beat}.png`) });
            }
            if (sample.awaitingBranch || (arenas && sample.defeated)) break;
        }
        const row = {
            level,
            mode: arenas ? 'arena approach' : 'full route',
            seed: 42,
            completed: arenas
                ? Boolean(sample.defeated)
                : Boolean(status.won || sample.awaitingBranch),
            deaths: sample.deaths,
            simulatedSeconds: Math.round(status.simulatedMs / 100) / 10,
            phaseTwoAttacks: sample.events
                .filter(
                    (entry) => entry.phaseTwo && ['charge', 'leap', 'summon'].includes(entry.event)
                )
                .map((entry) => entry.event),
            phases: [...new Set(sample.events.map((entry) => entry.event))],
            maxAdds,
            errors: session.errors,
            screenshots: [...captured].map((beat) => `${output}/${level}-${beat}.png`),
        };
        results.push(row);
        console.log(JSON.stringify(row));
        fs.writeFileSync(
            `docs/boss-builds/epic-${arenas ? 'arenas' : 'routes'}.json`,
            `${JSON.stringify(results, null, 4)}\n`
        );
    }
} finally {
    await session.close();
}
if (results.some((row) => !row.completed || row.errors.length || row.phaseTwoAttacks.length === 0))
    process.exitCode = 1;
