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

        // Handle resize
        this.resizeHandler = () => this.handleResize();
        this.scene.scale.on('resize', this.resizeHandler, this);
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
            const desiredPointerTotal = 3;
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

        // Jump button
        this.jumpButton = this.scene.add.image(0, 0, 'jumpBtn');
        this.jumpButton.setScrollFactor(0);
        this.jumpButton.setDepth(GAME_CONSTANTS.JUMP_BUTTON_DEPTH);
        this.jumpButton.setAlpha(0.85);
        this.jumpButton.setInteractive({ useHandCursor: false });

        this.jumpButton.on('pointerdown', (pointer) => {
            this.scene.jumpPointerId = pointer.id;
            this.scene.jumpRequested = true;
            this.jumpButton.setTint(0x99ff99);
        });

        this.jumpButton.on('pointerup', (pointer) => {
            if (pointer.id === this.scene.jumpPointerId) {
                this.scene.jumpPointerId = null;
            }
            this.jumpButton.clearTint();
        });

        this.jumpButton.on('pointerout', (pointer) => {
            this.onJumpButtonUp(pointer);
        });

        this.jumpButton.on('pointerupoutside', (pointer) => {
            this.onJumpButtonUp(pointer);
        });

        this.layoutTouchControls();
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
        const insets = this.getSafeAreaInsets();
        const width = this.scene.getViewportWidth();
        const availableWidth = Math.max(160, width - insets.left - insets.right - 32);
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
        const width = this.scene.getViewportWidth();

        // Position timer and level text
        const padding = 16;
        this.timerText.setPosition(insets.left + padding, insets.top + padding);
        this.levelText.setPosition(
            insets.left + padding,
            this.timerText.y + this.timerText.height + 6
        );
        if (this.deathText) {
            this.deathText.setPosition(
                insets.left + padding,
                this.levelText.y + this.levelText.height + 4
            );
        }

        // Position instructions text
        const instructionsTop = this.deathText
            ? this.deathText.y + this.deathText.height + 8
            : this.levelText.y + this.levelText.height + 8;
        this.text.setPosition(insets.left + padding, instructionsTop);

        // Position music toggle button
        if (this.musicToggleButton) {
            const buttonPadding = 16;
            const buttonHalfWidth = this.musicToggleButton.displayWidth * 0.5;
            const buttonX = width - insets.right - buttonPadding - buttonHalfWidth;
            const buttonY = insets.top + buttonPadding + buttonHalfWidth;
            this.musicToggleButton.setPosition(buttonX, buttonY);
        }

        // Position leaderboard button
        if (this.leaderboardButton) {
            const buttonPadding = 16;
            const buttonHalfWidth = this.leaderboardButton.displayWidth * 0.5;
            const buttonHalfHeight = this.leaderboardButton.displayHeight * 0.5;
            let buttonX = width - insets.right - buttonPadding - buttonHalfWidth;
            if (this.musicToggleButton) {
                buttonX =
                    this.musicToggleButton.x -
                    this.musicToggleButton.displayWidth * 0.5 -
                    buttonPadding -
                    buttonHalfWidth;
            }
            const buttonY = insets.top + buttonPadding + buttonHalfHeight;
            this.leaderboardButton.setPosition(buttonX, buttonY);
        }

        // Position player name text below the top-right buttons
        if (this.playerNameText) {
            const namePadding = 16;
            let topRightBottom = insets.top + namePadding;
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
            const nameX = width - insets.right - namePadding;
            const nameY = topRightBottom + 8 + this.playerNameText.displayHeight * 0.5;
            this.playerNameText.setPosition(nameX, nameY);
        }
    }

    layoutTouchControls() {
        if (!this.jumpButton) {
            const width = this.scene.getViewportWidth();
            this.touchMovementMidpoint = width * GAME_CONSTANTS.MOVEMENT_MIDPOINT_RATIO;
            return;
        }
        const insets = this.getSafeAreaInsets();
        const width = this.scene.getViewportWidth();
        const height = this.scene.getViewportHeight();
        const margin = GAME_CONSTANTS.TOUCH_CONTROL_MARGIN;
        const buttonX = width - insets.right - this.jumpButton.displayWidth / 2 - margin;
        const buttonY = height - insets.bottom - this.jumpButton.displayHeight / 2 - margin;
        this.jumpButton.setPosition(buttonX, buttonY);
        this.touchMovementMidpoint =
            insets.left +
            (width - insets.left - insets.right) * GAME_CONSTANTS.MOVEMENT_MIDPOINT_RATIO;
    }

    layoutLeaderboard() {
        if (!this.leaderboardTextObject) {
            return;
        }
        const insets = this.getSafeAreaInsets();
        const width = this.scene.getViewportWidth();
        const height = this.scene.getViewportHeight();
        const availableWidth = Math.max(220, width - insets.left - insets.right - 48);
        this.leaderboardTextObject.setWordWrapWidth(availableWidth, true);
        const centerX = insets.left + (width - insets.left - insets.right) / 2;
        const top = Math.max(
            insets.top + 92,
            this.text && this.text.visible && this.text.alpha > 0.2
                ? this.text.y + this.text.height + 28
                : insets.top + 92
        );
        this.leaderboardTextObject.setPosition(centerX, top);
        this.drawLeaderboardBackdrop(centerX, top, availableWidth, width, height, insets);
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
            }
            this.leaderboardTextObject = this.scene.add
                .text(0, 0, leaderboardText, {
                    fontSize: '16px',
                    fontFamily: HUD_FONT,
                    fill: '#ffe566',
                    align: 'center',
                })
                .setOrigin(0.5, 0)
                .setScrollFactor(0);
            this.leaderboardTextObject.setDepth(GAME_CONSTANTS.LEADERBOARD_OVERLAY_DEPTH);
            this.styleHudText(this.leaderboardTextObject, 4);
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

        this.titleText = this.scene.add
            .text(0, 0, 'SPACE CHICKEN', {
                fontSize: '56px',
                fontFamily: BANNER_FONT,
                fill: '#ffe566',
                align: 'center',
            })
            .setOrigin(0.5);
        this.titleText.setScrollFactor(0);
        this.titleText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH - 1);
        this.styleHudText(this.titleText, 8);

        this.titleSubtitle = this.scene.add
            .text(0, 0, subtitle || 'Dawn Run', {
                fontSize: '22px',
                fontFamily: BANNER_FONT,
                fill: '#cfe7ff',
                align: 'center',
            })
            .setOrigin(0.5);
        this.titleSubtitle.setScrollFactor(0);
        this.titleSubtitle.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH - 1);
        this.styleHudText(this.titleSubtitle, 4);

        const prompt = this.touchControlsEnabled ? 'Tap to start' : 'Press SPACE to start';
        this.titlePrompt = this.scene.add
            .text(0, 0, prompt, {
                fontSize: '20px',
                fontFamily: HUD_FONT,
                fill: '#ffffff',
                align: 'center',
            })
            .setOrigin(0.5);
        this.titlePrompt.setScrollFactor(0);
        this.titlePrompt.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH - 1);
        this.styleHudText(this.titlePrompt, 4);
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
        const width = this.scene.getViewportWidth();
        const height = this.scene.getViewportHeight();
        const centerX = insets.left + (width - insets.left - insets.right) / 2;
        const centerY = insets.top + (height - insets.top - insets.bottom) / 2;
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
        this.titleText.setPosition(centerX, centerY - 46);
        if (this.titleSubtitle) {
            this.titleSubtitle.setPosition(centerX, centerY + 8);
        }
        if (this.titlePrompt) {
            this.titlePrompt.setPosition(centerX, centerY + 58);
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
        this.bannerTitle = this.scene.add
            .text(0, 0, title, {
                fontSize: '42px',
                fontFamily: BANNER_FONT,
                fill: '#ffe566',
                align: 'center',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(GAME_CONSTANTS.OVERLAY_DEPTH + 1)
            .setAlpha(0);
        this.styleHudText(this.bannerTitle, 7);
        if (subtitle) {
            this.bannerSubtitle = this.scene.add
                .text(0, 0, subtitle, {
                    fontSize: '20px',
                    fontFamily: BANNER_FONT,
                    fill: '#ffffff',
                    align: 'center',
                })
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(GAME_CONSTANTS.OVERLAY_DEPTH + 1)
                .setAlpha(0);
            this.styleHudText(this.bannerSubtitle, 4);
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
        const width = this.scene.getViewportWidth();
        const height = this.scene.getViewportHeight();
        const centerX = insets.left + (width - insets.left - insets.right) / 2;
        const centerY = insets.top + (height - insets.top - insets.bottom) * 0.28;
        this.bannerTitle.setPosition(centerX, centerY);
        if (this.bannerSubtitle) {
            this.bannerSubtitle.setPosition(centerX, centerY + 40);
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
        this.text.setVisible(true);
        this.instructionFadeEvent = this.scene.time.delayedCall(
            GAME_CONSTANTS.INSTRUCTION_DISPLAY_MS,
            () => {
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
        );
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
    }
}
