import { GAME_CONSTANTS } from './Constants.js';
import {
    WEAPON_DEFS,
    activeWeaponId,
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
            const dir = chicken.flipX ? -1 : 1;
            gun.setPosition(chicken.x + dir * 16, chicken.y + 2);
            gun.setFlipX(dir < 0);
            gun.setVisible(chicken.active !== false && chicken.visible !== false);
        }
    }

    updateCombat(inputState) {
        const scene = this.scene;
        const now = scene.getGameTime();
        if (scene.levelConfig?.phaser) {
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
        const dir = chicken.flipX ? -1 : 1;
        const fan = def.spread > 0 ? def.spread : 0;
        const shots =
            def.ways === 5 && fan > 0
                ? [-fan, -fan / 2, 0, fan / 2, fan]
                : fan > 0
                  ? [-fan, 0, fan]
                  : [0];
        let fired = false;
        for (let i = 0; i < shots.length; i++) {
            if (this.spawnPlayerBolt(chicken, dir, def, shots[i])) {
                fired = true;
            }
        }
        if (fired) {
            chicken.lastPhaserAt = now;
            scene.audioManager?.playPhaserSound?.();
        }
    }

    spawnPlayerBolt(chicken, dir, def, velocityY) {
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
        bolt.setTexture?.(def.bolt);
        bolt.pierceLeft = def.pierce > 0 ? def.pierce : 0;
        bolt.setActive?.(true);
        bolt.setVisible?.(true);
        bolt.setDepth?.(8);
        if (bolt.enableBody) {
            bolt.enableBody(true, chicken.x + dir * 22, chicken.y + 2, true, true);
        } else if (bolt.body) {
            bolt.body.enable = true;
            bolt.body.reset?.(chicken.x + dir * 22, chicken.y + 2);
        }
        if (bolt.body) {
            bolt.body.allowGravity = false;
            bolt.body.setAllowGravity?.(false);
            bolt.body.setSize?.(def.boltWidth, def.boltHeight, true);
        }
        bolt.setVelocity?.(dir * GAME_CONSTANTS.PHASER_BOLT_SPEED, velocityY);
        bolt.bornX = bolt.x;
        bolt.setFlipX?.(dir < 0);
        scene.effectsManager?.emitMuzzle?.(chicken.x + dir * 22, chicken.y + 2, dir);
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
            const traveled = Math.abs(bolt.x - (bolt.bornX ?? bolt.x));
            if (
                traveled > GAME_CONSTANTS.PHASER_RANGE ||
                bolt.x < -20 ||
                bolt.x > scene.worldWidth + 20
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
