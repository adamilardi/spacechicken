import { GAME_CONSTANTS } from './Constants.js';
import {
    WEAPON_DEFS,
    activeWeaponId,
    aimVector,
    nextWeaponId,
    tempGunMsLeft,
    weaponsForLevel,
} from './GameUtils.js';

// Player weapons: phaser pool, firing, bolts, weapon switching, temp guns.
// All mutable game state lives on the scene (players, groups, managers); the
// system holds no per-frame state of its own, so it can be constructed once
// and driven by the scene every frame.
export class CombatSystem {
    constructor(scene) {
        this.scene = scene;
    }

    setupPhaser() {
        const scene = this.scene;
        if (!scene.levelConfig?.phaser) {
            return;
        }
        scene.phaserBolts = scene.physics.add.group({
            allowGravity: false,
            maxSize: GAME_CONSTANTS.PHASER_POOL_SIZE,
        });
        this.attachPhaserSprite(scene.player);
        if (scene.boardersGroup) {
            scene.physics.add.overlap(
                scene.phaserBolts,
                scene.boardersGroup,
                this.phaserHitsBoarder,
                null,
                this
            );
        }
        if (scene.bossesGroup) {
            scene.physics.add.overlap(
                scene.phaserBolts,
                scene.bossesGroup,
                this.phaserHitsBoss,
                null,
                this
            );
        }
    }

    attachPhaserSprite(chicken) {
        const scene = this.scene;
        if (!scene.levelConfig?.phaser || !chicken || chicken.phaserSprite) {
            return;
        }
        const gun = scene.add.sprite(chicken.x, chicken.y, 'spacePhaser');
        gun.setDepth(6);
        chicken.phaserSprite = gun;
        chicken.weapon = this.baseWeaponOf(chicken);
        gun.setTexture?.(WEAPON_DEFS[chicken.weapon].gun);
    }

    baseWeaponOf(chicken) {
        const allowed = weaponsForLevel(this.scene.level);
        const current = chicken?.weapon || 'phaser';
        return allowed.includes(current) ? current : 'phaser';
    }

    weaponOf(chicken, now) {
        const stamp = now ?? this.scene.getGameTime();
        return activeWeaponId(this.baseWeaponOf(chicken), chicken?.tempGun, stamp);
    }

    applyStartWeapons() {
        const scene = this.scene;
        if (!scene.levelConfig?.phaser) {
            return;
        }
        const names = scene.startWeapons || {};
        if (scene.player && typeof names.p1 === 'string') {
            scene.player.weapon = this.baseWeaponOf({ weapon: names.p1 });
            scene.player.phaserSprite?.setTexture?.(WEAPON_DEFS[scene.player.weapon].gun);
        }
        if (scene.player2 && typeof names.p2 === 'string') {
            scene.player2.weapon = this.baseWeaponOf({ weapon: names.p2 });
            scene.player2.phaserSprite?.setTexture?.(WEAPON_DEFS[scene.player2.weapon].gun);
        }
        scene.uiManager?.updateWeaponLabel?.(WEAPON_DEFS[this.weaponOf(scene.player)].name);
    }

    switchPlayerWeapon(index) {
        const scene = this.scene;
        if (!scene.levelConfig?.phaser || scene.awaitingStart || scene.gameOver) {
            return false;
        }
        const chicken = index === 1 ? scene.player2 : scene.player;
        if (!chicken || chicken.active === false) {
            return false;
        }
        if (weaponsForLevel(scene.level).length <= 1) {
            return false;
        }
        if (tempGunMsLeft(chicken.tempGun, scene.getGameTime()) > 0) {
            chicken.tempGun = null;
            const base = this.baseWeaponOf(chicken);
            chicken.phaserSprite?.setTexture?.(WEAPON_DEFS[base].gun);
            if (index !== 1) {
                scene.uiManager?.updateWeaponLabel?.(WEAPON_DEFS[base].name);
            }
            return true;
        }
        const next = nextWeaponId(this.baseWeaponOf(chicken), scene.level);
        chicken.weapon = next;
        chicken.phaserSprite?.setTexture?.(WEAPON_DEFS[next].gun);
        if (index !== 1) {
            scene.uiManager?.updateWeaponLabel?.(WEAPON_DEFS[next].name);
        }
        return true;
    }

    updateWeaponSwitch(inputState) {
        const scene = this.scene;
        if (!scene.levelConfig?.phaser || scene.awaitingStart || scene.gameOver) {
            return;
        }
        const keyboard = Phaser.Input.Keyboard;
        if (
            (scene.switchKey1 && keyboard.JustDown(scene.switchKey1)) ||
            inputState?.p1SwitchJustPressed
        ) {
            this.switchPlayerWeapon(0);
        }
        if (
            scene.player2 &&
            ((scene.switchKey2 && keyboard.JustDown(scene.switchKey2)) ||
                inputState?.p2SwitchJustPressed)
        ) {
            this.switchPlayerWeapon(1);
        }
    }

    updateTempGuns() {
        const scene = this.scene;
        if (!scene.levelConfig?.phaser || scene.awaitingStart || scene.gameOver) {
            return;
        }
        const now = scene.getGameTime();
        [scene.player, scene.player2].forEach((chicken, index) => {
            if (!chicken?.tempGun) {
                return;
            }
            const msLeft = tempGunMsLeft(chicken.tempGun, now);
            if (msLeft <= 0) {
                chicken.tempGun = null;
                const base = this.baseWeaponOf(chicken);
                chicken.phaserSprite?.setTexture?.(WEAPON_DEFS[base].gun);
                if (index !== 1) {
                    scene.uiManager?.updateWeaponLabel?.(WEAPON_DEFS[base].name);
                }
                return;
            }
            if (index === 0) {
                const label = `${WEAPON_DEFS[chicken.tempGun.id].name} ${Math.ceil(msLeft / 1000)}s`;
                if (chicken.tempLabel !== label) {
                    chicken.tempLabel = label;
                    scene.uiManager?.updateWeaponLabel?.(label);
                }
            }
        });
    }

    updatePhaserSprites() {
        const scene = this.scene;
        const chickens = [scene.player, scene.player2];
        for (let i = 0; i < chickens.length; i++) {
            const chicken = chickens[i];
            const gun = chicken?.phaserSprite;
            if (!gun) {
                continue;
            }
            const aim = chicken.aim;
            if (!aim || aim.y === 0) {
                const dir = chicken.flipX ? -1 : 1;
                gun.setPosition(chicken.x + dir * 16, chicken.y + 2);
                gun.setRotation?.(0);
                gun.setFlipX(dir < 0);
                gun.setFlipY?.(false);
            } else {
                // Point the gun along the aim; flip Y on leftward aims so
                // the sprite stays upright instead of rolling upside down.
                gun.setPosition(chicken.x + aim.x * 16, chicken.y + aim.y * 16);
                gun.setRotation?.(Math.atan2(aim.y, aim.x));
                gun.setFlipX?.(false);
                gun.setFlipY?.(aim.x < 0);
            }
            gun.setVisible(chicken.active !== false && chicken.visible !== false);
        }
    }

    // Resolve one chicken's aim for this frame from its raw aim inputs.
    // moveX comes from the run velocity movement already applied, so a
    // chicken running left aims its diagonals left without extra state.
    syncChickenAim(chicken, raw) {
        if (!chicken) {
            return;
        }
        const body = chicken.body;
        chicken.aim = aimVector({
            facing: chicken.flipX ? -1 : 1,
            moveX: body?.velocity?.x || 0,
            aimUp: raw?.up,
            aimDown: raw?.down,
            grounded: Boolean(body?.blocked?.down || body?.touching?.down || !body?.velocity),
        });
    }

    updateCombat(inputState) {
        const scene = this.scene;
        const now = scene.getGameTime();
        if (scene.levelConfig?.phaser) {
            this.syncChickenAim(scene.player, {
                up: inputState?.aimUpHeld,
                down: inputState?.aimDownHeld,
            });
            if (scene.player2) {
                this.syncChickenAim(scene.player2, {
                    up: scene.player2.aimUpHeld,
                    down: scene.player2.aimDownHeld,
                });
            }
            if (inputState?.phaserHeld) {
                this.tryFirePhaser(scene.player, now);
            }
            if (this.player2WantsPhaser()) {
                this.tryFirePhaser(scene.player2, now);
            }
            this.stepPhaserBolts();
        }
    }

    player2WantsPhaser() {
        const scene = this.scene;
        if (!scene.player2?.active) {
            return false;
        }
        const usePad = scene.coopMode !== 'keyboard';
        if (!usePad) {
            return Boolean(scene.player2PhaserKey?.isDown);
        }
        const pad = scene.inputController.getGamepad?.(
            scene.coopMode === 'keyboard-controller' ? 0 : 1
        );
        return Boolean(pad?.buttons?.[2]?.pressed);
    }

    tryFirePhaser(chicken, now) {
        const scene = this.scene;
        if (!chicken?.active || chicken.body?.enable === false || !scene.phaserBolts) {
            return;
        }
        if (now - (chicken.lastPhaserAt || 0) < GAME_CONSTANTS.PHASER_COOLDOWN_MS) {
            return;
        }
        const def = WEAPON_DEFS[this.weaponOf(chicken)] || WEAPON_DEFS.phaser;
        const aim = chicken.aim || { x: chicken.flipX ? -1 : 1, y: 0 };
        const fan = def.spread > 0 ? def.spread : 0;
        const shots =
            def.ways === 5 && fan > 0
                ? [-fan, -fan / 2, 0, fan / 2, fan]
                : fan > 0
                  ? [-fan, 0, fan]
                  : [0];
        let fired = false;
        for (let i = 0; i < shots.length; i++) {
            if (this.spawnPlayerBolt(chicken, aim, def, shots[i])) {
                fired = true;
            }
        }
        if (fired) {
            chicken.lastPhaserAt = now;
            scene.audioManager?.playPhaserSound?.();
        }
    }

    // aim is a unit vector; fanY is the legacy fan offset, applied
    // perpendicular to the aim so a horizontal shot keeps the exact
    // shipped velocities (SPEED, fanY) and every other direction is
    // that same volley rotated.
    spawnPlayerBolt(chicken, aim, def, fanY) {
        const scene = this.scene;
        const group = scene.phaserBolts;
        let bolt = group.getFirstDead?.(false) || null;
        if (!bolt) {
            if ((group.getLength?.() || 0) >= GAME_CONSTANTS.PHASER_POOL_SIZE) {
                return false;
            }
            bolt = group.create(chicken.x, chicken.y, def.bolt);
        }
        if (!bolt) {
            return false;
        }
        const speed = GAME_CONSTANTS.PHASER_BOLT_SPEED;
        const velocityX = aim.x * speed - aim.y * fanY;
        const velocityY = aim.y * speed + aim.x * fanY;
        const spawnX = chicken.x + aim.x * 22;
        const spawnY = chicken.y + aim.y * 22 + (aim.y === 0 ? 2 : 0);
        bolt.setTexture?.(def.bolt);
        bolt.pierceLeft = def.pierce > 0 ? def.pierce : 0;
        bolt.lastBossHit = null;
        bolt.setActive?.(true);
        bolt.setVisible?.(true);
        bolt.setDepth?.(8);
        if (bolt.enableBody) {
            bolt.enableBody(true, spawnX, spawnY, true, true);
        } else if (bolt.body) {
            bolt.body.enable = true;
            bolt.body.reset?.(spawnX, spawnY);
        }
        if (bolt.body) {
            bolt.body.allowGravity = false;
            bolt.body.setAllowGravity?.(false);
            if (Math.abs(velocityY) > Math.abs(velocityX)) {
                bolt.body.setSize?.(def.boltHeight, def.boltWidth, true);
            } else if (velocityX !== 0 && velocityY !== 0) {
                const side = Math.ceil(def.boltWidth * Math.SQRT1_2);
                bolt.body.setSize?.(side, side, true);
            } else {
                bolt.body.setSize?.(def.boltWidth, def.boltHeight, true);
            }
        }
        bolt.setVelocity?.(velocityX, velocityY);
        bolt.bornX = bolt.x;
        bolt.bornY = bolt.y;
        if (aim.y === 0) {
            bolt.setRotation?.(0);
            bolt.setFlipX?.(aim.x < 0);
        } else {
            bolt.setRotation?.(Math.atan2(velocityY, velocityX));
            bolt.setFlipX?.(false);
        }
        scene.effectsManager?.emitMuzzle?.(spawnX, spawnY, aim.x < 0 ? -1 : 1);
        return true;
    }

    stepPhaserBolts() {
        const scene = this.scene;
        const bolts = scene.phaserBolts?.getChildren?.() || [];
        for (let i = 0; i < bolts.length; i++) {
            const bolt = bolts[i];
            if (!bolt?.active) {
                continue;
            }
            const traveled = Math.hypot(
                bolt.x - (bolt.bornX ?? bolt.x),
                bolt.y - (bolt.bornY ?? bolt.y)
            );
            if (
                traveled > GAME_CONSTANTS.PHASER_RANGE ||
                bolt.x < -20 ||
                bolt.x > scene.worldWidth + 20 ||
                bolt.y < -20 ||
                bolt.y > scene.worldHeight + 20
            ) {
                scene.effectsManager?.emitPhaserImpact?.(bolt.x, bolt.y);
                this.recycleBolt(bolt);
            }
        }
    }

    recycleBolt(bolt) {
        if (!bolt) {
            return;
        }
        if (this.scene.phaserBolts?.killAndHide) {
            this.scene.phaserBolts.killAndHide(bolt);
        } else {
            bolt.setActive?.(false);
            bolt.setVisible?.(false);
        }
        if (bolt.body) {
            bolt.body.stop?.();
            bolt.body.enable = false;
        }
    }

    phaserHitsBoss(bolt, boss) {
        const scene = this.scene;
        if (!bolt?.active || !boss?.active || boss.bossDefeated) {
            return;
        }
        // One damage per bolt: piercing shots linger inside the body.
        if (bolt.lastBossHit === boss) {
            return;
        }
        bolt.lastBossHit = boss;
        const piercing = (bolt?.pierceLeft || 0) > 0;
        if (!piercing) {
            this.recycleBolt(bolt);
        } else {
            bolt.pierceLeft -= 1;
            if (bolt.pierceLeft <= 0) {
                this.recycleBolt(bolt);
            }
        }
        const impactX = bolt?.x ?? boss?.x;
        const impactY = bolt?.y ?? boss?.y;
        if (impactX != null && impactY != null) {
            scene.effectsManager?.emitPhaserImpact?.(impactX, impactY);
        }
        scene.damageBoss(boss);
    }

    phaserHitsBoarder(bolt, alien) {
        const scene = this.scene;
        const impactX = bolt?.x ?? alien?.x;
        const impactY = bolt?.y ?? alien?.y;
        const piercing = (bolt?.pierceLeft || 0) > 0;
        if (!piercing) {
            this.recycleBolt(bolt);
        } else if (alien?.defeated) {
            return;
        } else {
            bolt.pierceLeft -= 1;
            if (bolt.pierceLeft <= 0) {
                this.recycleBolt(bolt);
            }
        }
        if (impactX != null && impactY != null) {
            scene.effectsManager?.emitPhaserImpact?.(impactX, impactY);
        }
        scene.defeatBoarder(alien);
    }
}
