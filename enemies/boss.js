import { bossInitialState } from '../BossDirector.js';

export function spawn(builder, group, config) {
    const boss = group.create(config.x, config.y, config.key || 'broodmother');
    builder.tagTestEntity(boss, {
        kind: 'hazard',
        type: 'boss',
        bossName: config.bossName || 'Boss',
        phase: 'dormant',
        chargeRange: Math.round(((config.chargeSpeed ?? 420) * (config.chargeMs ?? 900)) / 1000),
        origin: { x: config.x, y: config.y },
    });
    boss.body.allowGravity = true;
    // Solid mass: trim the spike tips and jaw fringe with a centered
    // shrink. Never setOffset the body: in this Phaser version an
    // offset body tracks visually but static-deck separation never
    // engages, and the boss falls through its arena.
    const width = boss.displayWidth || 120;
    const height = boss.displayHeight || 84;
    boss.body.setSize(width * 0.85, height * 0.7, true);
    boss.setDepth(config.depth ?? 7);
    boss.setFlipX(true);
    boss.bossHp = config.hp ?? 14;
    boss.bossMaxHp = boss.bossHp;
    boss.bossName = config.bossName || 'Boss';
    boss.bossCrownGuard = config.crownGuard === true;
    boss.bossHomeX = config.x;
    boss.bossHomeY = config.y;
    boss.bossDefeated = false;
    boss.bossState = { ...bossInitialState(), enraged: false };
    boss.bossConfig = {
        triggerX: config.triggerX ?? 0,
        minX: config.minX ?? config.x - 200,
        maxX: config.maxX ?? config.x + 200,
        paceSpeed: config.paceSpeed ?? 60,
        telegraphMs: config.telegraphMs ?? 700,
        chargeSpeed: config.chargeSpeed ?? 420,
        chargeMs: config.chargeMs ?? 900,
        recoverMs: config.recoverMs ?? 800,
        initialAttackMs: config.initialAttackMs,
        cooldownMs: config.cooldownMs ?? 2600,
        enrageCooldownMs: config.enrageCooldownMs ?? 1600,
        enrageChargeMult: config.enrageChargeMult ?? 1.2,
        summon: config.summon ? { ...config.summon } : null,
        leap: config.leap ? { ...config.leap } : null,
    };
    builder.scene?.bossesGroup?.add?.(boss);
}
