import { GAME_CONSTANTS, LEVEL_IDS } from './Constants.js';
import { formatElapsedTime } from './GameUtils.js';

const HUD_FONT = 'Courier New, Courier, monospace';
const BANNER_FONT = 'Trebuchet MS, Arial, sans-serif';

export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.timerText = null;
        this.levelText = null;
        this.deathText = null;
        this.text = null;
        this.playerNameText = null;
        this.musicToggleButton = null;
        this.leaderboardButton = null;
        this.leaderboardTextObject = null;
        this.leaderboardBackdrop = null;
        this.leaderboardTextContent = '';
        this.leaderboardVisible = false;
        this.leaderboardRequestId = 0;
        this.jumpButton = null;
        this.leftButton = null;
        this.rightButton = null;
        this.touchControlsEnabled = false;
        this.touchMovementMidpoint = 0;
        this.titleDim = null;
        this.titleText = null;
        this.titleSubtitle = null;
        this.titlePrompt = null;
        this.titlePromptTween = null;
        this.bannerTitle = null;
        this.bannerSubtitle = null;
        this.bannerHideEvent = null;
        this.instructionFadeEvent = null;
        this.destroyed = false;
        this.lastTimerDisplay = '';
        this.cachedInsets = null;
    }

    createUI(levelConfig, level, playerName) {
        // Timer text
        this.timerText = this.scene.add.text(0, 0, 'Time: 00:00.00', {
            fontSize: '32px',
            fontFamily: HUD_FONT,
            fill: '#ffe566',
        });
        this.timerText.setScrollFactor(0);
        this.timerText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.styleHudText(this.timerText, 6);

        // Level text
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

        // Instructions text
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

        // Player name text
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

        // Music toggle button
        this.createMusicToggleButton();

        // Leaderboard button
        this.createLeaderboardButton();

        // Setup touch controls if needed
        if (this.scene.shouldEnableTouchControls()) {
            this.enableTouchControls();
        }

        this.updateInstructionText(levelConfig.instructions, levelConfig.touchInstructions);
        this.layoutUI();
        this.markAllUiObjects();
    }

    getLayoutMetrics() {
        const insets = this.getSafeAreaInsets();
        if (this.scene.viewport && typeof this.scene.viewport.getLayoutMetrics === 'function') {
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
        if (!text || typeof text.setFontSize !== 'function' || !size) {
            return;
        }
        text.setFontSize(size);
    }

    markUi(gameObject) {
        if (!gameObject) {
            return gameObject;
        }
        gameObject.spaceChickenUi = true;
        if (this.scene && typeof this.scene.assignCameraFilter === 'function') {
            this.scene.assignCameraFilter(gameObject);
        }
        return gameObject;
    }

    getUiObjects() {
        return [
            this.timerText,
            this.levelText,
            this.deathText,
            this.text,
            this.playerNameText,
            this.musicToggleButton,
            this.leaderboardButton,
            this.jumpButton,
            this.leftButton,
            this.rightButton,
            this.titleDim,
            this.titleText,
            this.titleSubtitle,
            this.titlePrompt,
            this.bannerTitle,
            this.bannerSubtitle,
            this.leaderboardTextObject,
            this.leaderboardBackdrop,
        ].filter(Boolean);
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
        this.leaderboardButton = this.scene.add.text(0, 0, 'TOP', {
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
        const backgroundColor = this.leaderboardVisible ? '#3a3a52' : '#1a1a28';
        this.leaderboardButton.setStyle({ backgroundColor });
    }

    styleHudText(text, strokeThickness = 4) {
        if (!text) {
            return;
        }
        if (typeof text.setStroke === 'function') {
            text.setStroke('#000000', strokeThickness);
        }
        if (typeof text.setShadow === 'function') {
            text.setShadow(2, 2, '#000000', 2, true, true);
        }
    }

    enableTouchControls() {
        if (this.touchControlsEnabled) {
            return;
        }
        this.touchControlsEnabled = true;
        if (this.scene.pointerTapTimes && typeof this.scene.pointerTapTimes.clear === 'function') {
            this.scene.pointerTapTimes.clear();
        }
        if (this.scene.input && typeof this.scene.input.addPointer === 'function') {
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
        this.layoutTouchControls();
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

    expandControlHitArea(button, displaySize) {
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
        const pad = GAME_CONSTANTS.TOUCH_HIT_PADDING / (scaleX || 1);
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

        this.applyFontSize(this.timerText, fonts.timer);
        this.applyFontSize(this.levelText, fonts.level);
        this.applyFontSize(this.deathText, fonts.death);
        this.applyFontSize(this.text, fonts.instructions);
        this.applyFontSize(this.playerNameText, fonts.playerName);
        this.applyFontSize(this.leaderboardButton, fonts.leaderboardButton);
        if (this.leaderboardButton && typeof this.leaderboardButton.setPadding === 'function') {
            const padX = metrics.isCompact ? 10 : 8;
            const padY = metrics.isCompact ? 6 : 4;
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

        const instructionsTop = this.deathText
            ? this.deathText.y + this.deathText.height + 8
            : this.levelText.y + this.levelText.height + 8;
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

        if (this.playerNameText) {
            let topRightBottom = insets.top + padding;
            if (this.musicToggleButton) {
                topRightBottom = Math.max(
                    topRightBottom,
                    this.musicToggleButton.y + this.musicToggleButton.displayHeight * 0.5
                );
            }
            if (this.leaderboardButton) {
                topRightBottom = Math.max(
                    topRightBottom,
                    this.leaderboardButton.y + this.leaderboardButton.displayHeight * 0.5
                );
            }
            const nameX = width - insets.right - padding;
            const nameY = topRightBottom + 8 + this.playerNameText.displayHeight * 0.5;
            this.playerNameText.setPosition(nameX, nameY);
            if (typeof this.playerNameText.setWordWrapWidth === 'function') {
                this.playerNameText.setWordWrapWidth(Math.max(120, metrics.innerWidth * 0.5), true);
            }
        }
        this.wrapInstructionText(metrics, padding);
        this.avoidHudOverlap();
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

        if (!this.jumpButton && !this.leftButton && !this.rightButton) {
            return;
        }

        let controlSize = metrics.controlSize;
        const margin = metrics.controlMargin;
        const jumpReserve = controlSize + margin;
        const leftClusterWidth = controlSize * 2 + margin * 0.7;
        const availableForMove = metrics.innerWidth - jumpReserve - margin;
        if (leftClusterWidth > availableForMove && availableForMove > 0) {
            controlSize = Math.max(64, Math.floor((availableForMove - margin * 0.7) / 2));
        }

        const buttonY = height - insets.bottom - controlSize / 2 - margin;
        if (this.leftButton) {
            this.leftButton.setDisplaySize(controlSize, controlSize);
            this.leftButton.setPosition(insets.left + controlSize / 2 + margin, buttonY);
            this.expandControlHitArea(this.leftButton, controlSize);
        }
        if (this.rightButton) {
            this.rightButton.setDisplaySize(controlSize, controlSize);
            const leftX = this.leftButton
                ? this.leftButton.x
                : insets.left + controlSize / 2 + margin;
            this.rightButton.setPosition(leftX + controlSize + margin * 0.7, buttonY);
            this.expandControlHitArea(this.rightButton, controlSize);
        }
        if (this.jumpButton) {
            this.jumpButton.setDisplaySize(controlSize, controlSize);
            this.jumpButton.setPosition(width - insets.right - controlSize / 2 - margin, buttonY);
            this.expandControlHitArea(this.jumpButton, controlSize);
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
        this.leaderboardBackdrop.fillStyle(0x0b1020, 0.82);
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
        const display = formatElapsedTime(elapsed);
        if (display === this.lastTimerDisplay) {
            return;
        }
        this.lastTimerDisplay = display;
        this.timerText.setText(`Time: ${display}`);
    }

    updateLevelText(level) {
        if (this.levelText) {
            this.levelText.setText(`Level ${level}`);
        }
    }

    updateDeathCount(deathCount) {
        if (this.deathText) {
            this.deathText.setText(`Deaths ${deathCount || 0}`);
            this.layoutUI();
        }
    }

    updatePlayerName(playerName) {
        if (!this.playerNameText) {
            return;
        }
        const trimmedName = typeof playerName === 'string' ? playerName.trim() : '';
        const displayName = trimmedName.length ? trimmedName : 'Anonymous';
        this.playerNameText.setText(`Player: ${displayName}`);
        this.layoutUI();
    }

    editPlayerName() {
        if (!this.scene || !this.scene.leaderboardManager) {
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
    }

    displayLeaderboard() {
        this.clearLevelBanner();
        const requestId = Date.now() + Math.random();
        this.leaderboardRequestId = requestId;
        const restartPrompt = this.scene.gameOver
            ? this.touchControlsEnabled
                ? 'Press SPACEBAR or tap the jump button to restart'
                : 'Press SPACEBAR to restart'
            : 'Select the TOP button again to close this leaderboard';

        const updateTextObject = (sectionsText) => {
            if (this.destroyed || this.leaderboardRequestId !== requestId) {
                return;
            }
            const leaderboardText =
                'Leaderboard\n\n' +
                sectionsText +
                `\n\nDeaths this run: ${this.scene.deathCount}\n\n${restartPrompt}`;
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
            this.styleHudText(this.leaderboardTextObject, 4);
            this.markUi(this.leaderboardTextObject);
            this.layoutLeaderboard();
            this.leaderboardVisible = true;
            this.refreshLeaderboardButtonStyle();
        };

        const buildSections = (remoteData) => {
            const sections = LEVEL_IDS.map((level) => {
                const remoteTimes = remoteData && remoteData[level] ? remoteData[level] : null;
                const localTimes = this.scene.storageAvailable
                    ? this.scene.leaderboardManager.readLeaderboard(level)
                    : [];
                const combined = remoteTimes && remoteTimes.length ? remoteTimes : localTimes;
                const normalized = Array.isArray(combined) ? combined.slice() : [];
                normalized.sort((a, b) => a.time - b.time);
                const header = `Level ${level} Times:`;
                const body = normalized.length
                    ? this.scene.leaderboardManager.formatTimes(normalized)
                    : 'No times yet';
                return `${header}\n${body}`;
            });
            if (
                !this.scene.storageAvailable &&
                (!remoteData || Object.keys(remoteData).length === 0)
            ) {
                return 'Saved times unavailable (local storage disabled).';
            }
            return sections.join('\n\n');
        };

        updateTextObject('Loading leaderboard…');

        this.scene.leaderboardManager
            .fetchFirebaseLeaderboards()
            .then((remoteData) => {
                if (this.leaderboardRequestId !== requestId) {
                    return;
                }
                const sectionsText = buildSections(remoteData);
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

    showGameOver(finalTime) {
        this.timerText.setText(`Time: ${formatElapsedTime(finalTime)}`);
        this.levelText.setText('Completed');
        if (this.deathText) {
            this.deathText.setText(`Deaths ${this.scene.deathCount}`);
        }
        if (this.text) {
            this.text.setAlpha(1);
            this.text.setVisible(true);
            this.text.setText(
                `You win!\nDeaths this run: ${this.scene.deathCount}\nPress SPACE or tap to fly again`
            );
        }
        this.showLevelBanner('YOU WIN', 'The chicken claims the cosmos');
        this.layoutUI();
        this.displayLeaderboard();
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
            this.titleDim.on('pointerup', () => {
                if (this.scene.awaitingStart && typeof this.scene.beginPlay === 'function') {
                    this.scene.beginPlay();
                }
            });
        }
        this.markUi(this.titleDim);

        const metrics = this.getLayoutMetrics();
        this.titleText = this.scene.add
            .text(0, 0, 'SPACE CHICKEN', {
                fontSize: `${metrics.fonts.title}px`,
                fontFamily: BANNER_FONT,
                fill: '#ffe566',
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

        const prompt = this.touchControlsEnabled ? 'Tap to start' : 'Press SPACE to start';
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
        this.styleHudText(this.titlePrompt, 4);
        this.markUi(this.titlePrompt);
        if (this.scene.tweens && typeof this.scene.tweens.add === 'function') {
            this.titlePromptTween = this.scene.tweens.add({
                targets: this.titlePrompt,
                alpha: { from: 0.35, to: 1 },
                duration: GAME_CONSTANTS.TITLE_PROMPT_PULSE_MS,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }
        this.setHudVisible(false);
        this.layoutTitleScreen();
    }

    setHudVisible(visible) {
        [this.timerText, this.levelText, this.deathText, this.text, this.playerNameText].forEach(
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
        const centerY = insets.top + metrics.innerHeight * verticalRatio;
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
        const titleOffset = metrics.isCompact ? 36 : 46;
        this.titleText.setPosition(centerX, centerY - titleOffset);
        if (this.titleSubtitle) {
            const subtitleY =
                this.titleText.y +
                (this.titleText.displayHeight || this.titleText.height || 40) * 0.5 +
                (metrics.isCompact ? 14 : 18);
            this.titleSubtitle.setPosition(centerX, subtitleY);
        }
        if (this.titlePrompt) {
            const promptAnchor = this.titleSubtitle ? this.titleSubtitle.y : centerY + 8;
            this.titlePrompt.setPosition(centerX, promptAnchor + (metrics.isCompact ? 36 : 50));
        }
    }

    hideTitleScreen() {
        if (this.titlePromptTween && typeof this.titlePromptTween.stop === 'function') {
            this.titlePromptTween.stop();
        }
        this.titlePromptTween = null;
        [this.titleDim, this.titleText, this.titleSubtitle, this.titlePrompt].forEach((element) => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.titleDim = null;
        this.titleText = null;
        this.titleSubtitle = null;
        this.titlePrompt = null;
        this.setHudVisible(true);
    }

    showLevelBanner(levelOrTitle, subtitle) {
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
        const targets = [this.bannerTitle, this.bannerSubtitle].filter(Boolean);
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
            this.bannerHideEvent = this.scene.time.delayedCall(
                GAME_CONSTANTS.LEVEL_BANNER_HOLD_MS,
                () => this.fadeLevelBanner()
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
        const centerY = insets.top + metrics.innerHeight * (metrics.isCompact ? 0.22 : 0.28);
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
        const targets = [this.bannerTitle, this.bannerSubtitle].filter(Boolean);
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

        // Clean up resize listener
        if (this.scene.scale && this.resizeHandler) {
            this.scene.scale.off('resize', this.resizeHandler, this);
            this.resizeHandler = null;
        }

        // Destroy UI elements
        if (this.instructionFadeEvent && typeof this.instructionFadeEvent.remove === 'function') {
            this.instructionFadeEvent.remove(false);
        }
        this.instructionFadeEvent = null;
        this.hideTitleScreen();
        this.clearLevelBanner();

        const elements = [
            this.timerText,
            this.levelText,
            this.deathText,
            this.text,
            this.playerNameText,
            this.musicToggleButton,
            this.leaderboardButton,
            this.leaderboardTextObject,
            this.leaderboardBackdrop,
            this.jumpButton,
            this.leftButton,
            this.rightButton,
        ];

        elements.forEach((element) => {
            if (element && element.destroy) {
                element.destroy();
            }
        });

        this.timerText = null;
        this.levelText = null;
        this.deathText = null;
        this.text = null;
        this.playerNameText = null;
        this.musicToggleButton = null;
        this.leaderboardButton = null;
        this.leaderboardTextObject = null;
        this.leaderboardBackdrop = null;
        this.jumpButton = null;
        this.leftButton = null;
        this.rightButton = null;
    }
}
