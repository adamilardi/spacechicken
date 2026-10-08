import { GAME_CONSTANTS } from './Constants.js';
import { boarderEntryY, boarderSteering, boarderYields, nextBoarderWave } from './GameUtils.js';

// Alien boarders: spawning waves, steering, aggro, defeat. Mutable game state
// (groups, players, managers) lives on the scene; the director owns only its
// hot-loop scratch buffers, reused every frame so the update allocates
// nothing.
export class BoarderDirector {
    constructor(scene) {
        this.scene = scene;
        // Reused every frame by updateBoarders so the hot loop allocates nothing.
        this.boarderTargets = [];
        this.boarderAllies = [];
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
        alien.clearTint?.();
        if (alien.body) {
            alien.body.enable = false;
        }
        alien.setVelocity?.(0, 0);
        scene.audioManager?.playBoarderPop?.();
        scene.effectsManager?.emitJumpPuff?.(alien.x, alien.y);
        if (
            scene.crownShielded &&
            scene.levelConfig?.crownShield &&
            this.liveBoarderCount() === 0
        ) {
            scene.breakCrownShield();
        }
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
        const allies = this.boarderAllies;
        allies.length = 0;
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (alien?.active && !alien.defeated) {
                allies.push(alien);
            }
        }
        for (let i = 0; i < aliens.length; i++) {
            this.stepBoarder(aliens[i], targets, allies, options);
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
        const homeX = alien.homeX ?? alien.x;
        const homeY = alien.homeY ?? alien.y;
        let target = null;
        let best = Infinity;
        for (let t = 0; t < targets.length; t++) {
            const chicken = targets[t];
            const dist = Math.abs(chicken.x - homeX) + Math.abs(chicken.y - homeY);
            if (dist < best) {
                best = dist;
                target = chicken;
            }
        }
        const grounded = Boolean(alien.body?.blocked?.down || alien.body?.touching?.down);
        const targetGrounded = Boolean(
            target && (target.body?.blocked?.down || target.body?.touching?.down)
        );
        const steer = boarderSteering(
            alien.x,
            alien.y,
            target ? target.x : homeX,
            target ? target.y : homeY,
            grounded,
            {
                ...options,
                homeX,
                homeY,
                targetGrounded,
            }
        );
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
        alien.setVelocityX?.(yields ? 0 : steer.velocityX);
        if (!yields && steer.velocityY != null) {
            alien.setVelocityY?.(steer.velocityY);
        }
        if (steer.flipX != null) {
            alien.setFlipX?.(steer.flipX);
        }
        this.updateBoarderAggro(alien, target, homeX, homeY, options);
    }

    updateBoarderAggro(alien, target, homeX, homeY, options) {
        const aggroX = options?.aggroX ?? GAME_CONSTANTS.BOARDER_AGGRO_X;
        const aggroY = options?.aggroY ?? GAME_CONSTANTS.BOARDER_AGGRO_Y;
        const inAggro = Boolean(
            target && Math.abs(target.x - homeX) <= aggroX && Math.abs(target.y - homeY) <= aggroY
        );
        if (inAggro && !alien.aggro) {
            alien.aggro = true;
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
            GAME_CONSTANTS.BOARDER_WAVES
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
            if (!alien || alien.arrived || this.boarderWaveNumber(alien) !== wave) {
                continue;
            }
            const home = this.boarderHome(alien);
            if (!home) {
                continue;
            }
            const dropY = boarderEntryY(home.x, home.y);
            alien.homeX = home.x;
            alien.homeY = home.y;
            alien.arrived = true;
            alien.defeated = false;
            alien.aggro = false;
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
        const activeWave = scene.boarderWave || 1;
        let parked = false;
        for (let i = 0; i < aliens.length; i++) {
            const alien = aliens[i];
            if (!alien) {
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
            alien.clearTint?.();
            alien.setActive?.(true);
            alien.setVisible?.(true);
            alien.setAlpha?.(1);
            if (alien.body?.reset) {
                alien.body.reset(home.x, home.y);
            }
            alien.x = home.x;
            alien.y = home.y;
            alien.setVelocity?.(0, 0);
            if (alien.body) {
                alien.body.enable = false;
            }
            parked = true;
        }
        if (parked) {
            scene.boardersDisarmed = true;
        }
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
