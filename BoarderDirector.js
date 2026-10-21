import { GAME_CONSTANTS } from './Constants.js';
import { boarderGroundMove } from './BoarderNavigation.js';
import { boarderEntryY, boarderSteering, boarderYields, nextBoarderWave } from './GameUtils.js';

// Alien boarders: spawning waves, steering, aggro, defeat. Mutable game state
// (groups, players, managers) lives on the scene; the director owns only its
// hot-loop scratch buffers, reused every frame so the update allocates
// nothing.
export function crownGuardsDefeated(boardersGroup, bossesGroup) {
    const guards = (boardersGroup?.getChildren?.() || []).some(
        (boarder) => boarder.crownGuard && !boarder.defeated
    );
    const bossGuards = (bossesGroup?.getChildren?.() || []).some(
        (boss) => boss.bossCrownGuard && !boss.bossDefeated
    );
    return !guards && !bossGuards;
}

// Boss summons hold the arena: pin runaways to the leash (60px past
// the boss bounds, matching the aggro drop) and kill outward drift.
// Dropping aggro alone leaks — momentum and home-walks carried L15
// summons 180px past the leash into the lift zone, where they met the
// re-approach head-on below the bolt lane (L15 trace).
export function clampSummonToArena(alien) {
    const cfg = alien?.summonedBy?.bossConfig;
    if (!alien || !cfg) {
        return;
    }
    const lo = (cfg.minX ?? alien.x) - 60;
    const hi = (cfg.maxX ?? alien.x) + 60;
    const vx = alien.body?.velocity?.x ?? 0;
    if (alien.x < lo) {
        alien.x = lo;
        if (vx < 0) {
            alien.setVelocityX?.(0);
        }
        alien.airVelocityX = 0;
    } else if (alien.x > hi) {
        alien.x = hi;
        if (vx > 0) {
            alien.setVelocityX?.(0);
        }
        alien.airVelocityX = 0;
    }
}

export class BoarderDirector {
    constructor(scene) {
        this.scene = scene;
        // Reused every frame by updateBoarders so the hot loop allocates nothing.
        this.boarderTargets = [];
        this.boarderAllies = [];
        this.boarderDecks = [];
        this.boarderOptions = {
            speed: GAME_CONSTANTS.BOARDER_SPEED,
            hopVelocity: GAME_CONSTANTS.BOARDER_HOP_VELOCITY_Y,
            hopRange: GAME_CONSTANTS.BOARDER_HOP_RANGE_X,
            hopClearance: GAME_CONSTANTS.BOARDER_HOP_CLEARANCE,
            aggroX: GAME_CONSTANTS.BOARDER_AGGRO_X,
            aggroY: GAME_CONSTANTS.BOARDER_AGGRO_Y,
        };
    }

    liveBoarderCount() {
        const aliens = this.scene.boardersGroup?.getChildren?.() || [];
        let live = 0;
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (alien?.active && !alien.defeated && alien.arrived) {
                live += 1;
            }
        }
        return live;
    }

    wireBoarders(chicken) {
        const scene = this.scene;
        if (!chicken || !scene.boardersGroup) {
            return;
        }
        scene.physics.add.overlap(chicken, scene.boardersGroup, this.touchBoarder, null, this);
    }

    defeatBoarder(alien) {
        const scene = this.scene;
        if (!alien?.active || alien.defeated) {
            return;
        }
        alien.defeated = true;
        alien.aggro = false;
        alien.airVelocityX = 0;
        alien.noticeUntil = 0;
        alien.alertUntil = 0;
        alien.clearTint?.();
        if (alien.body) {
            alien.body.enable = false;
        }
        alien.setVelocity?.(0, 0);
        scene.audioManager?.playBoarderPop?.();
        scene.effectsManager?.emitJumpPuff?.(alien.x, alien.y);
        scene.releaseCrownShieldIfCleared?.();
        scene.effectsManager?.emitJumpPuff?.(alien.x, alien.y);
        scene.tweens?.add?.({
            targets: alien,
            alpha: 0,
            duration: 140,
            onComplete: () => {
                alien.setActive?.(false);
                alien.setVisible?.(false);
            },
        });
    }

    touchBoarder(_chicken, alien) {
        const scene = this.scene;
        if (scene.isTransitioning || scene.getGameTime() < (scene.boarderGraceUntil || 0)) {
            return;
        }
        if (
            Number.isFinite(alien?.spawnGraceUntil) &&
            scene.getGameTime() < alien.spawnGraceUntil
        ) {
            return;
        }
        if (alien?.body && alien.body.enable === false) {
            return;
        }
        scene.failFromHazard('boarder');
    }

    holdDisarmedBoarders() {
        const scene = this.scene;
        if (!scene.boardersDisarmed) {
            return false;
        }
        if (scene.getGameTime() < (scene.boarderGraceUntil || 0)) {
            this.resetBoarders();
            return true;
        }
        this.armBoarders();
        return false;
    }

    updateBoarders() {
        const scene = this.scene;
        const hard = scene?.difficulty === 'hard';
        const mults = GAME_CONSTANTS.HARD_MODE || {};
        this.boarderOptions.speed = hard
            ? GAME_CONSTANTS.BOARDER_SPEED * mults.BOARDER_SPEED_MULT
            : GAME_CONSTANTS.BOARDER_SPEED;
        this.boarderOptions.aggroX = hard
            ? GAME_CONSTANTS.BOARDER_AGGRO_X * (mults.BOARDER_AGGRO_MULT || 1)
            : GAME_CONSTANTS.BOARDER_AGGRO_X;
        this.boarderOptions.aggroY = hard
            ? GAME_CONSTANTS.BOARDER_AGGRO_Y * (mults.BOARDER_AGGRO_MULT || 1)
            : GAME_CONSTANTS.BOARDER_AGGRO_Y;
        if (this.holdDisarmedBoarders()) {
            return;
        }
        this.updateBoarderWaves();
        const aliens = scene.boardersGroup?.getChildren?.() || [];
        if (!aliens.length) {
            return;
        }
        const targets = this.boarderTargets;
        targets.length = 0;
        if (scene.player?.active && scene.player.body?.enable !== false) {
            targets.push(scene.player);
        }
        if (scene.player2?.active && scene.player2.body?.enable !== false) {
            targets.push(scene.player2);
        }
        const options = this.boarderOptions;
        const decks = this.boarderDecks;
        decks.length = 0;
        for (const platform of scene.platforms?.getChildren?.() || []) {
            if (platform.body?.enable !== false && platform.body) decks.push(platform.body);
        }
        const allies = this.boarderAllies;
        allies.length = 0;
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (alien?.active && !alien.defeated) {
                allies.push(alien);
            }
        }
        this.spreadPackAlert(allies);
        for (let i = 0; i < aliens.length; i++) {
            this.stepBoarder(aliens[i], targets, allies, options);
        }
    }

    // A boarder that sees a pack-mate fighting joins the rush instead of
    // standing idle next to a fight. The latch survives the frames between
    // the alert and real aggro range so the joiner does not flicker.
    spreadPackAlert(allies) {
        const now = this.scene.getGameTime?.() || 0;
        for (let i = 0; i < allies.length; i++) {
            const alien = allies[i];
            if (!alien || alien.aggro || !alien.arrived) {
                continue;
            }
            for (let j = 0; j < allies.length; j++) {
                const ally = allies[j];
                if (ally === alien || !ally?.aggro) {
                    continue;
                }
                if (
                    Math.abs(ally.x - alien.x) <= GAME_CONSTANTS.BOARDER_PACK_ALERT_X &&
                    Math.abs(ally.y - alien.y) <= GAME_CONSTANTS.BOARDER_PACK_ALERT_Y
                ) {
                    alien.aggro = true;
                    alien.alertUntil = now + GAME_CONSTANTS.BOARDER_PACK_ALERT_LATCH_MS;
                    alien.noticeUntil = now + 180;
                    this.showBoarderAggro(alien);
                    break;
                }
            }
        }
    }

    stepBoarder(alien, targets, allies, options) {
        if (!alien?.active || alien.defeated) {
            return;
        }
        if (alien.y > this.scene.killZoneFallY) {
            this.defeatBoarder(alien);
            return;
        }
        clampSummonToArena(alien);
        const homeX = alien.homeX ?? alien.x;
        const homeY = alien.homeY ?? alien.y;
        let target = null;
        let best = Infinity;
        for (let t = 0; t < targets.length; t++) {
            const chicken = targets[t];
            const dist = Math.abs(chicken.x - alien.x) + Math.abs(chicken.y - alien.y);
            if (dist < best) {
                best = dist;
                target = chicken;
            }
        }
        const grounded = Boolean(alien.body?.blocked?.down || alien.body?.touching?.down);
        const targetGrounded = Boolean(
            target && (target.body?.blocked?.down || target.body?.touching?.down)
        );
        this.updateBoarderAggro(alien, target, homeX, homeY, options);
        // Idle boarders mill around home instead of standing still. The
        // patrol goal flows through the same terrain-safe move as a chase.
        const idleGoalX = alien.aggro ? homeX : this.patrolHomeX(homeX);
        const steer = boarderSteering(
            alien.x,
            alien.y,
            target ? target.x : homeX,
            target ? target.y : homeY,
            grounded,
            {
                ...options,
                homeX: idleGoalX,
                homeY,
                targetGrounded,
                engaged: alien.aggro,
            }
        );
        const move = this.terrainMove(alien, steer, grounded, options);
        const reacting = (this.scene.getGameTime?.() || 0) < (alien.noticeUntil || 0);
        const others = [];
        for (let a = 0; a < allies.length; a++) {
            if (allies[a] !== alien) {
                others.push(allies[a]);
            }
        }
        const yields = boarderYields(
            alien.x,
            alien.y,
            steer.goalX,
            others,
            GAME_CONSTANTS.BOARDER_SEPARATION
        );
        // Trailers slow to hold spacing but keep pressing: only the notice
        // flinch ever fully stops a boarder, so packs never stand around.
        alien.setVelocityX?.(this.chaseVelocityX(move, yields, grounded, reacting));
        if (!reacting && move.velocityY != null) {
            alien.setVelocityY?.(move.velocityY);
        }
        if (steer.flipX != null) {
            alien.setFlipX?.(steer.flipX);
        }
    }

    chaseVelocityX(move, yields, grounded, reacting) {
        if (reacting) {
            return 0;
        }
        if (grounded && yields) {
            return move.velocityX * GAME_CONSTANTS.BOARDER_YIELD_SLOW;
        }
        return move.velocityX;
    }

    // Idle patrol anchor: sweeps around home on a phase derived from
    // home, so pack-mates mill out of step without any per-boarder state.
    patrolHomeX(homeX) {
        const range = GAME_CONSTANTS.BOARDER_PATROL_RANGE_X;
        const period = GAME_CONSTANTS.BOARDER_PATROL_PERIOD_MS;
        if (!range || !period) {
            return homeX;
        }
        const now = this.scene.getGameTime?.() || 0;
        return homeX + Math.sin((now / period) * Math.PI * 2 + homeX * 0.05) * range;
    }

    terrainMove(alien, steer, grounded, options) {
        let move = steer;
        if (this.boarderDecks.length && alien.body) {
            if (grounded) {
                move = boarderGroundMove(
                    alien.body,
                    { x: steer.goalX, y: steer.goalY },
                    this.boarderDecks,
                    {
                        ...options,
                        gravity: this.scene.levelConfig?.gravity,
                        stayOnDeck: alien.crownGuard,
                    }
                );
                alien.airVelocityX = move.velocityX;
            } else {
                // Keep the takeoff direction instead of homing onto jumping players.
                move = { velocityX: alien.airVelocityX ?? 0, velocityY: null };
            }
        }
        return move;
    }

    updateBoarderAggro(alien, target, _homeX, _homeY, options) {
        // Boss summons hold the arena: past the leash they drop the
        // chase and walk home instead of hunting the re-approach.
        if (alien?.summonedBy) {
            const cfg = alien.summonedBy.bossConfig || {};
            const lo = (cfg.minX ?? alien.x) - 60;
            const hi = (cfg.maxX ?? alien.x) + 60;
            if (alien.x < lo || alien.x > hi) {
                alien.aggro = false;
                return;
            }
        }
        const summoned = Boolean(alien?.summonedBy);
        const aggroX = alien.aggro
            ? summoned
                ? 260
                : 620
            : (options?.aggroX ?? 280) + (summoned ? 0 : 100);
        const aggroY = alien.aggro ? 320 : (options?.aggroY ?? 260);
        const now = this.scene.getGameTime?.() || 0;
        const alertActive = (alien.alertUntil || 0) > now;
        const inAggro =
            alertActive ||
            Boolean(
                target &&
                Math.abs(target.x - alien.x) <= aggroX &&
                Math.abs(target.y - alien.y) <= aggroY
            );
        if (inAggro && !alien.aggro) {
            alien.aggro = true;
            alien.noticeUntil = (this.scene.getGameTime?.() || 0) + 180;
            this.showBoarderAggro(alien);
        } else if (!inAggro && alien.aggro) {
            alien.aggro = false;
        }
    }

    showBoarderAggro(alien) {
        const scene = this.scene;
        if (!alien) {
            return;
        }
        scene.effectsManager?.emitAggroTell?.(alien.x, alien.y);
        if (typeof alien.setTint === 'function') {
            alien.setTint(0xff8a8a);
            scene.time?.delayedCall?.(GAME_CONSTANTS.BOARDER_AGGRO_FLASH_MS, () => {
                if (alien?.active && !alien.defeated) {
                    alien.clearTint?.();
                }
            });
        }
        if (alien.scaleX != null && scene.tweens?.add) {
            const baseX = alien.bonkScaleX ?? alien.scaleX ?? 1;
            const baseY = alien.bonkScaleY ?? alien.scaleY ?? 1;
            scene.tweens.add({
                targets: alien,
                scaleX: baseX * 1.18,
                scaleY: baseY * 1.18,
                duration: 110,
                yoyo: true,
                ease: 'Quad.easeOut',
                onComplete: () => alien.setScale?.(baseX, baseY),
            });
        }
    }

    parkBoardersWhileDying() {
        const scene = this.scene;
        if (scene.deathResetEvent || scene.deathResetWall) {
            this.resetBoarders();
        }
    }

    haltBoarders() {
        const aliens = this.scene.boardersGroup?.getChildren?.() || [];
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (!alien?.active || alien.defeated) {
                continue;
            }
            alien.setVelocity?.(0, 0);
        }
    }

    boarderHome(alien) {
        const origin = alien?.testMeta?.origin;
        const x = alien?.homeX ?? origin?.x;
        const y = alien?.homeY ?? origin?.y;
        if (x == null || y == null) {
            return null;
        }
        return { x, y };
    }

    boarderWaveNumber(alien) {
        const wave = Number(alien?.wave ?? alien?.testMeta?.wave);
        return wave > 1 ? wave : 1;
    }

    leadChickenX() {
        const scene = this.scene;
        const chickens = [scene.player, scene.player2];
        let lead = 0;
        for (let i = 0; i < chickens.length; i++) {
            const chicken = chickens[i];
            if (!chicken?.active || chicken.body?.enable === false) {
                continue;
            }
            if (chicken.x > lead) {
                lead = chicken.x;
            }
        }
        return lead;
    }

    updateBoarderWaves() {
        const scene = this.scene;
        const next = nextBoarderWave(
            scene.boarderWave || 1,
            this.leadChickenX(),
            scene.levelConfig?.boarderWaves || GAME_CONSTANTS.BOARDER_WAVES
        );
        if (next <= (scene.boarderWave || 1)) {
            return;
        }
        let released = 0;
        for (let wave = (scene.boarderWave || 1) + 1; wave <= next; wave++) {
            released += this.releaseBoarderWave(wave);
        }
        scene.boarderWave = next;
        if (released === 0) {
            return;
        }
        scene.uiManager?.showLevelBanner?.(`WAVE ${next}`, 'Aliens dropping in');
        scene.audioManager?.playWaveSound?.();
        scene.audioManager?.duckMusic?.(160);
    }

    releaseBoarderWave(wave) {
        const scene = this.scene;
        const aliens = scene.boardersGroup?.getChildren?.() || [];
        let released = 0;
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (
                !alien ||
                alien.defeated ||
                alien.arrived ||
                this.boarderWaveNumber(alien) !== wave
            ) {
                continue;
            }
            const home = this.boarderHome(alien);
            if (!home) {
                continue;
            }
            let dropY = boarderEntryY(home.x, home.y);
            // Drop into the authored lane, never onto a catwalk above it.
            for (const platform of scene.platforms?.getChildren?.() || []) {
                const body = platform.body;
                if (
                    body &&
                    home.x + 11 > body.left &&
                    home.x - 11 < body.right &&
                    body.bottom <= home.y - 18
                ) {
                    dropY = Math.max(dropY, body.bottom + 20);
                }
            }
            alien.homeX = home.x;
            alien.homeY = home.y;
            alien.arrived = true;
            alien.defeated = false;
            alien.aggro = false;
            alien.airVelocityX = 0;
            alien.noticeUntil = 0;
            alien.alertUntil = 0;
            alien.clearTint?.();
            alien.setActive?.(true);
            alien.setVisible?.(true);
            alien.setAlpha?.(1);
            if (alien.body?.reset) {
                alien.body.reset(home.x, dropY);
            }
            alien.x = home.x;
            alien.y = dropY;
            alien.setVelocity?.(0, 0);
            if (alien.body) {
                alien.body.enable = true;
            }
            released++;
        }
        return released;
    }

    stowBoarder(alien) {
        const home = this.boarderHome(alien);
        alien.arrived = false;
        alien.defeated = false;
        alien.aggro = false;
        alien.airVelocityX = 0;
        alien.noticeUntil = 0;
        alien.alertUntil = 0;
        alien.clearTint?.();
        alien.setActive?.(false);
        alien.setVisible?.(false);
        alien.setAlpha?.(1);
        alien.setVelocity?.(0, 0);
        if (home) {
            alien.homeX = home.x;
            alien.homeY = home.y;
            if (alien.body?.reset) {
                alien.body.reset(home.x, home.y);
            }
            alien.x = home.x;
            alien.y = home.y;
        }
        if (alien.body) {
            alien.body.enable = false;
        }
    }

    resetBoarders() {
        const scene = this.scene;
        const aliens = scene.boardersGroup?.getChildren?.() || [];
        // Restore the checkpoint's encounter before the player resumes. Releasing
        // old waves afterwards drops enemies onto a player already running ahead.
        const activeWave = nextBoarderWave(
            scene.boarderWave || 1,
            scene.respawnPoint?.x || 0,
            scene.levelConfig?.boarderWaves || GAME_CONSTANTS.BOARDER_WAVES
        );
        scene.boarderWave = activeWave;
        let parked = false;
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (!alien) {
                continue;
            }
            // Checkpoint retries keep earned kills, including enemies behind us.
            if (alien.defeated && scene.level >= 8 && scene.respawnPoint) {
                continue;
            }
            const home = this.boarderHome(alien);
            if (!home) {
                continue;
            }
            if (this.boarderWaveNumber(alien) > activeWave) {
                this.stowBoarder(alien);
                continue;
            }
            alien.homeX = home.x;
            alien.homeY = home.y;
            alien.arrived = true;
            alien.defeated = false;
            alien.aggro = false;
            alien.airVelocityX = 0;
            alien.noticeUntil = 0;
            alien.alertUntil = 0;
            alien.clearTint?.();
            alien.setActive?.(true);
            alien.setVisible?.(true);
            alien.setAlpha?.(1);
            const restY = this.boarderRestY(home);
            if (alien.body?.reset) {
                alien.body.reset(home.x, restY);
            }
            alien.x = home.x;
            alien.y = restY;
            alien.setVelocity?.(0, 0);
            if (alien.body) {
                alien.body.enable = false;
            }
            parked = true;
        }
        if (scene.levelConfig?.crownShield && aliens.some((a) => a.crownGuard && !a.defeated)) {
            scene.armCrownShield?.();
        }
        if (parked) {
            scene.boardersDisarmed = true;
        }
    }

    boarderRestY(home) {
        let top = Infinity;
        for (const platform of this.scene.platforms?.getChildren?.() || []) {
            const body = platform.body;
            if (body && home.x >= body.left && home.x <= body.right && body.top >= home.y + 18) {
                top = Math.min(top, body.top);
            }
        }
        return Number.isFinite(top) ? top - 18 : home.y;
    }

    armBoarders() {
        const scene = this.scene;
        const aliens = scene.boardersGroup?.getChildren?.() || [];
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (!alien || alien.defeated || !alien.arrived || !alien.body) {
                continue;
            }
            alien.body.enable = true;
        }
        scene.boardersDisarmed = false;
    }
}
