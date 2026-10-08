import { GAME_CONSTANTS } from './Constants.js';
import { LEVEL_IDS } from './levels/index.js';
import { formatElapsedTime } from './GameUtils.js';
import { BANNER_FONT, HUD_FONT } from './UIManager.js';

// Title, leaderboard, finish, branch-choice, and race-setup overlays. Mutable
// HUD state (timer/level/death texts, buttons, touch controls, banners) stays
// on UIManager; this class owns only overlay objects and their layout, and
// reaches shared helpers (metrics, insets, text styling) through `ui`.

// A keyboard race needs a physical keyboard, which the page cannot detect
// directly. Desktops and touchscreen laptops report a fine pointer
// somewhere; pure touch-only tablets do not. Fails open when the query
// itself is unavailable so unknown browsers keep the mode.
export function canRaceWithKeyboard({ matchMedia, keyboardApi = false } = {}) {
    if (keyboardApi) {
        return true;
    }
    try {
        const fine = matchMedia?.('(any-pointer: fine)');
        if (!fine || typeof fine.matches !== 'boolean') {
            return true;
        }
        return fine.matches;
    } catch {
        return true;
    }
}

export class Overlays {
    constructor(scene, ui) {
        this.scene = scene;
        this.ui = ui;
        this.titleDim = null;
        this.titleText = null;
        this.titleSubtitle = null;
        this.titlePrompt = null;
        this.titleControls = null;
        this.titleGamepadStatus = null;
        this.titlePromptTween = null;
        this.selectPrevButton = null;
        this.selectNextButton = null;
        this.leaderboardTextObject = null;
        this.leaderboardBackdrop = null;
        this.leaderboardTextContent = '';
        this.leaderboardVisible = false;
        this.leaderboardRequestId = 0;
        this.leaderboardPage = 0;
        this.finishBackdrop = null;
        this.finishDim = null;
        this.finishTitle = null;
        this.finishSummary = null;
        this.finishRetryButton = null;
        this.finishNewGameButton = null;
        this.finishMenuIndex = 0;
        this.finishLevelTime = 0;
        this.completionSummary = '';
        this.fullRunSummary = '';
        this.branchOptions = null;
        this.branchCallback = null;
        this.branchObjects = [];
        this.raceSetupButton = null;
        this.raceSetupDialog = null;
        this.raceMenuIndex = 0;
    }

    layoutLeaderboard() {
        if (!this.leaderboardTextObject) {
            return;
        }
        const insets = this.ui.getSafeAreaInsets();
        const metrics = this.ui.getLayoutMetrics();
        const width = metrics.width;
        const height = metrics.height;
        const availableWidth = Math.max(180, metrics.innerWidth - (metrics.isCompact ? 24 : 48));
        this.leaderboardTextObject.setWordWrapWidth(availableWidth, true);
        this.ui.applyFontSize(this.leaderboardTextObject, metrics.fonts.leaderboard);
        const centerX = insets.left + metrics.innerWidth / 2;
        const top = this.leaderboardTop(metrics, insets);
        this.leaderboardTextObject.setPosition(centerX, top);
        this.drawLeaderboardBackdrop(centerX, top, availableWidth, width, height, insets);
    }

    leaderboardTop(metrics, insets) {
        const bottoms = [insets.top + (metrics.isCompact ? 56 : 80)];
        if (this.ui.deathText) {
            bottoms.push(this.ui.deathText.y + (this.ui.deathText.height || 0));
        }
        if (this.ui.playerNameText) {
            bottoms.push(
                this.ui.playerNameText.y + (this.ui.playerNameText.displayHeight || 0) * 0.5
            );
        }
        if (this.ui.musicToggleButton) {
            bottoms.push(
                this.ui.musicToggleButton.y + (this.ui.musicToggleButton.displayHeight || 0) * 0.5
            );
        }
        if (this.ui.text && this.ui.text.visible && this.ui.text.alpha > 0.2) {
            bottoms.push(this.ui.text.y + (this.ui.text.height || 0));
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

    showLevelResult(title, time, submission, rescueMs = 0) {
        const rescueLabel = rescueMs > 0 ? ` · −${Math.round(rescueMs / 1000)}s crew` : '';
        this.completionSummary = `${title} · ${formatElapsedTime(time)}${rescueLabel}`;
        if (this.scene.levelConfig.nextLevel) {
            this.ui.showLevelBanner(title, `${formatElapsedTime(time)}${rescueLabel}`, 2800);
            this.ui.bannerTitle?.setAlpha(1);
            this.ui.bannerSubtitle?.setAlpha(1);
        }
        Promise.resolve(submission).then((result) => {
            if (this.ui.destroyed || !result?.rank) return;
            const bestTime = result.personalBest?.time || time;
            const next = result.next
                ? ` · ${formatElapsedTime(bestTime - result.next.time)} behind ${result.next.name}`
                : ' · YOU ARE #1';
            const ranks = `All-time #${result.rank} · Weekly #${result.weeklyRank}`;
            this.completionSummary += `\n${ranks}\n${next.replace(/^ · /, '')}`;
            if (this.ui.bannerSubtitle) {
                this.ui.bannerSubtitle.setText(`${formatElapsedTime(time)} · ${ranks}${next}`);
                this.ui.layoutLevelBanner();
            }
            this.updateFinishSummary();
            if (this.leaderboardVisible) this.displayLeaderboard();
        });
    }

    showFullRunResult(time, submission, deaths = 0, rescues = 0) {
        const deathLabel = deaths > 0 ? `${deaths} DEATHS` : 'ZERO DEATHS';
        const rescueLabel = rescues > 0 ? ` · ${rescues} SAVED` : '';
        this.fullRunSummary = `FULL RUN · ${formatElapsedTime(time)} · ${deathLabel}${rescueLabel}`;
        Promise.resolve(submission).then((result) => {
            if (this.ui.destroyed || !result?.rank) return;
            this.fullRunSummary += `\nAll-time #${result.rank} · Weekly #${result.weeklyRank}`;
            this.updateFinishSummary();
            if (this.leaderboardVisible) this.displayLeaderboard();
        });
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
        this.ui.refreshLeaderboardButtonStyle();
        this.setFinishVisible(this.scene.gameOver);
    }

    displayLeaderboard() {
        this.ui.clearLevelBanner();
        this.setFinishVisible(false);
        const requestId = Date.now() + Math.random();
        this.leaderboardRequestId = requestId;
        const updateTextObject = (sectionsText) => {
            if (this.ui.destroyed || this.leaderboardRequestId !== requestId) {
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
                this.ui.markUi(this.leaderboardBackdrop);
            }
            const metrics = this.ui.getLayoutMetrics();
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
            this.ui.styleHudText(this.leaderboardTextObject, 4);
            this.ui.markUi(this.leaderboardTextObject);
            this.layoutLeaderboard();
            this.leaderboardVisible = true;
            this.ui.refreshLeaderboardButtonStyle();
        };

        const buildSections = (competition) => {
            const level = this.leaderboardPage;
            const metrics = this.ui.getLayoutMetrics();
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

    createFinishScreen(raceWinner) {
        const depth = GAME_CONSTANTS.OVERLAY_DEPTH;
        this.finishDim = this.ui.markUi(this.scene.add.rectangle(0, 0, 1, 1, 0x020814, 0.68));
        this.finishDim.setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
        this.finishBackdrop = this.ui.markUi(this.scene.add.rectangle(0, 0, 1, 1, 0x101b30, 0.98));
        this.finishBackdrop.setStrokeStyle(2, 0xffe566, 0.55);
        this.finishBackdrop.setScrollFactor(0).setDepth(depth + 1);
        this.finishTitle = this.ui.markUi(
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
        this.ui.styleHudText(this.finishTitle, 5);
        this.finishSummary = this.ui.markUi(
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
        const button = this.ui.markUi(
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
        const metrics = this.ui.getLayoutMetrics();
        const insets = this.ui.getSafeAreaInsets();
        const landscape = metrics.innerHeight < 500 && !metrics.isPortrait;
        const panelWidth = Math.min(480, metrics.innerWidth - 24);
        const panelHeight = landscape ? 206 : metrics.isTiny ? 250 : 268;
        const controlsTop =
            this.ui.touchControlsEnabled && this.ui.jumpButton
                ? this.ui.jumpButton.y - this.ui.jumpButton.displayHeight / 2 - 12
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

    createSelectChevron(label, direction, metrics) {
        const button = this.scene.add
            .text(0, 0, label, {
                fontSize: `${metrics.fonts.prompt}px`,
                fontFamily: HUD_FONT,
                fill: '#ffffff',
                align: 'center',
            })
            .setOrigin(0.5);
        button.setScrollFactor(0);
        button.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH - 1);
        button.setPadding(14, 8, 14, 8);
        button.setBackgroundColor('#17334b');
        this.ui.styleHudText(button, 4);
        if (typeof button.setInteractive === 'function') {
            button.setInteractive({ useHandCursor: true });
            button.on('pointerup', () => this.scene.cycleTitleSelection(direction));
        }
        return button;
    }

    showTitleScreen(subtitle) {
        if (this.ui.destroyed) {
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
        this.ui.markUi(this.titleDim);

        const metrics = this.ui.getLayoutMetrics();
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
        this.ui.styleHudText(this.titleText, 8);
        this.ui.markUi(this.titleText);

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
        this.ui.styleHudText(this.titleSubtitle, 4);
        this.ui.markUi(this.titleSubtitle);

        const canSelect = (this.scene.leaderboardManager?.getMaxUnlocked?.() || 1) > 1;
        let prompt = this.ui.touchControlsEnabled
            ? 'TAP TO START'
            : 'PRESS SPACE OR GAMEPAD A TO START';
        if (canSelect) {
            prompt = this.ui.touchControlsEnabled
                ? 'TAP ◀ ▶ · TAP MIDDLE TO START'
                : '← → SELECT · SPACE START';
        }
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
        this.ui.styleHudText(this.titlePrompt, 4);
        this.ui.markUi(this.titlePrompt);
        const controls = this.ui.touchControlsEnabled
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
        this.ui.styleHudText(this.titleControls, 3);
        this.ui.markUi(this.titleControls);

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
        this.ui.styleHudText(this.titleGamepadStatus, 3);
        this.ui.markUi(this.titleGamepadStatus);
        if (canSelect) {
            this.selectPrevButton = this.ui.markUi(this.createSelectChevron('◀', -1, metrics));
            this.selectNextButton = this.ui.markUi(this.createSelectChevron('▶', 1, metrics));
        }
        this.updateGamepadStatus();

        this.ui.playerNameText.setOrigin(0.5);
        this.ui.playerNameText.setPadding(12, 8, 12, 8);
        this.ui.playerNameText.setBackgroundColor('#17334b');
        this.ui.playerNameText.setDepth(GAME_CONSTANTS.LEADERBOARD_BUTTON_DEPTH);
        this.ui.playerNameText.setVisible(true);
        this.ui.updatePlayerName(this.ui.playerName);
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
        this.ui.setHudVisible(false);
        this.createRaceSetup();
        this.layoutTitleScreen();
    }

    showBranchChoice(options, onPick, subtitle = null) {
        if (this.ui.destroyed || !Array.isArray(options) || options.length < 2) {
            return;
        }
        this.hideBranchChoice();
        this.branchOptions = options;
        this.branchCallback = typeof onPick === 'function' ? onPick : null;
        this.branchObjects = [];
        const width = this.scene.getViewportWidth();
        const height = this.scene.getViewportHeight();
        const centerX = width / 2;
        const centerY = height / 2;
        if (typeof this.scene.add.rectangle === 'function') {
            const dim = this.scene.add.rectangle(0, 0, width, height, 0x04060d, 0.72);
            dim.setOrigin(0, 0);
            dim.setScrollFactor(0);
            dim.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            this.branchObjects.push(dim);
        }
        const hasSubtitle = typeof subtitle === 'string' && subtitle.length > 0;
        const titleY = hasSubtitle ? centerY - 118 : centerY - 90;
        const title = this.scene.add.text(centerX, titleY, 'CHOOSE YOUR PATH', {
            fontSize: '30px',
            fontFamily: HUD_FONT,
            fill: '#ffe566',
            align: 'center',
        });
        title.setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH + 1);
        this.branchObjects.push(title);
        if (hasSubtitle) {
            const blurb = this.scene.add.text(centerX, centerY - 78, subtitle, {
                fontSize: '15px',
                fontFamily: HUD_FONT,
                fill: '#cdd8ea',
                align: 'center',
                wordWrap: { width: Math.max(280, Math.min(560, width - 80)) },
            });
            blurb.setOrigin(0.5, 0);
            blurb.setScrollFactor(0);
            blurb.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH + 1);
            this.branchObjects.push(blurb);
        }
        const firstButtonY = hasSubtitle ? centerY + 2 : centerY - 20;
        options.slice(0, 2).forEach((option, index) => {
            const label = `${index + 1} · ${option.title}`.toUpperCase();
            const button = this.scene.add.text(centerX, firstButtonY + index * 56, label, {
                fontSize: '22px',
                fontFamily: HUD_FONT,
                fill: '#ffffff',
                align: 'center',
            });
            button.setOrigin(0.5);
            button.setScrollFactor(0);
            button.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH + 1);
            button.setPadding(16, 10, 16, 10);
            button.setBackgroundColor('#17334b');
            if (typeof button.setInteractive === 'function') {
                button.setInteractive({ useHandCursor: true });
                button.on('pointerup', () => this.pickBranch(index));
            }
            this.branchObjects.push(button);
        });
        const hintY = hasSubtitle ? centerY + 132 : centerY + 110;
        const hint = this.scene.add.text(centerX, hintY, 'tap, or press 1 / 2', {
            fontSize: '16px',
            fontFamily: HUD_FONT,
            fill: '#9fb3c8',
            align: 'center',
        });
        hint.setOrigin(0.5);
        hint.setScrollFactor(0);
        hint.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH + 1);
        this.branchObjects.push(hint);
    }

    pickBranch(index) {
        const options = this.branchOptions;
        const callback = this.branchCallback;
        if (!options || index < 0 || index >= options.length) {
            return false;
        }
        this.hideBranchChoice();
        if (callback) {
            callback(options[index].level);
        }
        return true;
    }

    hideBranchChoice() {
        (this.branchObjects || []).forEach((object) => {
            object?.destroy?.();
        });
        this.branchObjects = [];
        this.branchOptions = null;
        this.branchCallback = null;
    }

    showTitleLevelSelection(text) {
        if (!this.titleSubtitle) {
            return;
        }
        this.titleSubtitle.setText(text);
        this.layoutTitleScreen();
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
        const insets = this.ui.getSafeAreaInsets();
        const metrics = this.ui.getLayoutMetrics();
        const width = metrics.width;
        const height = metrics.height;
        const centerX = insets.left + metrics.innerWidth / 2;
        const verticalRatio = metrics.isPortrait ? 0.46 : metrics.isCompact ? 0.38 : 0.48;
        const centerY =
            insets.top +
            metrics.innerHeight * verticalRatio +
            (metrics.isCompact && !metrics.isPortrait ? 18 : 0);
        const maxTitleWidth = Math.max(160, metrics.innerWidth - 24);
        this.ui.applyFontSize(this.titleText, metrics.fonts.title);
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
            this.ui.applyFontSize(this.titleText, fitted);
        }
        this.ui.applyFontSize(this.titleSubtitle, metrics.fonts.subtitle);
        this.ui.applyFontSize(this.titlePrompt, metrics.fonts.prompt);
        this.ui.applyFontSize(this.titleControls, metrics.fonts.instructions);
        this.ui.applyFontSize(this.titleGamepadStatus, metrics.fonts.instructions);
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
        if (this.selectPrevButton && this.selectNextButton && this.titleSubtitle) {
            const half =
                (this.titleSubtitle.displayWidth || this.titleSubtitle.width || 200) / 2 + 64;
            this.selectPrevButton.setPosition(centerX - half, this.titleSubtitle.y);
            this.selectNextButton.setPosition(centerX + half, this.titleSubtitle.y);
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
                if (
                    (mode === 'keyboard' || mode === 'keyboard-controller') &&
                    !canRaceWithKeyboard({
                        matchMedia: (query) => window.matchMedia(query),
                        keyboardApi: typeof navigator !== 'undefined' && 'keyboard' in navigator,
                    })
                ) {
                    // Co-op hides the touch buttons, so a touch-only device
                    // that picks a keyboard race would be stuck with no input.
                    dialog.querySelector('#race-controls').textContent =
                        'Keyboard race needs a connected keyboard.';
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
            this.selectPrevButton,
            this.selectNextButton,
        ].forEach((element) => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.selectPrevButton = null;
        this.selectNextButton = null;
        this.titleDim = null;
        this.titleText = null;
        this.titleSubtitle = null;
        this.titlePrompt = null;
        this.titleControls = null;
        this.titleGamepadStatus = null;
        if (!this.ui.destroyed && this.ui.playerNameText) {
            this.ui.playerNameText.setOrigin(1, 0.5);
            this.ui.playerNameText.setPadding(0);
            this.ui.playerNameText.setBackgroundColor();
            this.ui.playerNameText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            this.ui.updatePlayerName(this.ui.playerName);
        }
        if (!this.ui.destroyed) {
            this.ui.setHudVisible(true);
        }
    }

    cleanup() {
        this.leaderboardRequestId += 1;
        this.hideTitleScreen();
        this.hideBranchChoice();
        const elements = [
            this.leaderboardTextObject,
            this.leaderboardBackdrop,
            this.finishDim,
            this.finishBackdrop,
            this.finishTitle,
            this.finishSummary,
            this.finishRetryButton,
            this.finishNewGameButton,
        ];
        elements.forEach((element) => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.leaderboardTextObject = null;
        this.leaderboardBackdrop = null;
        this.finishDim = null;
        this.finishBackdrop = null;
        this.finishTitle = null;
        this.finishSummary = null;
        this.finishRetryButton = null;
        this.finishNewGameButton = null;
    }
}
