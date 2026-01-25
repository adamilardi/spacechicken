import { GAME_CONSTANTS, AUDIO_SETTINGS } from './Constants.js';

export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.timerText = null;
        this.levelText = null;
        this.text = null;
        this.playerNameText = null;
        this.musicToggleButton = null;
        this.leaderboardButton = null;
        this.leaderboardTextObject = null;
        this.leaderboardTextContent = '';
        this.leaderboardVisible = false;
        this.leaderboardRequestId = 0;
        this.jumpButton = null;
        this.touchControlsEnabled = false;
        this.touchMovementMidpoint = 0;
    }

    createUI(levelConfig, level, playerName) {
        // Timer text
        this.timerText = this.scene.add.text(0, 0, 'Time: 00:00.00', {
            fontSize: '36px',
            fontFamily: 'monospace',
            fill: '#ffff00'
        });
        this.timerText.setScrollFactor(0);
        this.timerText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);

        // Level text
        this.levelText = this.scene.add.text(0, 0, `Level: ${level}`, {
            fontSize: '24px',
            fill: '#fff'
        });
        this.levelText.setScrollFactor(0);
        this.levelText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);

        // Instructions text
        const initialWrapWidth = Math.max(200, (this.scene.scale && this.scene.scale.width) ?
            this.scene.scale.width - 32 : 800 - 32);
        this.text = this.scene.add.text(0, 0, '', {
            fontSize: '16px',
            fill: '#fff',
            wordWrap: { width: initialWrapWidth, useAdvancedWrap: true }
        });
        this.text.setScrollFactor(0);
        this.text.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);

        // Player name text
        this.playerNameText = this.scene.add.text(0, 0, '', {
            fontSize: '18px',
            fontFamily: 'monospace',
            fill: '#ffff00',
            align: 'right'
        });
        this.playerNameText.setOrigin(1, 0.5);
        this.playerNameText.setScrollFactor(0);
        this.playerNameText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
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
        this.leaderboardButton = this.scene.add.text(0, 0, 'LB', {
            fontSize: '20px',
            fontFamily: 'monospace',
            fill: '#ffff00',
            backgroundColor: '#222222',
            align: 'center'
        });
        this.leaderboardButton.setOrigin(0.5, 0.5);
        this.leaderboardButton.setPadding(8, 4, 8, 4);
        this.leaderboardButton.setScrollFactor(0);
        this.leaderboardButton.setDepth(GAME_CONSTANTS.LEADERBOARD_BUTTON_DEPTH);
        this.leaderboardButton.setAlpha(0.95);
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
        const backgroundColor = this.leaderboardVisible ? '#444444' : '#222222';
        this.leaderboardButton.setStyle({ backgroundColor });
    }

    enableTouchControls() {
        if (this.touchControlsEnabled) {
            return;
        }
        this.touchControlsEnabled = true;
        if (this.scene.pointerTapTimes && typeof this.scene.pointerTapTimes.clear === 'function') {
            this.scene.pointerTapTimes.clear();
        }
        this.scene.input.addPointer(2);

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
    }

    getSafeAreaInsets() {
        if (typeof window === 'undefined' || !window.getComputedStyle) {
            return GAME_CONSTANTS.SAFE_AREA_FALLBACK;
        }
        const styles = getComputedStyle(document.documentElement);
        const parseInset = (prop) => {
            const value = styles.getPropertyValue(prop);
            const parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : 0;
        };
        return {
            top: parseInset('--safe-area-top'),
            right: parseInset('--safe-area-right'),
            bottom: parseInset('--safe-area-bottom'),
            left: parseInset('--safe-area-left')
        };
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
        this.levelText.setPosition(insets.left + padding,
            this.timerText.y + this.timerText.height + 8);

        // Position instructions text
        this.text.setPosition(insets.left + padding,
            this.levelText.y + this.levelText.height + 8);

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
                buttonX = this.musicToggleButton.x -
                    (this.musicToggleButton.displayWidth * 0.5) -
                    buttonPadding - buttonHalfWidth;
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
            const nameY = topRightBottom + 8 + (this.playerNameText.displayHeight * 0.5);
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
        const buttonX = width - insets.right - (this.jumpButton.displayWidth / 2) - margin;
        const buttonY = height - insets.bottom - (this.jumpButton.displayHeight / 2) - margin;
        this.jumpButton.setPosition(buttonX, buttonY);
        this.touchMovementMidpoint = insets.left + (width - insets.left - insets.right) *
            GAME_CONSTANTS.MOVEMENT_MIDPOINT_RATIO;
    }

    layoutLeaderboard() {
        if (!this.leaderboardTextObject) {
            return;
        }
        const insets = this.getSafeAreaInsets();
        const width = this.scene.getViewportWidth();
        const availableWidth = Math.max(220, width - insets.left - insets.right - 32);
        this.leaderboardTextObject.setWordWrapWidth(availableWidth, true);
        const centerX = insets.left + (width - insets.left - insets.right) / 2;
        const top = Math.max(insets.top + 80,
            this.text ? this.text.y + this.text.height + 24 : insets.top + 80);
        this.leaderboardTextObject.setPosition(centerX, top);
    }

    updateTimer(elapsed) {
        if (!this.timerText) {
            return;
        }
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const milliseconds = Math.floor((elapsed % 1000) / 10);
        this.timerText.setText(`Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`);
    }

    updateLevelText(level) {
        if (this.levelText) {
            this.levelText.setText(`Level: ${level}`);
        }
    }

    updatePlayerName(playerName) {
        if (!this.playerNameText) {
            return;
        }
        const trimmedName = typeof playerName === 'string' ? playerName.trim() : '';
        const displayName = trimmedName.length ? trimmedName : 'Anonymous';
        this.playerNameText.setText(`Player: ${displayName}`);
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
        this.leaderboardTextObject = null;
        this.leaderboardTextContent = '';
        this.leaderboardVisible = false;
        this.leaderboardRequestId = 0;
        this.refreshLeaderboardButtonStyle();
    }

    displayLeaderboard() {
        const requestId = Date.now() + Math.random();
        this.leaderboardRequestId = requestId;
        const restartPrompt = this.scene.gameOver
            ? (this.touchControlsEnabled ? 'Press SPACEBAR or tap the jump button to restart' : 'Press SPACEBAR to restart')
            : 'Select the LB button again to close this leaderboard';

        const updateTextObject = (sectionsText) => {
            if (this.leaderboardRequestId !== requestId) {
                return;
            }
            const leaderboardText = 'Leaderboard\n\n' + sectionsText + `\n\nDeaths this run: ${this.scene.deathCount}\n\n${restartPrompt}`;
            this.leaderboardTextContent = leaderboardText;
            if (this.leaderboardTextObject) {
                this.leaderboardTextObject.destroy();
            }
            this.leaderboardTextObject = this.scene.add.text(0, 0, leaderboardText, {
                fontSize: '16px',
                fill: '#ffff00',
                align: 'center'
            }).setOrigin(0.5, 0).setScrollFactor(0);
            this.leaderboardTextObject.setDepth(GAME_CONSTANTS.LEADERBOARD_OVERLAY_DEPTH);
            this.layoutLeaderboard();
            this.leaderboardVisible = true;
            this.refreshLeaderboardButtonStyle();
        };

        const buildSections = (remoteData) => {
            const sections = [1, 2, 3].map(level => {
                const remoteTimes = remoteData && remoteData[level] ? remoteData[level] : null;
                const localTimes = this.scene.storageAvailable ?
                    this.scene.leaderboardManager.readLeaderboard(level) : [];
                const combined = remoteTimes && remoteTimes.length ? remoteTimes : localTimes;
                const normalized = Array.isArray(combined) ? combined.slice() : [];
                normalized.sort((a, b) => a.time - b.time);
                const header = `Level ${level} Times:`;
                const body = normalized.length ?
                    this.scene.leaderboardManager.formatTimes(normalized) : 'No times yet';
                return `${header}\n${body}`;
            });
            if (!this.scene.storageAvailable && (!remoteData || Object.keys(remoteData).length === 0)) {
                return 'Saved times unavailable (local storage disabled).';
            }
            return sections.join('\n\n');
        };

        updateTextObject('Loading leaderboard…');

        this.scene.leaderboardManager.fetchFirebaseLeaderboards()
            .then(remoteData => {
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
                const fallback = this.scene.storageAvailable ?
                    buildSections(null) : 'Saved times unavailable (local storage disabled).';
                updateTextObject(fallback);
            });
    }

    showGameOver(finalTime) {
        const minutes = Math.floor(finalTime / 60000);
        const seconds = Math.floor((finalTime % 60000) / 1000);
        const milliseconds = Math.floor((finalTime % 1000) / 10);
        this.timerText.setText(`Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`);
        this.levelText.setText('Level: COMPLETED');
        this.text.setText(`You Win!\nDeaths this run: ${this.scene.deathCount}`);
        this.layoutUI();
        this.displayLeaderboard();
    }

    cleanup() {
        // Clean up resize listener
        if (this.scene.scale && this.resizeHandler) {
            this.scene.scale.off('resize', this.resizeHandler, this);
            this.resizeHandler = null;
        }

        // Destroy UI elements
        const elements = [
            this.timerText,
            this.levelText,
            this.text,
            this.playerNameText,
            this.musicToggleButton,
            this.leaderboardButton,
            this.leaderboardTextObject,
            this.jumpButton
        ];

        elements.forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
    }
}
