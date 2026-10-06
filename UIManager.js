import { GAME_CONSTANTS } from './Constants.js';
import { LEVEL_IDS } from './levels/index.js';
import { formatElapsedTime, weaponsForLevel } from './GameUtils.js';

const HUD_FONT = 'Trebuchet MS, Arial, sans-serif';
const BANNER_FONT = 'Trebuchet MS, Arial, sans-serif';

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
        this.leaderboardTextObject = null;
        this.leaderboardBackdrop = null;
        this.finishBackdrop = null;
        this.finishDim = null;
        this.finishTitle = null;
        this.finishSummary = null;
        this.finishRetryButton = null;
        this.finishNewGameButton = null;
        this.leaderboardTextContent = '';
        this.leaderboardVisible = false;
        this.leaderboardRequestId = 0;
        this.leaderboardPage = 0;
        this.completionSummary = '';
        this.fullRunSummary = '';
        this.jumpButton = null;
        this.phaserButton = null;
        this.weaponButton = null;
        this.leftButton = null;
        this.rightButton = null;
        this.touchControlsEnabled = false;
        this.touchMovementMidpoint = 0;
        this.titleDim = null;
        this.titleText = null;
        this.titleSubtitle = null;
        this.titlePrompt = null;
        this.titleControls = null;
        this.titleGamepadStatus = null;
        this.titlePromptTween = null;
        this.playerName = '';
        this.bannerTitle = null;
        this.bannerSubtitle = null;
        this.bannerHideEvent = null;
        this.instructionFadeEvent = null;
        this.destroyed = false;
        this.lastTimerDisplay = '';
        this.cachedInsets = null;
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
        const width = this.scene.getViewportWidth();
        const height = this.scene.getViewportHeight();
        return {
            width,
            height,
            innerWidth: width,
            innerHeight: height,
            shortest: Math.min(width, height),
            isPortrait: height > width,
            isCompact: width < GAME_CONSTANTS.HUD_COMPACT_WIDTH,
            isTiny: width < GAME_CONSTANTS.HUD_TINY_WIDTH,
            hudScale: 1,
            controlSize: GAME_CONSTANTS.VIRTUAL_BUTTON_SIZE,
            controlMargin: GAME_CONSTANTS.TOUCH_CONTROL_MARGIN,
            hudPadding: 16,
            musicButtonSize: GAME_CONSTANTS.MUSIC_BUTTON_SIZE,
            fonts: {
                timer: 32,
                level: 22,
                death: 18,
                instructions: 16,
                playerName: 18,
                leaderboardButton: 18,
                leaderboard: 16,
                title: 56,
                subtitle: 22,
                prompt: 20,
                banner: 42,
                bannerSubtitle: 20,
            },
        };
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
            this.titleDim,
            this.titleText,
            this.titleSubtitle,
            this.titlePrompt,
            this.titleControls,
            this.titleGamepadStatus,
            this.bannerTitle,
            this.bannerSubtitle,
            this.leaderboardTextObject,
            this.leaderboardBackdrop,
            this.finishBackdrop,
            this.finishDim,
            this.finishTitle,
            this.finishSummary,
            this.finishRetryButton,
            this.finishNewGameButton,
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
        const backgroundColor = this.leaderboardVisible ? '#244c65' : '#14283e';
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

        jumpButton.on('pointerup', (pointer) => {
            if (pointer.id === this.scene.jumpPointerId) {
                this.scene.jumpPointerId = null;
            }
            jumpButton.clearTint();
        });

        jumpButton.on('pointerout', (pointer) => {
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
        const release = (pointer) => {
            if (!pointer || pointer.id === this.scene.phaserPointerId) {
                this.scene.phaserPointerId = null;
                this.scene.phaserHeld = false;
            }
            button.clearTint();
        };
        button.on('pointerup', release);
        button.on('pointerout', release);
        button.on('pointerupoutside', release);
        return button;
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
        if (narrowPortrait && !this.titleText) {
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
        const nameX = this.titleText
            ? insets.left + metrics.innerWidth / 2
            : width - insets.right - padding;
        const nameY = topRightBottom + 8 + this.playerNameText.displayHeight * 0.5;
        this.playerNameText.setPosition(nameX, nameY);
        this.playerNameText.setWordWrapWidth?.(
            this.titleText
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

        let controlSize = metrics.controlSize;
        const margin = metrics.controlMargin;
        const gap = Math.max(16, Math.round(margin * 0.7));
        // Reserve two gaps, including the gap between movement and jump.
        controlSize = Math.min(
            controlSize,
            Math.max(44, Math.floor((metrics.innerWidth - margin * 2 - gap * 2) / 3))
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
            this.phaserButton.setDisplaySize(controlSize, controlSize);
            this.phaserButton.setPosition(this.jumpButton.x, buttonY - controlSize - gap);
            this.expandControlHitArea(this.phaserButton, controlSize, hitPadding);
        }
        if (this.weaponButton && this.phaserButton) {
            const small = controlSize * 0.62;
            this.weaponButton.setDisplaySize(small, small);
            this.weaponButton.setPosition(
                this.phaserButton.x - controlSize / 2 - gap - small / 2,
                this.phaserButton.y
            );
            this.expandControlHitArea(this.weaponButton, small, hitPadding);
        }
    }

    layoutLeaderboard() {
        if (!this.leaderboardTextObject) {
            return;
        }
        const insets = this.getSafeAreaInsets();
        const metrics = this.getLayoutMetrics();
        const width = metrics.width;
        const height = metrics.height;
        const availableWidth = Math.max(180, metrics.innerWidth - (metrics.isCompact ? 24 : 48));
        this.leaderboardTextObject.setWordWrapWidth(availableWidth, true);
        this.applyFontSize(this.leaderboardTextObject, metrics.fonts.leaderboard);
        const centerX = insets.left + metrics.innerWidth / 2;
        const top = this.leaderboardTop(metrics, insets);
        this.leaderboardTextObject.setPosition(centerX, top);
        this.drawLeaderboardBackdrop(centerX, top, availableWidth, width, height, insets);
    }

    leaderboardTop(metrics, insets) {
        const bottoms = [insets.top + (metrics.isCompact ? 56 : 80)];
        if (this.deathText) {
            bottoms.push(this.deathText.y + (this.deathText.height || 0));
        }
        if (this.playerNameText) {
            bottoms.push(this.playerNameText.y + (this.playerNameText.displayHeight || 0) * 0.5);
        }
        if (this.musicToggleButton) {
            bottoms.push(
                this.musicToggleButton.y + (this.musicToggleButton.displayHeight || 0) * 0.5
            );
        }
        if (this.text && this.text.visible && this.text.alpha > 0.2) {
            bottoms.push(this.text.y + (this.text.height || 0));
        }
        return Math.max(...bottoms) + (metrics.isCompact ? 24 : 28);
    }

    drawLeaderboardBackdrop(centerX, top, availableWidth, width, height, insets) {
        if (!this.leaderboardBackdrop) {
            return;
        }
        this.leaderboardBackdrop.clear();
        this.leaderboardBackdrop.fillStyle(0x000000, 0.45);
        this.leaderboardBackdrop.fillRect(0, 0, width, height);
        const panelWidth = Math.min(availableWidth, 520);
        const panelHeight = Math.min(
            this.leaderboardTextObject.height + 36,
            height - insets.top - insets.bottom - 120
        );
        const panelX = centerX - panelWidth / 2;
        const panelY = top - 18;
        this.leaderboardBackdrop.fillStyle(0x0b1020, 0.98);
        if (typeof this.leaderboardBackdrop.fillRoundedRect === 'function') {
            this.leaderboardBackdrop.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 14);
        } else {
            this.leaderboardBackdrop.fillRect(panelX, panelY, panelWidth, panelHeight);
        }
        this.leaderboardBackdrop.lineStyle(2, 0xffe566, 0.35);
        if (typeof this.leaderboardBackdrop.strokeRoundedRect === 'function') {
            this.leaderboardBackdrop.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 14);
        } else {
            this.leaderboardBackdrop.strokeRect(panelX, panelY, panelWidth, panelHeight);
        }
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
        if (this.titleSubtitle) {
            const metrics = this.getLayoutMetrics();
            const fullBest = this.scene.leaderboardManager?.getPersonalBest?.(0);
            const fullBestText = fullBest === null ? 'none yet' : formatElapsedTime(fullBest);
            const fullRecordText = fullRecord
                ? `Run #1 ${formatElapsedTime(fullRecord.time)}`
                : 'Claim full-run #1';
            const challenge = `${fullRecordText} · Best ${fullBestText}`;
            this.titleSubtitle.setText(
                metrics.isCompact && !metrics.isPortrait
                    ? challenge
                    : `${this.scene.levelConfig.title}\n${challenge}`
            );
            this.layoutTitleScreen();
        }
        this.layoutUI();
    }

    showLevelResult(title, time, submission) {
        this.completionSummary = `${title} · ${formatElapsedTime(time)}`;
        if (this.scene.levelConfig.nextLevel) {
            this.showLevelBanner(title, formatElapsedTime(time), 2800);
            this.bannerTitle?.setAlpha(1);
            this.bannerSubtitle?.setAlpha(1);
        }
        Promise.resolve(submission).then((result) => {
            if (this.destroyed || !result?.rank) return;
            const bestTime = result.personalBest?.time || time;
            const next = result.next
                ? ` · ${formatElapsedTime(bestTime - result.next.time)} behind ${result.next.name}`
                : ' · YOU ARE #1';
            const ranks = `All-time #${result.rank} · Weekly #${result.weeklyRank}`;
            this.completionSummary += `\n${ranks}\n${next.replace(/^ · /, '')}`;
            if (this.bannerSubtitle) {
                this.bannerSubtitle.setText(`${formatElapsedTime(time)} · ${ranks}${next}`);
                this.layoutLevelBanner();
            }
            this.updateFinishSummary();
            if (this.leaderboardVisible) this.displayLeaderboard();
        });
    }

    showFullRunResult(time, submission) {
        this.fullRunSummary = `FULL RUN · ${formatElapsedTime(time)} · ZERO DEATHS`;
        Promise.resolve(submission).then((result) => {
            if (this.destroyed || !result?.rank) return;
            this.fullRunSummary += `\nAll-time #${result.rank} · Weekly #${result.weeklyRank}`;
            this.updateFinishSummary();
            if (this.leaderboardVisible) this.displayLeaderboard();
        });
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
            this.titleText ? `CHANGE NAME: ${this.playerName}` : `Player: ${this.playerName}`
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
        if (this.leaderboardVisible) {
            this.hideLeaderboard();
        } else {
            this.displayLeaderboard();
        }
    }

    hideLeaderboard() {
        if (this.leaderboardTextObject) {
            this.leaderboardTextObject.destroy();
        }
        if (this.leaderboardBackdrop) {
            this.leaderboardBackdrop.destroy();
        }
        this.leaderboardTextObject = null;
        this.leaderboardBackdrop = null;
        this.leaderboardTextContent = '';
        this.leaderboardVisible = false;
        this.leaderboardRequestId = 0;
        this.refreshLeaderboardButtonStyle();
        this.setFinishVisible(this.scene.gameOver);
    }

    displayLeaderboard() {
        this.clearLevelBanner();
        this.setFinishVisible(false);
        const requestId = Date.now() + Math.random();
        this.leaderboardRequestId = requestId;
        const updateTextObject = (sectionsText) => {
            if (this.destroyed || this.leaderboardRequestId !== requestId) {
                return;
            }
            const leaderboardText = `LEADERBOARD\n${sectionsText}`;
            this.leaderboardTextContent = leaderboardText;
            if (this.leaderboardTextObject) {
                this.leaderboardTextObject.destroy();
            }
            if (!this.leaderboardBackdrop) {
                this.leaderboardBackdrop = this.scene.add.graphics();
                this.leaderboardBackdrop.setScrollFactor(0);
                this.leaderboardBackdrop.setDepth(GAME_CONSTANTS.LEADERBOARD_OVERLAY_DEPTH - 1);
                this.markUi(this.leaderboardBackdrop);
            }
            const metrics = this.getLayoutMetrics();
            this.leaderboardTextObject = this.scene.add
                .text(0, 0, leaderboardText, {
                    fontSize: `${metrics.fonts.leaderboard}px`,
                    fontFamily: HUD_FONT,
                    fill: '#ffe566',
                    align: 'center',
                })
                .setOrigin(0.5, 0)
                .setScrollFactor(0);
            this.leaderboardTextObject.setDepth(GAME_CONSTANTS.LEADERBOARD_OVERLAY_DEPTH);
            this.leaderboardTextObject.setInteractive({ useHandCursor: true });
            this.leaderboardTextObject.on('pointerup', () => {
                this.leaderboardPage = (this.leaderboardPage + 1) % this.leaderboardPageCount();
                this.displayLeaderboard();
            });
            this.styleHudText(this.leaderboardTextObject, 4);
            this.markUi(this.leaderboardTextObject);
            this.layoutLeaderboard();
            this.leaderboardVisible = true;
            this.refreshLeaderboardButtonStyle();
        };

        const buildSections = (competition) => {
            const level = this.leaderboardPage;
            const metrics = this.getLayoutMetrics();
            const compactLandscape = metrics.isCompact && !metrics.isPortrait;
            const visibleCount = metrics.isTiny ? 2 : metrics.isCompact ? 3 : 5;
            const label = level === 0 ? 'FULL RUN · ZERO DEATHS' : `LEVEL ${level}`;
            const remoteTimes = competition?.levels?.[level] || [];
            const best = this.scene.leaderboardManager.getPersonalBest(level);
            const localTimes =
                level === 0
                    ? best === null
                        ? []
                        : [{ time: best, name: this.scene.playerName }]
                    : this.scene.leaderboardManager.readLeaderboard(level);
            const allTime = remoteTimes.length ? remoteTimes : localTimes;
            const allTimeLabel =
                remoteTimes.length || !localTimes.length ? 'ALL TIME' : 'THIS BROWSER';
            const weekly = competition?.weekly?.[level] || [];
            const winners = competition?.hallOfFame?.[level] || [];
            const format = (times) =>
                times.length
                    ? this.scene.leaderboardManager.formatTimes(times.slice(0, visibleCount))
                    : 'No times yet';
            const weeklyTimes = weekly.slice(0, visibleCount);
            const past = winners.length
                ? winners
                      .slice(0, metrics.isCompact ? 1 : 2)
                      .map(
                          (winner) =>
                              `${winner.week}: ${formatElapsedTime(winner.time)} - ${winner.name}`
                      )
                      .join('\n')
                : 'No past winners yet';
            const bestLine =
                best === null ? 'Your best: none yet' : `Your best: ${formatElapsedTime(best)}`;
            const footer = 'Tap / D-pad: next · B / LEADERBOARD: close';
            const history =
                !competition || (compactLandscape && this.scene.gameOver)
                    ? ''
                    : `\nPAST WINNERS\n${past}`;
            const weekLabel = competition
                ? `THIS WEEK (${competition.week || 'UTC'})`
                : 'ONLINE BOARD UNAVAILABLE';
            const weekTimes = competition ? format(weeklyTimes) : 'Try again later';
            return `${label}\n${bestLine}\n${allTimeLabel}\n${format(allTime)}\n${weekLabel}\n${weekTimes}${history}\n${footer}`;
        };

        updateTextObject('Loading leaderboard…');

        this.scene.leaderboardManager
            .fetchCompetition()
            .then((competition) => {
                if (this.leaderboardRequestId !== requestId) {
                    return;
                }
                const sectionsText = buildSections(competition);
                updateTextObject(sectionsText);
            })
            .catch(() => {
                if (this.leaderboardRequestId !== requestId) {
                    return;
                }
                const fallback = this.scene.storageAvailable
                    ? buildSections(null)
                    : 'Saved times unavailable (local storage disabled).';
                updateTextObject(fallback);
            });
    }

    leaderboardPageCount() {
        return LEVEL_IDS.length + 1;
    }

    showGameOver(finalTime) {
        this.leaderboardPage = this.fullRunSummary ? 0 : this.scene.level;
        this.finishLevelTime = finalTime;
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
        this.createFinishScreen(raceWinner);
        this.layoutUI();
    }

    createFinishScreen(raceWinner) {
        const depth = GAME_CONSTANTS.OVERLAY_DEPTH;
        this.finishDim = this.markUi(this.scene.add.rectangle(0, 0, 1, 1, 0x020814, 0.68));
        this.finishDim.setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
        this.finishBackdrop = this.markUi(this.scene.add.rectangle(0, 0, 1, 1, 0x101b30, 0.98));
        this.finishBackdrop.setStrokeStyle(2, 0xffe566, 0.55);
        this.finishBackdrop.setScrollFactor(0).setDepth(depth + 1);
        this.finishTitle = this.markUi(
            this.scene.add.text(0, 0, raceWinner ? `PLAYER ${raceWinner} WINS` : 'YOU WIN', {
                fontFamily: BANNER_FONT,
                fontSize: '30px',
                fill: '#ffe566',
                align: 'center',
            })
        );
        this.finishTitle
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(depth + 2);
        this.styleHudText(this.finishTitle, 5);
        this.finishSummary = this.markUi(
            this.scene.add.text(0, 0, '', {
                fontFamily: HUD_FONT,
                fontSize: '17px',
                fill: '#e0efff',
                align: 'center',
                lineSpacing: 4,
            })
        );
        this.finishSummary
            .setOrigin(0.5, 0)
            .setScrollFactor(0)
            .setDepth(depth + 2);
        this.finishRetryButton = this.createFinishButton(
            `RETRY LEVEL ${this.scene.level}`,
            this.scene.level
        );
        this.finishNewGameButton = this.createFinishButton('NEW FULL GAME', 1);
        this.finishMenuIndex = 0;
        this.finishRetryButton.setBackgroundColor('#47738c');
        this.updateFinishSummary();
        this.layoutFinishScreen();
    }

    createFinishButton(label, level) {
        const button = this.markUi(
            this.scene.add.text(0, 0, label, {
                fontFamily: HUD_FONT,
                fontSize: '17px',
                fill: '#ffe566',
                backgroundColor: '#244c65',
                align: 'center',
            })
        );
        button.setOrigin(0.5).setPadding(16, 13, 16, 13);
        button.setScrollFactor(0).setDepth(GAME_CONSTANTS.OVERLAY_DEPTH + 4);
        button.setInteractive({ useHandCursor: true });
        button.on('pointerup', () => {
            if (!this.scene.restartDelayDone) return;
            this.scene.scene.restart({ level, deathCount: 0, coopMode: this.scene.coopMode });
        });
        return button;
    }

    updateFinishSummary() {
        if (!this.finishSummary) return;
        const lines = [
            `Level ${this.scene.level} · ${formatElapsedTime(this.finishLevelTime)} · Deaths ${this.scene.deathCount}`,
        ];
        if (this.fullRunSummary) {
            lines.push(this.fullRunSummary.split('\n')[0]);
        } else if (this.completionSummary) {
            lines.push(this.completionSummary.split(' · ')[0]);
        }
        const rank = (this.fullRunSummary || this.completionSummary)
            .split('\n')
            .find((line) => line.includes('All-time #'));
        if (rank) lines.push(rank);
        this.finishSummary.setText(lines.join('\n'));
        this.layoutFinishScreen();
    }

    setFinishVisible(visible) {
        [
            this.finishDim,
            this.finishBackdrop,
            this.finishTitle,
            this.finishSummary,
            this.finishRetryButton,
            this.finishNewGameButton,
        ].forEach((element) => element?.setVisible?.(visible));
        for (const button of [this.finishRetryButton, this.finishNewGameButton]) {
            if (button?.input) button.input.enabled = visible;
        }
    }

    layoutFinishScreen() {
        if (!this.finishBackdrop) return;
        const metrics = this.getLayoutMetrics();
        const insets = this.getSafeAreaInsets();
        const landscape = metrics.innerHeight < 500 && !metrics.isPortrait;
        const panelWidth = Math.min(480, metrics.innerWidth - 24);
        const panelHeight = landscape ? 206 : metrics.isTiny ? 250 : 268;
        const controlsTop =
            this.touchControlsEnabled && this.jumpButton
                ? this.jumpButton.y - this.jumpButton.displayHeight / 2 - 12
                : metrics.height - insets.bottom;
        const panelTop = Math.max(insets.top + 70, (controlsTop - panelHeight) / 2);
        const centerX = insets.left + metrics.innerWidth / 2;
        this.finishDim.setSize(metrics.width, metrics.height);
        this.finishBackdrop.setPosition(centerX, panelTop + panelHeight / 2);
        this.finishBackdrop.setSize(panelWidth, panelHeight);
        this.finishTitle.setPosition(centerX, panelTop + 38);
        this.finishTitle.setFontSize(landscape || metrics.isTiny ? 26 : 30);
        this.finishSummary.setPosition(centerX, panelTop + 70);
        this.finishSummary.setFontSize(landscape || metrics.isTiny ? 14 : 16);
        this.finishSummary.setWordWrapWidth(panelWidth - 28, true);
        if (landscape) {
            this.finishRetryButton.setPosition(centerX - panelWidth / 4, panelTop + 169);
            this.finishNewGameButton.setPosition(centerX + panelWidth / 4, panelTop + 169);
        } else {
            this.finishRetryButton.setPosition(centerX, panelTop + panelHeight - 96);
            this.finishNewGameButton.setPosition(centerX, panelTop + panelHeight - 43);
        }
    }

    showTitleScreen(subtitle) {
        if (this.destroyed) {
            return;
        }
        this.hideTitleScreen();
        const width = this.scene.getViewportWidth();
        const height = this.scene.getViewportHeight();
        if (typeof this.scene.add.rectangle === 'function') {
            this.titleDim = this.scene.add.rectangle(0, 0, width, height, 0x04060d, 0.58);
            this.titleDim.setOrigin(0, 0);
        } else {
            this.titleDim = this.scene.add.graphics();
            this.titleDim.fillStyle(0x04060d, 0.58);
            this.titleDim.fillRect(0, 0, width, height);
        }
        this.titleDim.setScrollFactor(0);
        this.titleDim.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH - 2);
        if (typeof this.titleDim.setInteractive === 'function') {
            this.titleDim.setInteractive();
            this.titleDim.on('pointerup', (pointer) => this.scene.onTitlePointerUp(pointer));
        }
        this.markUi(this.titleDim);

        const metrics = this.getLayoutMetrics();
        this.titleText = this.scene.add
            .text(0, 0, 'SPACE CHICKEN', {
                fontSize: `${metrics.fonts.title}px`,
                fontFamily: BANNER_FONT,
                fill: '#fff1a6',
                fontStyle: 'bold',
                align: 'center',
            })
            .setOrigin(0.5);
        this.titleText.setScrollFactor(0);
        this.titleText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH - 1);
        this.styleHudText(this.titleText, 8);
        this.markUi(this.titleText);

        this.titleSubtitle = this.scene.add
            .text(0, 0, subtitle || 'Dawn Run', {
                fontSize: `${metrics.fonts.subtitle}px`,
                fontFamily: BANNER_FONT,
                fill: '#cfe7ff',
                align: 'center',
            })
            .setOrigin(0.5);
        this.titleSubtitle.setScrollFactor(0);
        this.titleSubtitle.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH - 1);
        this.styleHudText(this.titleSubtitle, 4);
        this.markUi(this.titleSubtitle);

        const prompt = this.touchControlsEnabled
            ? 'TAP TO START'
            : 'PRESS SPACE OR GAMEPAD A TO START';
        this.titlePrompt = this.scene.add
            .text(0, 0, prompt, {
                fontSize: `${metrics.fonts.prompt}px`,
                fontFamily: HUD_FONT,
                fill: '#ffffff',
                align: 'center',
            })
            .setOrigin(0.5);
        this.titlePrompt.setScrollFactor(0);
        this.titlePrompt.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH - 1);
        this.titlePrompt.setPadding(16, 10, 16, 10);
        this.titlePrompt.setBackgroundColor('#17334b');
        this.styleHudText(this.titlePrompt, 4);
        this.markUi(this.titlePrompt);
        const controls = this.touchControlsEnabled
            ? 'MOVE  Hold the arrows\nJUMP  Tap JUMP; tap again in air\nMODES  Gold button for a 2-player race\nGOAL  Reach the golden crown'
            : 'MOVE  ← / → or A / D\nJUMP  Space / ↑ / W; press again in air\nPAUSE  Esc / P or gamepad Start\nMODES  Gold button or D-pad ↓';
        this.titleControls = this.scene.add
            .text(0, 0, controls, {
                fontSize: `${metrics.fonts.instructions}px`,
                fontFamily: HUD_FONT,
                fill: '#e0efff',
                align: 'center',
                lineSpacing: 5,
            })
            .setOrigin(0.5, 0);
        this.titleControls.setScrollFactor(0);
        this.titleControls.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH - 1);
        this.styleHudText(this.titleControls, 3);
        this.markUi(this.titleControls);

        this.titleGamepadStatus = this.scene.add
            .text(0, 0, '', {
                fontSize: `${metrics.fonts.instructions}px`,
                fontFamily: HUD_FONT,
                fill: '#a9bfd5',
                align: 'center',
            })
            .setOrigin(0.5, 0);
        this.titleGamepadStatus.setScrollFactor(0);
        this.titleGamepadStatus.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH - 1);
        this.styleHudText(this.titleGamepadStatus, 3);
        this.markUi(this.titleGamepadStatus);
        this.updateGamepadStatus();

        this.playerNameText.setOrigin(0.5);
        this.playerNameText.setPadding(12, 8, 12, 8);
        this.playerNameText.setBackgroundColor('#17334b');
        this.playerNameText.setDepth(GAME_CONSTANTS.LEADERBOARD_BUTTON_DEPTH);
        this.playerNameText.setVisible(true);
        this.updatePlayerName(this.playerName);
        if (this.scene.tweens && typeof this.scene.tweens.add === 'function') {
            this.titlePromptTween = this.scene.tweens.add({
                targets: this.titlePrompt,
                alpha: { from: 0.72, to: 1 },
                duration: GAME_CONSTANTS.TITLE_PROMPT_PULSE_MS,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }
        this.setHudVisible(false);
        this.createRaceSetup();
        this.layoutTitleScreen();
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
        if (!this.titleGamepadStatus) {
            return;
        }
        const supportsGamepads =
            typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';
        const pads = supportsGamepads ? navigator.getGamepads() : [];
        const connected = Array.from(pads || []).filter((pad) => pad && pad.connected !== false);
        const message = !supportsGamepads
            ? 'Gamepad unavailable in this browser'
            : connected.length
              ? `GAMEPAD CONNECTED (${connected.length})  ·  A start · ↓ other modes · Y leaderboard`
              : 'No gamepad connected';
        if (this.titleGamepadStatus.text !== message) {
            this.titleGamepadStatus.setText(message);
            this.titleGamepadStatus.setColor(connected.length ? '#a4f5ca' : '#a9bfd5');
            this.layoutTitleScreen();
        }
    }

    layoutTitleScreen() {
        if (!this.titleText) {
            return;
        }
        const insets = this.getSafeAreaInsets();
        const metrics = this.getLayoutMetrics();
        const width = metrics.width;
        const height = metrics.height;
        const centerX = insets.left + metrics.innerWidth / 2;
        const verticalRatio = metrics.isPortrait ? 0.46 : metrics.isCompact ? 0.38 : 0.48;
        const centerY =
            insets.top +
            metrics.innerHeight * verticalRatio +
            (metrics.isCompact && !metrics.isPortrait ? 18 : 0);
        const maxTitleWidth = Math.max(160, metrics.innerWidth - 24);
        this.applyFontSize(this.titleText, metrics.fonts.title);
        if (typeof this.titleText.setWordWrapWidth === 'function') {
            this.titleText.setWordWrapWidth(maxTitleWidth, true);
        }
        if (this.titleText.width > maxTitleWidth && this.scene.viewport) {
            const fitted = this.scene.viewport.fitFontSize(
                metrics.fonts.title,
                this.titleText.width,
                maxTitleWidth,
                22
            );
            this.applyFontSize(this.titleText, fitted);
        }
        this.applyFontSize(this.titleSubtitle, metrics.fonts.subtitle);
        this.applyFontSize(this.titlePrompt, metrics.fonts.prompt);
        this.applyFontSize(this.titleControls, metrics.fonts.instructions);
        this.applyFontSize(this.titleGamepadStatus, metrics.fonts.instructions);
        if (this.titlePrompt?.setWordWrapWidth) {
            this.titlePrompt.setWordWrapWidth(maxTitleWidth, true);
        }
        this.titleControls?.setWordWrapWidth?.(maxTitleWidth, true);
        this.titleGamepadStatus?.setWordWrapWidth?.(maxTitleWidth, true);
        if (this.titleDim) {
            if (typeof this.titleDim.setSize === 'function') {
                this.titleDim.setSize(width, height);
                this.titleDim.setPosition(0, 0);
            } else if (typeof this.titleDim.clear === 'function') {
                this.titleDim.clear();
                this.titleDim.fillStyle(0x04060d, 0.58);
                this.titleDim.fillRect(0, 0, width, height);
            }
        }
        this.placeTitleCluster(centerX, centerY, metrics);
    }

    placeTitleCluster(centerX, centerY, metrics) {
        const titleOffset = metrics.isCompact ? 36 : 46;
        const modeLift = this.titleModeLift(metrics);
        this.titleText.setPosition(centerX, centerY - titleOffset - modeLift);
        if (this.titleSubtitle) {
            const subtitleY =
                this.titleText.y +
                (this.titleText.displayHeight || this.titleText.height || 40) * 0.5 +
                (metrics.isCompact ? 14 : 18);
            this.titleSubtitle.setPosition(centerX, subtitleY);
        }
        if (this.titlePrompt) {
            const subtitleBottom = this.titleSubtitle
                ? this.titleSubtitle.y + this.titleSubtitle.displayHeight / 2
                : centerY + 8;
            this.titlePrompt.setPosition(
                centerX,
                subtitleBottom + 14 + this.titlePrompt.displayHeight / 2
            );
        }
        const shortLandscape = metrics.isCompact && !metrics.isPortrait;
        if (this.titleControls && this.titlePrompt) {
            const belowPrompt = this.titlePrompt.y + this.titlePrompt.displayHeight / 2;
            const modeSpace = this.positionRaceSetupButton(metrics);
            const fallbackGap = metrics.isTiny ? 12 : 20;
            this.titleControls.setPosition(centerX, belowPrompt + (modeSpace || fallbackGap));
            this.titleControls.setVisible(!shortLandscape);
        }
        if (this.titleGamepadStatus && this.titleControls) {
            const gap = metrics.isTiny ? 8 : 14;
            this.titleGamepadStatus.setPosition(
                centerX,
                this.titleControls.y + this.titleControls.displayHeight + gap
            );
            this.titleGamepadStatus.setVisible(!shortLandscape);
        }
    }

    titleModeLift(metrics) {
        if (!this.raceSetupButton) {
            return 0;
        }
        if (!metrics.isCompact) {
            return 96;
        }
        return metrics.isPortrait ? 22 : 0;
    }

    positionRaceSetupButton(metrics) {
        const button = this.raceSetupButton;
        if (!button || !this.titlePrompt) {
            return 0;
        }
        const gapAbove = metrics.isTiny ? 8 : 14;
        const gapBelow = metrics.isTiny ? 8 : 12;
        const top = this.titlePrompt.y + (this.titlePrompt.displayHeight || 0) / 2 + gapAbove;
        button.style.top = `${Math.round(top)}px`;
        const height = Math.max(button.offsetHeight || 0, metrics.isCompact ? 50 : 68);
        return gapAbove + height + gapBelow;
    }

    setRaceSetupLabel() {
        const button = this.raceSetupButton;
        if (!button) {
            return;
        }
        const coop = Boolean(this.scene.coopMode);
        const kicker = document.createElement('span');
        kicker.className = 'race-setup-kicker';
        kicker.textContent = 'OTHER MODES';
        const mode = document.createElement('span');
        mode.className = 'race-setup-mode';
        mode.textContent = coop ? 'Now: 2 players' : 'Now: solo · 2-player race';
        button.replaceChildren(kicker, mode);
        button.setAttribute(
            'aria-label',
            coop
                ? 'Other modes. Current game is 2 players.'
                : 'Other modes. Current game is solo. Choose a 2-player race.'
        );
    }

    createRaceSetup() {
        const button = document.createElement('button');
        button.id = 'race-setup-button';
        button.className = 'game-button';
        button.type = 'button';
        const dialog = document.createElement('dialog');
        dialog.id = 'race-setup-dialog';
        dialog.setAttribute('aria-label', 'Race setup');
        dialog.innerHTML = `<h2>Other modes</h2>
            <p>Race modes split the screen. First to the crown wins.</p>
            <button data-mode="solo">Solo</button>
            <button data-mode="keyboard">Two players · keyboard</button>
            <button data-mode="keyboard-controller">Keyboard + controller</button>
            <button data-mode="controllers">Two controllers</button>
            <p id="race-controls">P1: A/D + Space. P2: arrows + ↑.</p>
            <p>Controller: D-pad selects · A confirms · B closes</p>
            <button class="game-button" data-close>Back</button>`;
        const options = [...dialog.querySelectorAll('[data-mode]')];
        options.forEach((option, index) => {
            option.className = 'game-button';
            option.style.cssText = 'display:block;position:static;width:100%;margin:8px 0';
            option.addEventListener('click', () => {
                const mode = option.dataset.mode;
                const pads = Array.from(navigator.getGamepads?.() || []).filter(
                    (pad) => pad && pad.connected !== false
                );
                if (
                    (mode === 'controllers' && pads.length < 2) ||
                    (mode === 'keyboard-controller' && pads.length < 1)
                ) {
                    dialog.querySelector('#race-controls').textContent =
                        'Connect the required controller(s), then press a button on each.';
                    return;
                }
                this.raceMenuIndex = index;
                dialog.close();
                this.scene.scene.restart({
                    level: 1,
                    deathCount: 0,
                    coopMode: mode === 'solo' ? null : mode,
                });
            });
        });
        button.addEventListener('click', () => {
            dialog.showModal();
            this.raceMenuIndex = Math.max(
                0,
                options.findIndex(
                    (option) => option.dataset.mode === (this.scene.coopMode || 'solo')
                )
            );
            options[this.raceMenuIndex].focus();
        });
        dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
        document.body.append(button, dialog);
        this.raceSetupButton = button;
        this.raceSetupDialog = dialog;
        this.setRaceSetupLabel();
    }

    handleMenuInput(input) {
        const menu = input.menu || {};
        if (this.raceSetupDialog?.open) {
            const options = [...this.raceSetupDialog.querySelectorAll('button')];
            if (menu.up || menu.down) {
                this.raceMenuIndex =
                    ((this.raceMenuIndex || 0) + (menu.down ? 1 : -1) + options.length) %
                    options.length;
                options[this.raceMenuIndex].focus();
            }
            if (menu.confirm) options[this.raceMenuIndex || 0].click();
            if (menu.back) this.raceSetupDialog.close();
            return true;
        }
        if (this.leaderboardVisible) {
            if (menu.back || menu.board) this.hideLeaderboard();
            else if (menu.left || menu.right || menu.confirm) {
                const pageCount = this.leaderboardPageCount();
                this.leaderboardPage =
                    ((this.leaderboardPage || 0) + (menu.left ? -1 : 1) + pageCount) % pageCount;
                this.displayLeaderboard();
            }
            return this.scene.awaitingStart || this.scene.gameOver;
        }
        if (menu.board) {
            this.displayLeaderboard();
            return true;
        }
        if (this.scene.awaitingStart && (menu.down || menu.up)) {
            this.raceSetupButton?.click();
            return true;
        }
        return this.handleFinishMenu(menu);
    }

    handleFinishMenu(menu) {
        if (!this.scene.gameOver) return false;
        if (menu.left || menu.right || menu.up || menu.down) {
            this.finishMenuIndex = this.finishMenuIndex === 1 ? 0 : 1;
        }
        this.finishRetryButton?.setBackgroundColor(
            this.finishMenuIndex === 1 ? '#244c65' : '#47738c'
        );
        this.finishNewGameButton?.setBackgroundColor(
            this.finishMenuIndex === 1 ? '#47738c' : '#244c65'
        );
        if (menu.confirm && this.scene.restartDelayDone) {
            this.scene.scene.restart({
                level: this.finishMenuIndex === 1 ? 1 : this.scene.level,
                deathCount: 0,
                coopMode: this.scene.coopMode,
            });
            return true;
        }
        return false;
    }

    hideTitleScreen() {
        this.raceSetupButton?.remove();
        this.raceSetupDialog?.remove();
        this.raceSetupButton = null;
        this.raceSetupDialog = null;
        if (this.titlePromptTween && typeof this.titlePromptTween.stop === 'function') {
            this.titlePromptTween.stop();
        }
        this.titlePromptTween = null;
        [
            this.titleDim,
            this.titleText,
            this.titleSubtitle,
            this.titlePrompt,
            this.titleControls,
            this.titleGamepadStatus,
        ].forEach((element) => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.titleDim = null;
        this.titleText = null;
        this.titleSubtitle = null;
        this.titlePrompt = null;
        this.titleControls = null;
        this.titleGamepadStatus = null;
        if (!this.destroyed && this.playerNameText) {
            this.playerNameText.setOrigin(1, 0.5);
            this.playerNameText.setPadding(0);
            this.playerNameText.setBackgroundColor();
            this.playerNameText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            this.updatePlayerName(this.playerName);
        }
        if (!this.destroyed) {
            this.setHudVisible(true);
        }
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
        this.leaderboardRequestId += 1;

        if (this.instructionFadeEvent?.remove) {
            this.instructionFadeEvent.remove(false);
        }
        this.instructionFadeEvent = null;
        this.hideTitleScreen();
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
            this.leaderboardTextObject,
            this.leaderboardBackdrop,
            this.finishDim,
            this.finishBackdrop,
            this.finishTitle,
            this.finishSummary,
            this.finishRetryButton,
            this.finishNewGameButton,
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
        this.leaderboardTextObject = null;
        this.leaderboardBackdrop = null;
        this.finishDim = null;
        this.finishBackdrop = null;
        this.finishTitle = null;
        this.finishSummary = null;
        this.finishRetryButton = null;
        this.finishNewGameButton = null;
        this.jumpButton = null;
        this.phaserButton = null;
        this.weaponButton = null;
        this.leftButton = null;
        this.rightButton = null;
    }
}
