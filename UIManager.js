import { GAME_CONSTANTS } from './Constants.js';
import { formatElapsedTime, weaponsForLevel } from './GameUtils.js';
import { computeLayoutMetrics, fitRowControlSize } from './HudLayout.js';
import { Overlays } from './Overlays.js';

export const HUD_FONT = 'Trebuchet MS, Arial, sans-serif';
export const BANNER_FONT = 'Trebuchet MS, Arial, sans-serif';

export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.timerText = null;
        this.targetText = null;
        this.levelText = null;
        this.deathText = null;
        this.text = null;
        this.playerNameText = null;
        this.musicToggleButton = null;
        this.leaderboardButton = null;
        this.jumpButton = null;
        this.phaserButton = null;
        this.weaponButton = null;
        this.leftButton = null;
        this.rightButton = null;
        this.touchControlsEnabled = false;
        this.touchMovementMidpoint = 0;
        this.playerName = '';
        this.bannerTitle = null;
        this.bannerSubtitle = null;
        this.bannerHideEvent = null;
        this.instructionFadeEvent = null;
        this.destroyed = false;
        this.lastTimerDisplay = '';
        this.cachedInsets = null;
        this.overlays = new Overlays(scene, this);
    }

    // Overlay-owned fields that external readers (input, scene) still reach
    // through the manager.
    get selectPrevButton() {
        return this.overlays.selectPrevButton;
    }

    get selectNextButton() {
        return this.overlays.selectNextButton;
    }

    get raceSetupDialog() {
        return this.overlays.raceSetupDialog;
    }

    get branchOptions() {
        return this.overlays.branchOptions;
    }

    createUI(levelConfig, level, playerName) {
        this.currentLevel = level;
        this.weaponName = null;
        this.timerText = this.scene.add.text(0, 0, 'Time: 00:00.00', {
            fontSize: '32px',
            fontFamily: 'Courier New, Courier, monospace',
            fill: '#ffe566',
        });
        this.timerText.setScrollFactor(0);
        this.timerText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.styleHudText(this.timerText, 6);

        this.targetText = this.scene.add.text(0, 0, 'Record: loading…', {
            fontSize: '15px',
            fontFamily: HUD_FONT,
            fill: '#ffe566',
        });
        this.targetText.setScrollFactor(0);
        this.targetText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.styleHudText(this.targetText, 3);

        this.levelText = this.scene.add.text(0, 0, `Level ${level}`, {
            fontSize: '22px',
            fontFamily: HUD_FONT,
            fill: '#ffffff',
        });
        this.levelText.setScrollFactor(0);
        this.levelText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.styleHudText(this.levelText, 4);

        this.deathText = this.scene.add.text(0, 0, `Deaths ${this.scene.deathCount || 0}`, {
            fontSize: '18px',
            fontFamily: HUD_FONT,
            fill: '#ffb3b3',
        });
        this.deathText.setScrollFactor(0);
        this.deathText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.styleHudText(this.deathText, 4);

        const initialWrapWidth = Math.max(
            200,
            this.scene.scale && this.scene.scale.width ? this.scene.scale.width - 32 : 800 - 32
        );
        this.text = this.scene.add.text(0, 0, '', {
            fontSize: '16px',
            fontFamily: HUD_FONT,
            fill: '#dce7ff',
            wordWrap: { width: initialWrapWidth, useAdvancedWrap: true },
        });
        this.text.setScrollFactor(0);
        this.text.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.styleHudText(this.text, 3);

        this.playerNameText = this.scene.add.text(0, 0, '', {
            fontSize: '18px',
            fontFamily: HUD_FONT,
            fill: '#ffe566',
            align: 'right',
        });
        this.playerNameText.setOrigin(1, 0.5);
        this.playerNameText.setScrollFactor(0);
        this.playerNameText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.styleHudText(this.playerNameText, 4);
        this.playerNameText.setInteractive({ useHandCursor: true });
        this.playerNameText.on('pointerdown', () => {
            this.playerNameText.setTint(0xcde6ff);
        });
        this.playerNameText.on('pointerup', () => {
            this.playerNameText.clearTint();
            this.editPlayerName();
        });
        this.playerNameText.on('pointerout', () => {
            this.playerNameText.clearTint();
        });
        this.updatePlayerName(playerName);

        this.createMusicToggleButton();
        this.createLeaderboardButton();
        if (this.scene.shouldEnableTouchControls()) {
            this.enableTouchControls();
        }

        this.updateInstructionText(levelConfig.instructions, levelConfig.touchInstructions);
        this.layoutUI();
        this.markAllUiObjects();
    }

    getLayoutMetrics() {
        const insets = this.getSafeAreaInsets();
        if (this.scene.viewport?.getLayoutMetrics) {
            return this.scene.viewport.getLayoutMetrics(insets);
        }
        return computeLayoutMetrics(
            this.scene.getViewportWidth(),
            this.scene.getViewportHeight(),
            insets
        );
    }

    applyFontSize(text, size) {
        if (!text?.setFontSize || !size) {
            return;
        }
        text.setFontSize(size);
    }

    markUi(gameObject) {
        if (!gameObject) {
            return gameObject;
        }
        gameObject.spaceChickenUi = true;
        this.scene?.assignCameraFilter?.(gameObject);
        return gameObject;
    }

    getUiObjects() {
        return [
            this.timerText,
            this.targetText,
            this.levelText,
            this.deathText,
            this.text,
            this.playerNameText,
            this.musicToggleButton,
            this.leaderboardButton,
            this.jumpButton,
            this.phaserButton,
            this.leftButton,
            this.rightButton,
            this.overlays.titleDim,
            this.overlays.titleText,
            this.overlays.titleSubtitle,
            this.overlays.titlePrompt,
            this.overlays.titleControls,
            this.overlays.titleGamepadStatus,
            this.overlays.selectPrevButton,
            this.overlays.selectNextButton,
            this.bannerTitle,
            this.bannerSubtitle,
            this.overlays.leaderboardTextObject,
            this.overlays.leaderboardBackdrop,
            this.overlays.finishBackdrop,
            this.overlays.finishDim,
            this.overlays.finishTitle,
            this.overlays.finishSummary,
            this.overlays.finishRetryButton,
            this.overlays.finishNewGameButton,
        ].filter(Boolean);
    }

    setTouchControlsVisible(visible) {
        [
            this.leftButton,
            this.rightButton,
            this.jumpButton,
            this.phaserButton,
            this.weaponButton,
        ].forEach((button) => {
            button?.setVisible?.(visible);
        });
    }

    showRaceBanner(winner) {
        const other = winner === 1 ? 2 : 1;
        this.showLevelBanner(`PLAYER ${winner} WINS`, `Player ${other} got the receipt`);
        if (this.bannerHideEvent?.remove) {
            this.bannerHideEvent.remove(false);
            this.bannerHideEvent = null;
        }
    }

    markAllUiObjects() {
        const objects = this.getUiObjects();
        for (let i = 0; i < objects.length; i++) {
            this.markUi(objects[i]);
        }
    }

    createMusicToggleButton() {
        const toggleTexture = this.scene.musicMuted ? 'musicToggleOff' : 'musicToggleOn';
        this.musicToggleButton = this.scene.add.image(0, 0, toggleTexture);
        this.musicToggleButton.setScrollFactor(0);
        this.musicToggleButton.setDepth(GAME_CONSTANTS.MUSIC_BUTTON_DEPTH);
        this.musicToggleButton.setAlpha(0.95);
        this.musicToggleButton.setInteractive({ useHandCursor: true });

        this.musicToggleButton.on('pointerdown', () => {
            this.musicToggleButton.setTint(0xcde6ff);
        });
        this.musicToggleButton.on('pointerup', () => {
            this.musicToggleButton.clearTint();
            this.scene.audioManager.toggleMusicMute();
        });
        this.musicToggleButton.on('pointerout', () => {
            this.musicToggleButton.clearTint();
        });
    }

    updateMusicToggleVisual(muted) {
        if (!this.musicToggleButton) {
            return;
        }
        const textureKey = muted ? 'musicToggleOff' : 'musicToggleOn';
        this.musicToggleButton.setTexture(textureKey);
        this.musicToggleButton.setAlpha(muted ? 0.75 : 0.95);
    }

    createLeaderboardButton() {
        this.leaderboardButton = this.scene.add.text(0, 0, 'LEADERBOARD', {
            fontSize: '18px',
            fontFamily: HUD_FONT,
            fill: '#ffe566',
            backgroundColor: '#1a1a28',
            align: 'center',
        });
        this.leaderboardButton.setOrigin(0.5, 0.5);
        this.leaderboardButton.setPadding(8, 4, 8, 4);
        this.leaderboardButton.setScrollFactor(0);
        this.leaderboardButton.setDepth(GAME_CONSTANTS.LEADERBOARD_BUTTON_DEPTH);
        this.leaderboardButton.setAlpha(0.95);
        this.leaderboardButton.setStroke('#000000', 3);
        this.leaderboardButton.setInteractive({ useHandCursor: true });

        this.leaderboardButton.on('pointerdown', () => {
            this.leaderboardButton.setStyle({ backgroundColor: '#555555' });
        });
        this.leaderboardButton.on('pointerup', () => {
            this.toggleLeaderboardOverlay();
            this.refreshLeaderboardButtonStyle();
        });
        this.leaderboardButton.on('pointerout', () => {
            this.refreshLeaderboardButtonStyle();
        });
    }

    refreshLeaderboardButtonStyle() {
        if (!this.leaderboardButton) {
            return;
        }
        const backgroundColor = this.overlays.leaderboardVisible ? '#244c65' : '#14283e';
        this.leaderboardButton.setStyle({ backgroundColor });
    }

    styleHudText(text, strokeThickness = 4) {
        if (!text) {
            return;
        }
        text.setStroke?.('#081522', Math.max(2, strokeThickness * 0.65));
        text.setShadow?.(0, 2, '#020914', 3, false, true);
    }

    enableTouchControls() {
        if (this.touchControlsEnabled) {
            return;
        }
        this.touchControlsEnabled = true;
        this.scene.pointerTapTimes?.clear?.();
        if (this.scene.input?.addPointer) {
            const desiredPointerTotal = GAME_CONSTANTS.TOUCH_POINTER_TOTAL;
            const manager = this.scene.input.manager;
            const currentPointerTotal =
                manager && typeof manager.pointersTotal === 'number'
                    ? manager.pointersTotal
                    : Array.isArray(this.scene.input.pointers)
                      ? this.scene.input.pointers.length
                      : 0;
            const pointersToAdd = Math.max(0, desiredPointerTotal - currentPointerTotal);
            if (pointersToAdd > 0) {
                this.scene.input.addPointer(pointersToAdd);
            }
        }

        this.leftButton = this.markUi(this.createMoveButton('leftBtn'));
        this.rightButton = this.markUi(this.createMoveButton('rightBtn'));
        this.jumpButton = this.markUi(this.createJumpButton());
        if (this.scene.levelConfig?.phaser) {
            this.phaserButton = this.markUi(this.createPhaserButton());
            if (weaponsForLevel(this.scene.level).length > 1) {
                this.weaponButton = this.markUi(this.createWeaponButton());
            }
        }
        this.layoutTouchControls();
        if (this.scene.player2Camera) {
            this.setTouchControlsVisible(false);
        }
    }

    createMoveButton(textureKey) {
        const button = this.scene.add.image(0, 0, textureKey);
        button.setScrollFactor(0);
        button.setDepth(GAME_CONSTANTS.MOVE_BUTTON_DEPTH);
        button.setAlpha(0.88);
        button.setInteractive({ useHandCursor: false });
        button.on('pointerdown', () => {
            button.setTint(0xcde6ff);
        });
        button.on('pointerup', () => {
            button.clearTint();
        });
        button.on('pointerout', () => {
            button.clearTint();
        });
        button.on('pointerupoutside', () => {
            button.clearTint();
        });
        return button;
    }

    createJumpButton() {
        const jumpButton = this.scene.add.image(0, 0, 'jumpBtn');
        jumpButton.setScrollFactor(0);
        jumpButton.setDepth(GAME_CONSTANTS.JUMP_BUTTON_DEPTH);
        jumpButton.setAlpha(0.9);
        jumpButton.setInteractive({ useHandCursor: false });

        jumpButton.on('pointerdown', (pointer) => {
            this.scene.jumpPointerId = pointer.id;
            this.scene.jumpRequested = true;
            jumpButton.setTint(0x99ff99);
        });

        jumpButton.on('pointerover', (pointer) => {
            // NES roll: a finger sliding in from fire holds jump without lifting.
            if (pointer?.isDown && pointer.id !== this.scene.jumpPointerId) {
                this.scene.jumpPointerId = pointer.id;
                this.scene.jumpRequested = true;
                jumpButton.setTint(0x99ff99);
            }
        });

        jumpButton.on('pointerup', (pointer) => {
            this.onJumpButtonUp(pointer);
        });

        jumpButton.on('pointerout', (pointer) => {
            // Rolling onto fire keeps jump held until lift or full exit.
            if (pointer?.isDown && this.pointerWithinButton(this.phaserButton, pointer, 4)) {
                return;
            }
            this.onJumpButtonUp(pointer);
        });

        jumpButton.on('pointerupoutside', (pointer) => {
            this.onJumpButtonUp(pointer);
        });
        return jumpButton;
    }

    createPhaserButton() {
        const button = this.scene.add.image(0, 0, 'phaserBtn');
        button.setScrollFactor(0);
        button.setDepth(GAME_CONSTANTS.JUMP_BUTTON_DEPTH);
        button.setAlpha(0.9);
        button.setInteractive({ useHandCursor: false });
        button.on('pointerdown', (pointer) => {
            this.scene.phaserPointerId = pointer.id;
            this.scene.phaserHeld = true;
            button.setTint(0x99ffff);
        });
        button.on('pointerover', (pointer) => {
            // NES roll: a finger sliding in from jump keeps firing without lifting.
            if (pointer?.isDown && pointer.id !== this.scene.phaserPointerId) {
                this.scene.phaserPointerId = pointer.id;
                this.scene.phaserHeld = true;
                button.setTint(0x99ffff);
            }
        });
        const release = (pointer) => {
            if (!pointer || pointer.id === this.scene.phaserPointerId) {
                this.scene.phaserPointerId = null;
                this.scene.phaserHeld = false;
            }
            button.clearTint();
        };
        const slideOut = (pointer) => {
            // Rolling onto jump keeps fire held until lift or full exit.
            if (pointer?.isDown && this.pointerWithinButton(this.jumpButton, pointer, 4)) {
                return;
            }
            release(pointer);
        };
        button.on('pointerup', release);
        button.on('pointerout', slideOut);
        button.on('pointerupoutside', release);
        return button;
    }

    pointerWithinButton(button, pointer, pad = 0) {
        if (!button || !pointer) {
            return false;
        }
        const halfWidth = (button.displayWidth || 0) / 2 + pad;
        const halfHeight = (button.displayHeight || 0) / 2 + pad;
        return (
            Math.abs(pointer.x - button.x) <= halfWidth &&
            Math.abs(pointer.y - button.y) <= halfHeight
        );
    }

    createWeaponButton() {
        const button = this.scene.add.image(0, 0, 'weaponBtn');
        button.setScrollFactor(0);
        button.setDepth(GAME_CONSTANTS.JUMP_BUTTON_DEPTH);
        button.setAlpha(0.9);
        button.setInteractive({ useHandCursor: false });
        button.on('pointerdown', () => {
            this.scene.switchPlayerWeapon(0);
            button.setTint(0xffe6b0);
        });
        const release = () => {
            button.clearTint();
        };
        button.on('pointerup', release);
        button.on('pointerout', release);
        button.on('pointerupoutside', release);
        return button;
    }

    expandControlHitArea(button, displaySize, maxPadding = GAME_CONSTANTS.TOUCH_HIT_PADDING) {
        if (!button || !button.input || !button.input.hitArea) {
            return;
        }
        const area = button.input.hitArea;
        if (typeof area.setTo !== 'function') {
            return;
        }
        const sourceWidth = button.width || displaySize || GAME_CONSTANTS.VIRTUAL_BUTTON_SIZE;
        const sourceHeight = button.height || displaySize || GAME_CONSTANTS.VIRTUAL_BUTTON_SIZE;
        const scaleX = displaySize && sourceWidth ? displaySize / sourceWidth : 1;
        button.touchHitPadding = Math.min(GAME_CONSTANTS.TOUCH_HIT_PADDING, maxPadding);
        const pad = Math.min(GAME_CONSTANTS.TOUCH_HIT_PADDING, maxPadding) / (scaleX || 1);
        area.setTo(-pad, -pad, sourceWidth + pad * 2, sourceHeight + pad * 2);
        if (typeof button.input.setAlwaysEnabled === 'function') {
            button.input.setAlwaysEnabled(true);
        }
    }

    onJumpButtonUp(pointer) {
        if (!pointer || pointer.id === this.scene.jumpPointerId) {
            this.scene.jumpPointerId = null;
            // Touch jump release edge: the poll folds this into jumpReleased
            // so touch jumps get the same jump cut as keyboard and gamepad.
            this.scene.touchJumpReleased = true;
        }
        if (this.jumpButton) {
            this.jumpButton.clearTint();
        }
    }

    updateInstructionText(instructions, touchInstructions) {
        if (!this.text) {
            return;
        }
        const displayText = this.touchControlsEnabled ? touchInstructions : instructions;
        this.text.setText(displayText);
        this.layoutUI();
    }

    handleResize() {
        this.cachedInsets = null;
        if (!this.timerText || !this.levelText || !this.text) {
            return;
        }
        const metrics = this.getLayoutMetrics();
        const availableWidth = Math.max(160, metrics.innerWidth - 32);
        this.text.setWordWrapWidth(availableWidth, true);
        this.layoutUI();
        this.layoutTouchControls();
        this.layoutLeaderboard();
        this.layoutFinishScreen();
        this.layoutTitleScreen();
        this.layoutLevelBanner();
    }

    getSafeAreaInsets() {
        if (this.cachedInsets) {
            return this.cachedInsets;
        }
        if (typeof window === 'undefined' || !window.getComputedStyle) {
            this.cachedInsets = GAME_CONSTANTS.SAFE_AREA_FALLBACK;
            return this.cachedInsets;
        }
        const styles = window.getComputedStyle(document.documentElement);
        const parseInset = (prop) => {
            const value = styles.getPropertyValue(prop);
            const parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : 0;
        };
        this.cachedInsets = {
            top: parseInset('--safe-area-top'),
            right: parseInset('--safe-area-right'),
            bottom: parseInset('--safe-area-bottom'),
            left: parseInset('--safe-area-left'),
        };
        return this.cachedInsets;
    }

    layoutUI() {
        if (!this.timerText || !this.levelText || !this.text) {
            return;
        }
        const insets = this.getSafeAreaInsets();
        const metrics = this.getLayoutMetrics();
        const fonts = metrics.fonts;
        const padding = metrics.hudPadding;
        const width = metrics.width;
        const narrowPortrait = metrics.isPortrait && metrics.innerWidth <= 360;

        this.applyFontSize(this.timerText, fonts.timer);
        this.applyFontSize(this.targetText, Math.max(12, fonts.death - 2));
        this.applyFontSize(this.levelText, fonts.level);
        this.applyFontSize(this.deathText, fonts.death);
        this.applyFontSize(this.text, fonts.instructions);
        this.applyFontSize(this.playerNameText, fonts.playerName);
        this.applyFontSize(this.leaderboardButton, fonts.leaderboardButton);
        if (this.leaderboardButton && typeof this.leaderboardButton.setPadding === 'function') {
            const padX = metrics.isCompact ? 10 : 8;
            const padY = this.touchControlsEnabled
                ? Math.max(10, Math.ceil((44 - fonts.leaderboardButton) / 2))
                : 4;
            this.leaderboardButton.setPadding(padX, padY, padX, padY);
        }
        if (this.musicToggleButton && typeof this.musicToggleButton.setDisplaySize === 'function') {
            this.musicToggleButton.setDisplaySize(metrics.musicButtonSize, metrics.musicButtonSize);
        }

        this.timerText.setPosition(insets.left + padding, insets.top + padding);
        this.levelText.setPosition(
            insets.left + padding,
            this.timerText.y + this.timerText.height + (metrics.isCompact ? 4 : 6)
        );
        if (this.deathText) {
            this.deathText.setPosition(
                insets.left + padding,
                this.levelText.y + this.levelText.height + 4
            );
        }

        this.targetText?.setPosition(
            insets.left + padding,
            (this.deathText?.y || this.levelText.y) +
                (this.deathText?.height || this.levelText.height) +
                4
        );

        const instructionsTop = this.targetText.y + this.targetText.height + 8;
        this.text.setPosition(insets.left + padding, instructionsTop);

        if (this.musicToggleButton) {
            const buttonHalfWidth = this.musicToggleButton.displayWidth * 0.5;
            const buttonX = width - insets.right - padding - buttonHalfWidth;
            const buttonY = insets.top + padding + buttonHalfWidth;
            this.musicToggleButton.setPosition(buttonX, buttonY);
        }

        if (this.leaderboardButton) {
            const buttonHalfWidth = this.leaderboardButton.displayWidth * 0.5;
            const buttonHalfHeight = this.leaderboardButton.displayHeight * 0.5;
            let buttonX = width - insets.right - padding - buttonHalfWidth;
            if (this.musicToggleButton) {
                buttonX =
                    this.musicToggleButton.x -
                    this.musicToggleButton.displayWidth * 0.5 -
                    padding -
                    buttonHalfWidth;
            }
            const buttonY = insets.top + padding + buttonHalfHeight;
            this.leaderboardButton.setPosition(buttonX, buttonY);
        }

        this.layoutPlayerName(metrics, insets, padding, width);
        this.wrapInstructionText(metrics, padding);
        if (!narrowPortrait) this.avoidHudOverlap();
        if (metrics.isCompact) {
            // Keep the HUD shallow in landscape and leave the playfield readable.
            this.levelText.setPosition(
                insets.left + padding,
                this.timerText.y + this.timerText.height + 4
            );
            if (this.deathText) {
                this.deathText.setPosition(
                    this.levelText.x + this.levelText.width + 12,
                    this.levelText.y
                );
            }
            const statsBottom =
                this.levelText.y + Math.max(this.levelText.height, this.deathText?.height || 0);
            this.targetText?.setPosition(insets.left + padding, statsBottom + 4);
            const nameBottom = this.playerNameText
                ? this.playerNameText.y + this.playerNameText.displayHeight / 2
                : 0;
            this.text.setPosition(
                insets.left + padding,
                Math.max(this.targetText.y + this.targetText.height, nameBottom) + 8
            );
            this.text.setWordWrapWidth(Math.max(140, metrics.innerWidth - padding * 2), true);
        }
        if (narrowPortrait && !this.overlays.titleText) {
            this.layoutNarrowPortraitHud(insets, padding, width);
        }
    }

    layoutNarrowPortraitHud(insets, padding, width) {
        const controlsBottom = Math.max(
            this.musicToggleButton?.y + this.musicToggleButton?.displayHeight / 2 || 0,
            this.leaderboardButton?.y + this.leaderboardButton?.displayHeight / 2 || 0
        );
        this.timerText.setPosition(insets.left + padding, controlsBottom + 8);
        this.levelText.setPosition(
            insets.left + padding,
            this.timerText.y + this.timerText.height + 4
        );
        this.deathText?.setPosition(this.levelText.x + this.levelText.width + 12, this.levelText.y);
        const statsBottom =
            this.levelText.y + Math.max(this.levelText.height, this.deathText?.height || 0);
        this.targetText?.setPosition(insets.left + padding, statsBottom + 4);
        this.playerNameText?.setPosition(
            width - insets.right - padding,
            this.targetText.y + this.targetText.height + 8 + this.playerNameText.displayHeight / 2
        );
        this.text.setPosition(
            insets.left + padding,
            this.playerNameText.y + this.playerNameText.displayHeight / 2 + 8
        );
    }

    layoutPlayerName(metrics, insets, padding, width) {
        if (!this.playerNameText) {
            return;
        }
        const topRightBottom = Math.max(
            insets.top + padding,
            (this.musicToggleButton?.y || 0) + (this.musicToggleButton?.displayHeight || 0) * 0.5,
            (this.leaderboardButton?.y || 0) + (this.leaderboardButton?.displayHeight || 0) * 0.5
        );
        const nameX = this.overlays.titleText
            ? insets.left + metrics.innerWidth / 2
            : width - insets.right - padding;
        const nameY = topRightBottom + 8 + this.playerNameText.displayHeight * 0.5;
        this.playerNameText.setPosition(nameX, nameY);
        this.playerNameText.setWordWrapWidth?.(
            this.overlays.titleText
                ? Math.max(120, metrics.innerWidth - 32)
                : Math.max(120, metrics.innerWidth * 0.5),
            true
        );
    }

    wrapInstructionText(metrics, padding) {
        if (!this.text || typeof this.text.setWordWrapWidth !== 'function') {
            return;
        }
        let wrapWidth = metrics.innerWidth - padding * 2;
        if (this.playerNameText && typeof this.playerNameText.x === 'number') {
            const nameLeft =
                this.playerNameText.x -
                (this.playerNameText.displayWidth || this.playerNameText.width || 0);
            wrapWidth = Math.min(wrapWidth, nameLeft - this.text.x - 16);
        } else if (this.leaderboardButton && typeof this.leaderboardButton.x === 'number') {
            wrapWidth = Math.min(
                wrapWidth,
                this.leaderboardButton.x -
                    this.leaderboardButton.displayWidth * 0.5 -
                    this.text.x -
                    16
            );
        }
        this.text.setWordWrapWidth(Math.max(140, wrapWidth), true);
    }

    avoidHudOverlap() {
        if (!this.timerText || !this.leaderboardButton) {
            return;
        }
        const gap = 8;
        const rightLimit =
            this.leaderboardButton.x - this.leaderboardButton.displayWidth * 0.5 - gap;
        const timerRight = this.timerText.x + this.timerText.width;
        if (timerRight <= rightLimit || this.timerText.width <= 0) {
            return;
        }
        const available = rightLimit - this.timerText.x;
        if (available < 72) {
            return;
        }
        const currentSize = this.readFontSize(this.timerText, 32);
        const fitted = Math.max(14, Math.floor(currentSize * (available / this.timerText.width)));
        this.applyFontSize(this.timerText, fitted);
    }

    readFontSize(text, fallback) {
        if (!text) {
            return fallback;
        }
        if (typeof text.style === 'object' && text.style && text.style.fontSize) {
            const parsed = parseFloat(text.style.fontSize);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
        return fallback;
    }

    layoutTouchControls() {
        const metrics = this.getLayoutMetrics();
        const insets = this.getSafeAreaInsets();
        const width = metrics.width;
        const height = metrics.height;
        this.touchMovementMidpoint =
            insets.left + metrics.innerWidth * GAME_CONSTANTS.MOVEMENT_MIDPOINT_RATIO;

        if (!this.jumpButton && !this.leftButton && !this.rightButton && !this.phaserButton) {
            return;
        }

        const margin = metrics.controlMargin;
        const gap = Math.max(16, Math.round(margin * 0.7));
        // The row holds left, right, jump, plus fire on phaser levels, so
        // size for the buttons actually present instead of assuming three.
        const across = [
            this.leftButton,
            this.rightButton,
            this.jumpButton,
            this.phaserButton,
        ].filter(Boolean).length;
        const controlSize = fitRowControlSize(
            metrics.controlSize,
            metrics.innerWidth,
            margin,
            gap,
            across
        );
        const hitPadding = Math.min(margin, (gap - 2) / 2);

        const buttonY = height - insets.bottom - controlSize / 2 - margin;
        if (this.leftButton) {
            this.leftButton.setDisplaySize(controlSize, controlSize);
            this.leftButton.setPosition(insets.left + controlSize / 2 + margin, buttonY);
            this.expandControlHitArea(this.leftButton, controlSize, hitPadding);
        }
        if (this.rightButton) {
            this.rightButton.setDisplaySize(controlSize, controlSize);
            const leftX = this.leftButton
                ? this.leftButton.x
                : insets.left + controlSize / 2 + margin;
            this.rightButton.setPosition(leftX + controlSize + gap, buttonY);
            this.expandControlHitArea(this.rightButton, controlSize, hitPadding);
        }
        if (this.jumpButton) {
            this.jumpButton.setDisplaySize(controlSize, controlSize);
            this.jumpButton.setPosition(width - insets.right - controlSize / 2 - margin, buttonY);
            this.expandControlHitArea(this.jumpButton, controlSize, hitPadding);
        }
        if (this.phaserButton && this.jumpButton) {
            // NES layout: fire sits left of jump on the same row so the
            // thumb rolls right to leap while firing.
            this.phaserButton.setDisplaySize(controlSize, controlSize);
            this.phaserButton.setPosition(this.jumpButton.x - controlSize - gap, buttonY);
            this.expandControlHitArea(this.phaserButton, controlSize, hitPadding);
        }
        if (this.weaponButton && this.phaserButton) {
            const small = controlSize * 0.62;
            this.weaponButton.setDisplaySize(small, small);
            this.weaponButton.setPosition(
                this.phaserButton.x,
                buttonY - controlSize / 2 - gap - small / 2
            );
            this.expandControlHitArea(this.weaponButton, small, hitPadding);
        }
    }

    layoutLeaderboard() {
        this.overlays.layoutLeaderboard();
    }

    leaderboardTop(metrics, insets) {
        return this.overlays.leaderboardTop(metrics, insets);
    }

    drawLeaderboardBackdrop(centerX, top, availableWidth, width, height, insets) {
        this.overlays.drawLeaderboardBackdrop(centerX, top, availableWidth, width, height, insets);
    }

    updateTimer(elapsed) {
        if (!this.timerText) {
            return;
        }
        // Keep scoring at full precision; avoid rasterizing/uploading HUD text every frame.
        const bucket = Math.floor(elapsed / 50);
        if (elapsed > 0 && bucket === this.lastTimerBucket) return;
        this.lastTimerBucket = bucket;
        const display = formatElapsedTime(elapsed);
        if (display === this.lastTimerDisplay) {
            return;
        }
        this.lastTimerDisplay = display;
        this.timerText.setText(`Time: ${display}`);
    }

    updateCompetitionTarget(record, fullRecord = null) {
        const personalBest = this.scene.leaderboardManager?.getPersonalBest?.(this.scene.level);
        const recordText = record ? formatElapsedTime(record.time) : 'open';
        const bestText =
            personalBest === null || personalBest === undefined
                ? 'none yet'
                : formatElapsedTime(personalBest);
        const gap =
            record && personalBest !== null && personalBest !== undefined
                ? personalBest > record.time
                    ? ` · ${formatElapsedTime(personalBest - record.time)} to #1`
                    : ` · ${formatElapsedTime(record.time - personalBest)} ahead of #1`
                : '';
        this.targetText?.setText(`Record ${recordText} · Best ${bestText}${gap}`);
        if (this.overlays.titleSubtitle) {
            const metrics = this.getLayoutMetrics();
            const fullBest = this.scene.leaderboardManager?.getPersonalBest?.(0);
            const fullBestText = fullBest === null ? 'none yet' : formatElapsedTime(fullBest);
            const fullRecordText = fullRecord
                ? `Run #1 ${formatElapsedTime(fullRecord.time)}`
                : 'Claim full-run #1';
            const challenge = `${fullRecordText} · Best ${fullBestText}`;
            this.overlays.titleSubtitle.setText(
                metrics.isCompact && !metrics.isPortrait
                    ? challenge
                    : `${this.scene.levelConfig.title}\n${challenge}`
            );
            this.overlays.layoutTitleScreen();
        }
        this.layoutUI();
    }

    showLevelResult(title, time, submission, rescueMs = 0) {
        this.overlays.showLevelResult(title, time, submission, rescueMs);
    }

    showFullRunResult(time, submission, deaths = 0, rescues = 0) {
        this.overlays.showFullRunResult(time, submission, deaths, rescues);
    }

    updateLevelText(level) {
        this.currentLevel = level;
        this.refreshLevelText();
    }

    updateWeaponLabel(name) {
        this.weaponName = name || null;
        this.refreshLevelText();
    }

    refreshLevelText() {
        if (!this.levelText) {
            return;
        }
        if (this.weaponName && this.scene.levelConfig?.phaser) {
            this.levelText.setText(`Level ${this.currentLevel} · ${this.weaponName}`);
        } else {
            this.levelText.setText(`Level ${this.currentLevel}`);
        }
    }

    updateDeathCount(deathCount) {
        if (this.deathText) {
            this.deathText.setText(`Deaths ${deathCount || 0}`);
        }
    }

    updatePlayerName(playerName) {
        if (!this.playerNameText) {
            return;
        }
        const trimmedName = typeof playerName === 'string' ? playerName.trim() : '';
        this.playerName = trimmedName.length ? trimmedName : 'Anonymous';
        this.playerNameText.setText(
            this.overlays.titleText
                ? `CHANGE NAME: ${this.playerName}`
                : `Player: ${this.playerName}`
        );
        if (this.scene.awaitingStart) {
            this.playerNameText.setInteractive?.({ useHandCursor: true });
        } else {
            this.playerNameText.disableInteractive?.();
        }
        this.layoutUI();
    }

    editPlayerName() {
        if (!this.scene?.awaitingStart || !this.scene.leaderboardManager) {
            return;
        }
        const playerName = this.scene.leaderboardManager.ensurePlayerName(true);
        this.scene.playerName = playerName;
        this.updatePlayerName(playerName);
    }

    toggleLeaderboardOverlay() {
        this.overlays.toggleLeaderboardOverlay();
    }

    hideLeaderboard() {
        this.overlays.hideLeaderboard();
    }

    displayLeaderboard() {
        this.overlays.displayLeaderboard();
    }

    leaderboardPageCount() {
        return this.overlays.leaderboardPageCount();
    }

    showGameOver(finalTime) {
        this.overlays.leaderboardPage = this.overlays.fullRunSummary ? 0 : this.scene.level;
        this.overlays.finishLevelTime = finalTime;
        this.timerText.setText(`Time: ${formatElapsedTime(finalTime)}`);
        this.levelText.setText('Completed');
        if (this.deathText) {
            this.deathText.setText(`Deaths ${this.scene.deathCount}`);
        }
        const raceWinner = this.scene.raceWinner;
        if (this.text) {
            this.text.setVisible(false);
        }
        this.clearLevelBanner();
        this.overlays.createFinishScreen(raceWinner);
        this.layoutUI();
    }

    createFinishScreen(raceWinner) {
        this.overlays.createFinishScreen(raceWinner);
    }

    createFinishButton(label, level) {
        return this.overlays.createFinishButton(label, level);
    }

    updateFinishSummary() {
        this.overlays.updateFinishSummary();
    }

    setFinishVisible(visible) {
        this.overlays.setFinishVisible(visible);
    }

    layoutFinishScreen() {
        this.overlays.layoutFinishScreen();
    }

    createSelectChevron(label, direction, metrics) {
        return this.overlays.createSelectChevron(label, direction, metrics);
    }

    showTitleScreen(subtitle) {
        this.overlays.showTitleScreen(subtitle);
    }

    showBranchChoice(options, onPick, subtitle = null) {
        this.overlays.showBranchChoice(options, onPick, subtitle);
    }

    pickBranch(index) {
        return this.overlays.pickBranch(index);
    }

    hideBranchChoice() {
        this.overlays.hideBranchChoice();
    }

    showTitleLevelSelection(text) {
        this.overlays.showTitleLevelSelection(text);
    }

    setHudVisible(visible) {
        [this.timerText, this.targetText, this.levelText, this.deathText, this.text].forEach(
            (element) => {
                if (element && typeof element.setVisible === 'function') {
                    element.setVisible(visible);
                }
            }
        );
        if (visible && this.text) {
            this.text.setAlpha(1);
        }
    }

    updateGamepadStatus() {
        this.overlays.updateGamepadStatus();
    }

    layoutTitleScreen() {
        this.overlays.layoutTitleScreen();
    }

    placeTitleCluster(centerX, centerY, metrics) {
        this.overlays.placeTitleCluster(centerX, centerY, metrics);
    }

    titleModeLift(metrics) {
        return this.overlays.titleModeLift(metrics);
    }

    positionRaceSetupButton(metrics) {
        return this.overlays.positionRaceSetupButton(metrics);
    }

    setRaceSetupLabel() {
        this.overlays.setRaceSetupLabel();
    }

    createRaceSetup() {
        this.overlays.createRaceSetup();
    }

    handleMenuInput(input) {
        return this.overlays.handleMenuInput(input);
    }

    handleFinishMenu(menu) {
        return this.overlays.handleFinishMenu(menu);
    }

    hideTitleScreen() {
        this.overlays.hideTitleScreen();
    }

    showLevelBanner(levelOrTitle, subtitle, holdMs = GAME_CONSTANTS.LEVEL_BANNER_HOLD_MS) {
        if (this.destroyed) {
            return;
        }
        this.clearLevelBanner();
        const title =
            typeof levelOrTitle === 'number' ? `LEVEL ${levelOrTitle}` : String(levelOrTitle);
        const metrics = this.getLayoutMetrics();
        this.bannerTitle = this.scene.add
            .text(0, 0, title, {
                fontSize: `${metrics.fonts.banner}px`,
                fontFamily: BANNER_FONT,
                fill: '#ffe566',
                align: 'center',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(GAME_CONSTANTS.OVERLAY_DEPTH + 1)
            .setAlpha(0);
        this.styleHudText(this.bannerTitle, 7);
        this.markUi(this.bannerTitle);
        if (subtitle) {
            this.bannerSubtitle = this.scene.add
                .text(0, 0, subtitle, {
                    fontSize: `${metrics.fonts.bannerSubtitle}px`,
                    fontFamily: BANNER_FONT,
                    fill: '#ffffff',
                    align: 'center',
                })
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(GAME_CONSTANTS.OVERLAY_DEPTH + 1)
                .setAlpha(0);
            this.styleHudText(this.bannerSubtitle, 4);
            this.markUi(this.bannerSubtitle);
        }
        this.layoutLevelBanner();
        const targets = [this.bannerTitle, this.bannerSubtitle].filter(
            (pad) => pad && pad.connected !== false
        );
        if (this.scene.tweens && typeof this.scene.tweens.add === 'function') {
            this.scene.tweens.add({
                targets,
                alpha: 1,
                duration: 220,
                ease: 'Quad.easeOut',
            });
        } else {
            targets.forEach((target) => target.setAlpha(1));
        }
        if (this.scene.time && typeof this.scene.time.delayedCall === 'function') {
            this.bannerHideEvent = this.scene.time.delayedCall(holdMs, () =>
                this.fadeLevelBanner()
            );
        }
    }

    layoutLevelBanner() {
        if (!this.bannerTitle) {
            return;
        }
        const insets = this.getSafeAreaInsets();
        const metrics = this.getLayoutMetrics();
        const centerX = insets.left + metrics.innerWidth / 2;
        const bannerRatio =
            metrics.isPortrait && metrics.innerWidth <= 360
                ? 0.38
                : metrics.isCompact
                  ? 0.22
                  : 0.28;
        const centerY = insets.top + metrics.innerHeight * bannerRatio;
        const maxWidth = Math.max(160, metrics.innerWidth - 24);
        this.applyFontSize(this.bannerTitle, metrics.fonts.banner);
        if (typeof this.bannerTitle.setWordWrapWidth === 'function') {
            this.bannerTitle.setWordWrapWidth(maxWidth, true);
        }
        this.applyFontSize(this.bannerSubtitle, metrics.fonts.bannerSubtitle);
        this.bannerTitle.setPosition(centerX, centerY);
        if (this.bannerSubtitle) {
            this.bannerSubtitle.setPosition(
                centerX,
                centerY + (this.bannerTitle.displayHeight || 36) * 0.6 + 12
            );
        }
    }

    fadeLevelBanner() {
        const targets = [this.bannerTitle, this.bannerSubtitle].filter(
            (pad) => pad && pad.connected !== false
        );
        if (!targets.length) {
            return;
        }
        if (this.scene.tweens && typeof this.scene.tweens.add === 'function') {
            this.scene.tweens.add({
                targets,
                alpha: 0,
                duration: 360,
                ease: 'Quad.easeIn',
                onComplete: () => this.clearLevelBanner(),
            });
            return;
        }
        this.clearLevelBanner();
    }

    clearLevelBanner() {
        if (this.bannerHideEvent && typeof this.bannerHideEvent.remove === 'function') {
            this.bannerHideEvent.remove(false);
        }
        this.bannerHideEvent = null;
        [this.bannerTitle, this.bannerSubtitle].forEach((element) => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.bannerTitle = null;
        this.bannerSubtitle = null;
    }

    scheduleInstructionFade() {
        if (this.instructionFadeEvent && typeof this.instructionFadeEvent.remove === 'function') {
            this.instructionFadeEvent.remove(false);
        }
        if (!this.text || !this.scene.time || typeof this.scene.time.delayedCall !== 'function') {
            return;
        }
        this.text.setAlpha(1);
        this.text.setVisible(false);
        const revealDelay =
            GAME_CONSTANTS.LEVEL_BANNER_HOLD_MS + GAME_CONSTANTS.INSTRUCTION_FADE_MS;
        this.instructionFadeEvent = this.scene.time.delayedCall(revealDelay, () => {
            if (!this.text || this.destroyed) {
                return;
            }
            this.text.setVisible(true);
            this.text.setAlpha(1);
            this.instructionFadeEvent = this.scene.time.delayedCall(
                GAME_CONSTANTS.INSTRUCTION_DISPLAY_MS,
                () => this.fadeInstructionText()
            );
        });
    }

    fadeInstructionText() {
        if (!this.text || this.destroyed) {
            return;
        }
        if (this.scene.tweens && typeof this.scene.tweens.add === 'function') {
            this.scene.tweens.add({
                targets: this.text,
                alpha: 0,
                duration: GAME_CONSTANTS.INSTRUCTION_FADE_MS,
                onComplete: () => {
                    if (this.text) {
                        this.text.setVisible(false);
                    }
                },
            });
            return;
        }
        this.text.setVisible(false);
    }

    cleanup() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;

        if (this.instructionFadeEvent?.remove) {
            this.instructionFadeEvent.remove(false);
        }
        this.instructionFadeEvent = null;
        this.overlays.cleanup();
        this.clearLevelBanner();

        const elements = [
            this.timerText,
            this.targetText,
            this.levelText,
            this.deathText,
            this.text,
            this.playerNameText,
            this.musicToggleButton,
            this.leaderboardButton,
            this.jumpButton,
            this.phaserButton,
            this.weaponButton,
            this.leftButton,
            this.rightButton,
        ];

        elements.forEach((element) => {
            if (element && element.destroy) {
                element.destroy();
            }
        });

        this.timerText = null;
        this.targetText = null;
        this.levelText = null;
        this.deathText = null;
        this.text = null;
        this.playerNameText = null;
        this.musicToggleButton = null;
        this.leaderboardButton = null;
        this.jumpButton = null;
        this.phaserButton = null;
        this.weaponButton = null;
        this.leftButton = null;
        this.rightButton = null;
    }
}
