import { GAME_CONSTANTS } from './Constants.js';
import { spawn as spawnBoarder } from './enemies/boarder.js';

// Boss fights: trigger, pace, telegraphed charge, recover, enrage.
// The state machine is pure (bossUpdate) so Node tests exercise the exact
// timing the game runs; the director applies its output to sprites.

export function bossSpeeds(config, hard) {
    const mults = GAME_CONSTANTS.HARD_MODE || {};
    const speedMult = hard ? mults.BOSS_SPEED_MULT || 1 : 1;
    const cooldownMult = hard ? mults.BOSS_COOLDOWN_MULT || 1 : 1;
    return {
        pace: (config.paceSpeed ?? 60) * speedMult,
        charge: (config.chargeSpeed ?? 420) * speedMult,
        cooldownMs: (config.cooldownMs ?? 2600) * cooldownMult,
        enrageCooldownMs: (config.enrageCooldownMs ?? 1600) * cooldownMult,
        enrageChargeMult: config.enrageChargeMult ?? 1.2,
    };
}

// Pure boss tick. state: { phase, phaseAt, nextAttackAt, dir, enraged }.
// x is the boss sprite's current x. Returns the next state plus the
// velocity to apply and events for banners, bar, and audio.
export function bossUpdate(state, now, x, targetX, leadX, config, hard, minionsAlive = 0) {
    const speeds = bossSpeeds(config, hard);
    const tune = {
        triggerX: config.triggerX ?? 0,
        minX: config.minX ?? x - 200,
        maxX: config.maxX ?? x + 200,
        telegraphMs: config.telegraphMs ?? 700,
        chargeMs: config.chargeMs ?? 900,
        recoverMs: config.recoverMs ?? 800,
        cooldownMs: state.enraged ? speeds.enrageCooldownMs : speeds.cooldownMs,
        chargeSpeed: state.enraged ? speeds.charge * speeds.enrageChargeMult : speeds.charge,
        paceSpeed: speeds.pace,
        leap: config.leap || null,
        leapMs: (config.leap?.ms ?? 520) * (state.enraged ? 0.75 : 1),
        leapDx: config.leap?.dx ?? 220,
        leapVelocityY: config.leap?.velocityY ?? 560,
        summon: config.summon || null,
        summonTellMs: config.summon?.tellMs ?? 600,
        summonIntervalMs: summonIntervalMs(config.summon, state.enraged === true, hard),
        summonDelayMs: config.summon?.initialDelayMs ?? 2500,
        initialAttackMs: config.initialAttackMs ?? Math.min(speeds.cooldownMs, 1200),
        minionsAlive,
    };
    if (state.phase === 'dormant') {
        return bossDormantStep(state, now, leadX, tune);
    }
    if (state.phase === 'pace') {
        return bossPaceStep(state, now, x, targetX, tune);
    }
    if (state.phase === 'telegraph') {
        return bossTelegraphStep(state, now, x, targetX, tune);
    }
    if (state.phase === 'charge') {
        return bossChargeStep(state, now, x, tune);
    }
    if (state.phase === 'leap') {
        return bossLeapStep(state, now, x, tune);
    }
    if (state.phase === 'summonTell') {
        return bossSummonStep(state, now, tune);
    }
    return bossRecoverStep(state, now, tune);
}

function bossDormantStep(state, now, leadX, tune) {
    if (leadX < tune.triggerX) {
        return { ...state, velocityX: 0, events: [] };
    }
    return {
        ...state,
        phase: 'pace',
        phaseAt: now,
        nextAttackAt: now + tune.initialAttackMs,
        nextSummonAt: tune.summon ? now + tune.summonDelayMs : state.nextSummonAt,
        velocityX: 0,
        events: ['trigger'],
    };
}

function bossPaceStep(state, now, x, targetX, tune) {
    // Off-pad challengers (still crossing the gap) get a held center,
    // not a camper on the landing: the fight starts on touchdown.
    const goal =
        targetX == null || targetX < tune.minX - 100 ? (tune.minX + tune.maxX) / 2 : targetX;
    let dir = Math.sign(goal - x) || state.dir || 1;
    if ((dir < 0 && x <= tune.minX) || (dir > 0 && x >= tune.maxX)) {
        dir = -dir;
    }
    if (
        tune.summon &&
        now >= (state.nextSummonAt || 0) &&
        tune.minionsAlive < (tune.summon.maxAlive ?? 2)
    ) {
        return {
            ...state,
            phase: 'summonTell',
            phaseAt: now,
            dir,
            velocityX: 0,
            events: ['summonTell'],
        };
    }
    if (now >= state.nextAttackAt) {
        return {
            ...state,
            phase: 'telegraph',
            phaseAt: now,
            dir,
            velocityX: 0,
            events: ['telegraph'],
        };
    }
    return { ...state, dir, velocityX: dir * tune.paceSpeed, events: [] };
}

function bossSummonStep(state, now, tune) {
    if (now - state.phaseAt < tune.summonTellMs) {
        return { ...state, velocityX: 0, events: [] };
    }
    return {
        ...state,
        phase: 'recover',
        phaseAt: now,
        nextSummonAt: now + tune.summonIntervalMs,
        velocityX: 0,
        events: ['summon', 'recover'],
    };
}

function bossTelegraphStep(state, now, x, targetX, tune) {
    if (now - state.phaseAt < tune.telegraphMs) {
        return { ...state, velocityX: 0, events: [] };
    }
    const dir = targetX == null ? state.dir : Math.sign(targetX - x) || state.dir || 1;
    if (tune.leap) {
        // Knight-leap: displace through the air in an L to a square chosen
        // at the telegraph. The director applies velocityY once on the
        // leap event; gravity flies the arc while velocityX carries the
        // horizontal leg. Positioning, not charge timing, is the answer.
        const leapTargetX = Math.min(tune.maxX, Math.max(tune.minX, x + dir * tune.leapDx));
        const leapVelocityX = (leapTargetX - x) / (tune.leapMs / 1000);
        return {
            ...state,
            phase: 'leap',
            phaseAt: now,
            dir,
            leapTargetX,
            leapVelocityX,
            velocityX: leapVelocityX,
            velocityY: -tune.leapVelocityY,
            events: ['leap'],
        };
    }
    return {
        ...state,
        phase: 'charge',
        phaseAt: now,
        dir,
        velocityX: dir * tune.chargeSpeed,
        events: ['charge'],
    };
}

function bossLeapStep(state, now, x, tune) {
    const target = state.leapTargetX ?? x;
    const passed = state.dir > 0 ? x >= target : x <= target;
    if (now - state.phaseAt < tune.leapMs && !passed) {
        return { ...state, velocityX: state.leapVelocityX || 0, events: [] };
    }
    return { ...state, phase: 'recover', phaseAt: now, velocityX: 0, events: ['recover'] };
}

function bossChargeStep(state, now, x, tune) {
    const out = x < tune.minX || x > tune.maxX;
    if (now - state.phaseAt < tune.chargeMs && !out) {
        return { ...state, velocityX: state.dir * tune.chargeSpeed, events: [] };
    }
    return { ...state, phase: 'recover', phaseAt: now, velocityX: 0, events: ['recover'] };
}

function bossRecoverStep(state, now, tune) {
    if (now - state.phaseAt < tune.recoverMs) {
        return { ...state, velocityX: 0, events: [] };
    }
    // Only a fired attack reschedules the clock: a summon-recover
    // must not push a due charge later, or summoners never charge.
    const fired = (state.nextAttackAt || 0) <= now;
    return {
        ...state,
        phase: 'pace',
        phaseAt: now,
        nextAttackAt: fired ? now + tune.cooldownMs : state.nextAttackAt,
        velocityX: 0,
        events: ['pace'],
    };
}

export function bossInitialState() {
    return {
        phase: 'dormant',
        phaseAt: 0,
        nextAttackAt: 0,
        nextSummonAt: 0,
        dir: -1,
        leapTargetX: 0,
        leapVelocityX: 0,
    };
}

export function summonIntervalMs(summon, enraged, hard) {
    if (!summon) {
        return Infinity;
    }
    const mults = GAME_CONSTANTS.HARD_MODE || {};
    let interval = summon.intervalMs ?? 7000;
    if (enraged) {
        interval *= 0.7;
    }
    if (hard) {
        interval *= mults.BOSS_COOLDOWN_MULT || 1;
    }
    return interval;
}

export class BossDirector {
    constructor(scene) {
        this.scene = scene;
    }

    bosses() {
        return this.scene?.bossesGroup?.getChildren?.() || [];
    }

    nearestChicken(boss) {
        const scene = this.scene;
        const chickens = [scene.player, scene.player2].filter(
            (chicken) => chicken?.active && chicken.body?.enable !== false
        );
        let best = null;
        let bestDist = Infinity;
        for (const chicken of chickens) {
            const dist = Math.abs(chicken.x - boss.x) + Math.abs(chicken.y - boss.y) / 2;
            if (dist < bestDist) {
                bestDist = dist;
                best = chicken;
            }
        }
        return best;
    }

    leadChickenX() {
        const scene = this.scene;
        const chickens = [scene.player, scene.player2];
        let lead = 0;
        for (const chicken of chickens) {
            if (chicken?.active && chicken.body?.enable !== false && chicken.x > lead) {
                lead = chicken.x;
            }
        }
        return lead;
    }

    updateBosses() {
        const scene = this.scene;
        if (!scene || scene.isTransitioning || scene.gameOver) {
            return;
        }
        const now = scene.getGameTime?.() ?? 0;
        const hard = scene.difficulty === 'hard';
        const leadX = this.leadChickenX();
        for (const boss of this.bosses()) {
            if (!boss?.active || boss.bossDefeated || !boss.bossState) {
                continue;
            }
            if (Number.isFinite(scene.killZoneFallY) && boss.y > scene.killZoneFallY - 40) {
                // Leash: a knock past the pad edge returns home, never dies to a pit.
                boss.x = boss.bossHomeX ?? boss.x;
                boss.y = boss.bossHomeY ?? boss.y;
                boss.setVelocity?.(0, 0);
                boss.bossState = { ...boss.bossState, phase: 'pace', phaseAt: now };
                continue;
            }
            const target = this.nearestChicken(boss);
            const out = bossUpdate(
                boss.bossState,
                now,
                boss.x,
                target ? target.x : null,
                leadX,
                boss.bossConfig || {},
                hard,
                this.countSummoned(boss)
            );
            boss.bossState = {
                phase: out.phase,
                phaseAt: out.phaseAt,
                nextAttackAt: out.nextAttackAt,
                nextSummonAt: out.nextSummonAt,
                dir: out.dir,
                leapTargetX: out.leapTargetX || 0,
                leapVelocityX: out.leapVelocityX || 0,
                enraged: boss.bossState.enraged === true,
            };
            boss.setVelocityX?.(out.velocityX);
            // velocityY is a one-shot impulse: state spread carries it on
            // later ticks, so apply it only on the leap event itself or
            // the boss re-launches every frame and never lands.
            if (out.events?.includes('leap') && Number.isFinite(out.velocityY)) {
                boss.setVelocityY?.(out.velocityY);
            }
            if (out.dir !== 0) {
                boss.setFlipX?.(out.dir > 0);
            }
            if (boss.testMeta) {
                boss.testMeta.phase = out.phase;
                boss.testMeta.nextChangeAt = this.nextChangeAt(out, now, boss.bossConfig || {});
            }
            for (const event of out.events) {
                this.onBossEvent(boss, event);
            }
        }
    }

    countSummoned(boss) {
        const children = this.scene?.boardersGroup?.getChildren?.() || [];
        let count = 0;
        for (const alien of children) {
            if (alien && alien.summonedBy === boss && !alien.defeated && alien.active) {
                count += 1;
            }
        }
        return count;
    }

    spawnSummoned(boss) {
        const scene = this.scene;
        const summon = boss.bossConfig?.summon;
        if (!summon || !scene?.boardersGroup || !scene?.worldBuilder) {
            return;
        }
        const now = scene.getGameTime?.() ?? 0;
        const spread = summon.spread ?? 90;
        const count = summon.count ?? 1;
        const lo = (boss.bossConfig?.minX ?? boss.x - 200) + 30;
        const hi = (boss.bossConfig?.maxX ?? boss.x + 200) - 30;
        for (let i = 0; i < count; i++) {
            let x = boss.x + (i % 2 === 0 ? -spread : spread);
            if (this.chickenNear(scene, x, 80)) {
                x = boss.x + (i % 2 === 0 ? spread : -spread);
            }
            // Adds spawn inside the arena, never over the pit past the
            // leash: a summon over the gap is bait off the edge.
            if (lo <= hi) {
                x = Math.min(hi, Math.max(lo, x));
            }
            const alien = spawnBoarder(scene.worldBuilder, scene.boardersGroup, {
                x,
                y: boss.y - 30,
                key: summon.key || 'boarder',
                wave: 1,
            });
            if (alien) {
                alien.summonedBy = boss;
                alien.spawnGraceUntil = now + 700;
            }
        }
        scene.audioManager?.playWaveSound?.();
    }

    chickenNear(scene, x, radius) {
        for (const chicken of [scene.player, scene.player2]) {
            if (chicken?.active && Math.abs(chicken.x - x) < radius) {
                return true;
            }
        }
        return false;
    }

    nextChangeAt(out, now, config) {
        if (out.phase === 'summonTell') return now + (config.summon?.tellMs ?? 600);
        if (out.phase === 'telegraph') return now + (config.telegraphMs ?? 700);
        if (out.phase === 'leap') return now + (config.leap?.ms ?? 520);
        if (out.phase === 'charge') return now + (config.chargeMs ?? 900);
        if (out.phase === 'recover') return now + (config.recoverMs ?? 800);
        if (out.phase === 'pace') return out.nextAttackAt;
        return null;
    }

    onBossEvent(boss, event) {
        const scene = this.scene;
        if (event === 'trigger') {
            scene.uiManager?.showBossBar?.(boss.bossName || 'Boss', boss.bossHp, boss.bossMaxHp);
            scene.uiManager?.showLevelBanner?.(
                (boss.bossName || 'Boss').toUpperCase(),
                'Dodge the charge — hold fire'
            );
            scene.audioManager?.playWaveSound?.();
        } else if (event === 'telegraph') {
            this.setBossCrouch(boss, true);
            boss.setTint?.(0xff5a4a);
            scene.audioManager?.playBoarderThud?.();
        } else if (event === 'charge') {
            this.setBossCrouch(boss, false);
            boss.clearTint?.();
            if (boss.bossState.enraged) {
                boss.setTint?.(0xc44dff);
            }
        } else if (event === 'leap') {
            this.setBossCrouch(boss, false);
            boss.clearTint?.();
            if (boss.bossState.enraged) {
                boss.setTint?.(0xc44dff);
            }
            scene.audioManager?.playJumpPuff?.();
        } else if (event === 'recover') {
            boss.clearTint?.();
            if (boss.bossState.enraged) {
                boss.setTint?.(0xc44dff);
            }
        } else if (event === 'summonTell') {
            boss.setTint?.(0xffd94a);
            scene.tweens?.add?.({
                targets: boss,
                scaleY: 1.12,
                duration: 150,
                yoyo: true,
                repeat: 3,
            });
        } else if (event === 'summon') {
            boss.clearTint?.();
            if (boss.bossState.enraged) {
                boss.setTint?.(0xc44dff);
            }
            this.setBossCrouch(boss, false);
            this.spawnSummoned(boss);
        }
    }

    setBossCrouch(boss, crouch) {
        const scene = this.scene;
        if (!boss || !scene?.tweens) {
            return;
        }
        scene.tweens.killTweensOf?.(boss);
        scene.tweens.add({
            targets: boss,
            scaleY: crouch ? 0.85 : 1,
            duration: 120,
        });
    }

    wireBosses(chicken) {
        const scene = this.scene;
        if (!chicken || !scene.bossesGroup) {
            return;
        }
        scene.physics.add.overlap(chicken, scene.bossesGroup, this.touchBoss, null, this);
    }

    touchBoss(_chicken, boss) {
        const scene = this.scene;
        if (scene.isTransitioning || scene.getGameTime() < (scene.boarderGraceUntil || 0)) {
            return;
        }
        if (!boss?.active || boss.bossDefeated || boss.body?.enable === false) {
            return;
        }
        if (boss.bossState?.phase === 'dormant') {
            return;
        }
        scene.failFromHazard('boarder');
    }

    damageBoss(boss) {
        const scene = this.scene;
        if (!boss?.active || boss.bossDefeated || boss.body?.enable === false) {
            return;
        }
        if (boss.bossState?.phase === 'dormant') {
            return;
        }
        boss.bossHp = Math.max(0, (boss.bossHp ?? 1) - 1);
        scene.uiManager?.updateBossBar?.(boss.bossHp, boss.bossMaxHp);
        boss.setTintFill?.(0xffffff);
        scene.time?.delayedCall?.(70, () => {
            if (!boss.bossDefeated) {
                boss.clearTint?.();
                if (boss.bossState?.enraged) {
                    boss.setTint?.(0xc44dff);
                }
            }
        });
        if (!boss.bossState.enraged && boss.bossHp <= boss.bossMaxHp / 2) {
            boss.bossState.enraged = true;
            boss.setTint?.(0xc44dff);
            scene.uiManager?.showLevelBanner?.('ENRAGED', 'Faster charges — keep moving');
        }
        if (boss.bossHp <= 0) {
            this.defeatBoss(boss);
        }
    }

    defeatBoss(boss) {
        const scene = this.scene;
        if (!boss || boss.bossDefeated) {
            return;
        }
        boss.bossDefeated = true;
        // Her summoned adds dissolve with her: left alive they chase the
        // post-kill crown walk (L15 trace: a warden ran the player down
        // mid-air after Highroost died). Wave boarders are untouched.
        this.dissolveSummons(boss);
        boss.setVelocity?.(0, 0);
        if (boss.body) {
            boss.body.enable = false;
        }
        scene.tweens?.killTweensOf?.(boss);
        boss.clearTint?.();
        scene.audioManager?.playBoarderPop?.();
        scene.effectsManager?.emitJumpPuff?.(boss.x, boss.y);
        scene.effectsManager?.collectBurst?.(boss.x, boss.y);
        scene.uiManager?.hideBossBar?.();
        scene.uiManager?.showLevelBanner?.(
            `${boss.bossName || 'Boss'} down`.toUpperCase(),
            'The crown is open'
        );
        scene.releaseCrownShieldIfCleared?.();
        scene.tweens?.add?.({
            targets: boss,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                boss.setActive?.(false);
                boss.setVisible?.(false);
            },
        });
    }

    dissolveSummons(boss) {
        const scene = this.scene;
        for (const alien of scene.boardersGroup?.getChildren?.() || []) {
            if (alien && alien.summonedBy === boss) {
                scene.effectsManager?.emitJumpPuff?.(alien.x, alien.y);
                scene.boardersGroup.remove(alien);
                alien.destroy?.();
            }
        }
    }

    resetBosses() {
        // Wounds stay: a live boss keeps its HP and goes dormant until the
        // player returns, and a kill stays a kill (the shield stays open).
        // Only position, state, and visuals reset for the next attempt.
        // Her summoned adds dissolve with the attempt: left alive they
        // reset to the arena unaggroed, then chase the re-approach down.
        const scene = this.scene;
        let guard = false;
        for (const boss of this.bosses()) {
            if (!boss || boss.bossDefeated) {
                continue;
            }
            this.dissolveSummons(boss);
            boss.bossState = { ...bossInitialState(), enraged: boss.bossHp <= boss.bossMaxHp / 2 };
            boss.setVelocity?.(0, 0);
            boss.setAlpha?.(1);
            boss.setScale?.(1, 1);
            boss.clearTint?.();
            if (boss.bossState.enraged) {
                boss.setTint?.(0xc44dff);
            }
            boss.setActive?.(true);
            boss.setVisible?.(true);
            if (boss.body) {
                boss.body.enable = true;
                boss.body.reset?.(boss.bossHomeX ?? boss.x, boss.bossHomeY ?? boss.y);
            }
            boss.x = boss.bossHomeX ?? boss.x;
            boss.y = boss.bossHomeY ?? boss.y;
            if (boss.testMeta) {
                boss.testMeta.phase = 'dormant';
                boss.testMeta.nextChangeAt = null;
            }
            if (boss.bossCrownGuard) {
                guard = true;
            }
        }
        scene.uiManager?.hideBossBar?.();
        if (guard && scene.levelConfig?.crownShield) {
            scene.armCrownShield?.();
        }
    }
}
