import { GAME_CONSTANTS } from './Constants.js';
import {
    CAMPAIGNS,
    LEVEL_CONTENT,
    LEVEL_DEFINITIONS,
    LEVEL_IDS,
    NEWS_LEVEL_IDS,
    campaignForLevel,
} from './levels/index.js';
import {
    DIFFICULTY_LABEL,
    formatElapsedTime,
    JUMP_MODE_LABEL,
    normalizeDifficulty,
    normalizeJumpMode,
} from './GameUtils.js';
import {
    buildLeaderboardModel,
    formatLeaderboardPlainText,
    LEADERBOARD_COLORS,
    medalForRank,
} from './LeaderboardPresentation.js';
import { BANNER_FONT, HUD_FONT } from './UIManager.js';

// Callout pill paint per tone: gold crowns, cyan chases, dim asides.
const CALLOUT_TONES = Object.freeze({
    gold: Object.freeze({ bg: 0x3d2f10, border: 0xffe566, text: '#ffe566' }),
    cyan: Object.freeze({ bg: 0x17334b, border: 0x8ce4ff, text: '#eaf6ff' }),
    dim: Object.freeze({ bg: 0x1a2338, border: 0x617dad, text: '#b9c6e4' }),
});

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

export function newsColumnsFor(count, stackedHeight, availableHeight) {
    return count > 1 && stackedHeight > availableHeight ? 2 : 1;
}

export function formatNewsRow(id, title, outlet) {
    const outletSuffix = outlet ? ` (${outlet})` : '';
    return `${id} · ${title}${outletSuffix}`;
}

export function formatCampaignRow(id, title, locked) {
    return locked ? `${id} · ${title} · LOCKED` : `${id} · ${title}`;
}

const NEWS_PLATE_KEYS = Object.freeze({
    17: 'tickerBg',
    18: 'fearBg',
    19: 'hubbleBg',
    20: 'danceBg',
    21: 'phobosBg',
    22: 'falconBg',
    23: 'tracersBg',
    24: 'clutchBg',
});

export function newsPlateKey(id) {
    return NEWS_PLATE_KEYS[id] || null;
}

export const FEATURED_NEWS_ID = 19;

const ACTION_SENTENCES = Object.freeze({
    17: 'Time the laser audits and dodge the panic drones across the server decks.',
    18: 'Bonk the Bear Raiders to bounce up the VIX needle and dodge the falling candles.',
    19: 'Sink through the decay dip, then ride the reboost lifts past the Servicer Tugs.',
    20: 'Cross the formation grid on the shared beat as the Dancer Bots patrol in waves.',
    21: 'Ride the launch shaft up and loop the crater field past the Survey Orbiters.',
    22: 'Climb the launch tower past the Starlink Sprites, then fall carefully down the descent shaft.',
    23: 'Bonk the Reconnection Sprites to snap across the broken field lines.',
    24: 'Run the bracket, fire on the pawn waves, and face the Champion King.',
});

export function actionSentence(id) {
    return ACTION_SENTENCES[id] || 'Jump, dodge, and chase the golden crown.';
}

const STAGE_ENEMY_KEYS = Object.freeze({
    17: 'tickerBot',
    18: 'bearRaider',
    19: 'servicerTug',
    20: 'dancerBot',
    21: 'surveyOrbiter',
    22: 'starlinkSprite',
    23: 'spriteBot',
    24: 'championKing',
});

export function stageEnemyKey(id) {
    return STAGE_ENEMY_KEYS[id] || 'tickerBot';
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
        this.titleNewsHeader = null;
        this.titleNewsRows = [];
        this.titleCampaignTabs = [];
        this.titleCampaignRows = [];
        this.campaignTab = 'starlight-voyage';
        this.titleBackdrop = null;
        this.titleTickerBg = null;
        this.titleTickerText = null;
        this.titleTickerLive = null;
        this.titleTagline = null;
        this.titleShadow = null;
        this.titleGlow = null;
        this.titleGlowTween = null;
        this.titlePlayTween = null;
        this.titleCrown = null;
        this.titleChicken = null;
        this.titleChickenTween = null;
        this.titleHeroBg = null;
        this.titleHeroThumb = null;
        this.titleHeroKicker = null;
        this.titleHeroOutlet = null;
        this.titleHeroHeadline = null;
        this.titleHeroLevel = null;
        this.titleHeroMechanic = null;
        this.titleHeroPlay = null;
        this.titleHeroPrev = null;
        this.titleHeroNext = null;
        this.titleHeroCounter = null;
        this.titleHeroSourceUrl = null;
        this.titleHeroIndex = Math.max(0, NEWS_LEVEL_IDS.indexOf(FEATURED_NEWS_ID));
        this.titleHeroTimer = null;
        this.titleView = 'featured';
        this.titleMini = false;
        this.titleMoreButton = null;
        this.titleCampaignButton = null;
        this.titleSettingsButton = null;
        this.titleBackButton = null;
        this.titleSettingsHeader = null;
        this.titleStageChicken = null;
        this.titleStageEnemy = null;
        this.titleStageCrown = null;
        this.titleStageChickenTween = null;
        this.titleStageEnemyTween = null;
        this.titlePromptTween = null;
        this.selectPrevButton = null;
        this.selectNextButton = null;
        this.leaderboardTextObject = null;
        this.leaderboardBackdrop = null;
        this.leaderboardExtras = [];
        this.leaderboardTapZone = null;
        this.leaderboardLayout = null;
        this.leaderboardModel = null;
        this.leaderboardPlainText = '';
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
        this.jumpToggleButton = null;
        this.difficultyButton = null;
    }

    layoutLeaderboard() {
        if (!this.leaderboardVisible) {
            return;
        }
        if (this.leaderboardModel) {
            // Rich board: re-render so every row, medal, and pill follows
            // the new metrics. Resize-only cost; input state is untouched.
            this.renderLeaderboard(this.leaderboardModel, this.leaderboardPlainText);
            return;
        }
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
        return Math.max(...bottoms) + (metrics.isCompact ? 14 : 28);
    }

    drawLeaderboardBackdrop(centerX, top, availableWidth, width, height, insets) {
        if (!this.leaderboardBackdrop) {
            return;
        }
        if (this.leaderboardLayout) {
            this.paintLeaderboardPanel();
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
        this.fillLeaderboardPanel(panelX, panelY, panelWidth, panelHeight);
    }

    fillLeaderboardPanel(panelX, panelY, panelWidth, panelHeight) {
        const backdrop = this.leaderboardBackdrop;
        backdrop.fillStyle(0x0b1020, 0.98);
        if (typeof backdrop.fillRoundedRect === 'function') {
            backdrop.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 14);
        } else {
            backdrop.fillRect(panelX, panelY, panelWidth, panelHeight);
        }
        backdrop.lineStyle(2, 0xffe566, 0.35);
        if (typeof backdrop.strokeRoundedRect === 'function') {
            backdrop.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 14);
        } else {
            backdrop.strokeRect(panelX, panelY, panelWidth, panelHeight);
        }
    }

    // Rich panel paint: dim, navy card, gold divider, zebra rows, the
    // player's highlight band, the callout pill, and a medal disc per
    // ranked row. Row geometry comes from renderLeaderboard's layout.
    paintLeaderboardPanel() {
        const layout = this.leaderboardLayout;
        const backdrop = this.leaderboardBackdrop;
        if (!layout || !backdrop) {
            return;
        }
        backdrop.clear();
        backdrop.fillStyle(0x000000, 0.55);
        backdrop.fillRect(0, 0, layout.width, layout.height);
        this.fillLeaderboardPanel(
            layout.panelX,
            layout.panelY,
            layout.panelWidth,
            layout.panelHeight
        );
        const innerX = layout.panelX + 8;
        const innerWidth = layout.panelWidth - 16;
        backdrop.fillStyle(0xffe566, 0.25);
        backdrop.fillRect(layout.panelX + layout.pad, layout.dividerY, innerWidth - 8, 2);
        for (let i = 0; i < layout.rows.length; i++) {
            const row = layout.rows[i];
            const rowY = row.y - 2;
            const rowHeight = row.height + 4;
            if (row.isPlayer) {
                backdrop.fillStyle(0xffe566, 0.1);
                backdrop.fillRect(innerX, rowY, innerWidth, rowHeight);
                backdrop.fillStyle(0xffe566, 0.9);
                backdrop.fillRect(innerX, rowY, 4, rowHeight);
            } else if (i % 2 === 1) {
                backdrop.fillStyle(0xffffff, 0.045);
                backdrop.fillRect(innerX, rowY, innerWidth, rowHeight);
            }
        }
        const pill = layout.callout;
        const tone = CALLOUT_TONES[pill.tone] || CALLOUT_TONES.dim;
        backdrop.fillStyle(tone.bg, 0.95);
        if (typeof backdrop.fillRoundedRect === 'function') {
            backdrop.fillRoundedRect(pill.x, pill.y, pill.width, pill.height, 10);
        } else {
            backdrop.fillRect(pill.x, pill.y, pill.width, pill.height);
        }
        backdrop.lineStyle(1.5, tone.border, 0.8);
        if (typeof backdrop.strokeRoundedRect === 'function') {
            backdrop.strokeRoundedRect(pill.x, pill.y, pill.width, pill.height, 10);
        } else {
            backdrop.strokeRect(pill.x, pill.y, pill.width, pill.height);
        }
        for (const row of layout.rows) {
            const medal = medalForRank(row.rank);
            const radius = Math.max(8, Math.min(11, row.height * 0.32));
            backdrop.fillStyle(medal.fill, 1);
            backdrop.fillCircle(layout.medalX, row.y + row.height / 2, radius);
            backdrop.lineStyle(2, medal.stroke, 1);
            backdrop.strokeCircle(layout.medalX, row.y + row.height / 2, radius);
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
            if (this.ui.destroyed) return;
            if (submission != null && result == null) {
                this.completionSummary += '\nOnline submit failed — saved locally';
                this.updateFinishSummary();
                return;
            }
            if (!result?.rank) return;
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
            if (this.ui.destroyed) return;
            if (submission != null && result == null) {
                this.fullRunSummary += '\nOnline submit failed — saved locally';
                this.updateFinishSummary();
                return;
            }
            if (!result?.rank) return;
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
        this.clearLeaderboardObjects();
        if (this.leaderboardBackdrop) {
            this.leaderboardBackdrop.destroy();
        }
        this.leaderboardBackdrop = null;
        this.leaderboardModel = null;
        this.leaderboardPlainText = '';
        this.leaderboardTextContent = '';
        this.leaderboardVisible = false;
        this.leaderboardRequestId = 0;
        this.ui.refreshLeaderboardButtonStyle();
        this.setTitleButtonsVisible(true);
        this.setFinishVisible(this.scene.gameOver);
    }

    // Title-screen DOM buttons float above the canvas (z-index 30), so they
    // would cover the board on the title page. Hidden while it is open.
    setTitleButtonsVisible(visible) {
        const inSettings = (this.titleView || 'featured') === 'settings';
        for (const button of [this.raceSetupButton, this.jumpToggleButton, this.difficultyButton]) {
            if (button?.style) {
                button.style.display = visible && inSettings ? '' : 'none';
            }
        }
    }

    clearLeaderboardObjects() {
        const extras = this.leaderboardExtras;
        this.leaderboardExtras = [];
        for (const extra of extras) {
            extra?.destroy?.();
        }
        if (this.leaderboardTextObject && !extras.includes(this.leaderboardTextObject)) {
            this.leaderboardTextObject.destroy?.();
        }
        this.leaderboardTextObject = null;
        if (this.leaderboardTapZone) {
            this.leaderboardTapZone.destroy?.();
            this.leaderboardTapZone = null;
        }
        this.leaderboardLayout = null;
    }

    leaderboardFooterText() {
        return 'Tap / ←/→: turn page · B: close';
    }

    displayLeaderboard() {
        this.ui.clearLevelBanner();
        this.setFinishVisible(false);
        this.setTitleButtonsVisible(false);
        const requestId = Date.now() + Math.random();
        this.leaderboardRequestId = requestId;
        this.showLeaderboardMessage('Loading leaderboard…', requestId);

        this.scene.leaderboardManager
            .fetchCompetition()
            .then((competition) => {
                if (this.leaderboardRequestId !== requestId) {
                    return;
                }
                const model = this.createLeaderboardModel(competition);
                this.renderLeaderboard(
                    model,
                    formatLeaderboardPlainText(model, this.leaderboardFooterText())
                );
            })
            .catch(() => {
                if (this.leaderboardRequestId !== requestId) {
                    return;
                }
                if (!this.scene.storageAvailable) {
                    this.showLeaderboardMessage(
                        'Saved times unavailable (local storage disabled).',
                        requestId
                    );
                    return;
                }
                const model = this.createLeaderboardModel(null);
                this.renderLeaderboard(
                    model,
                    formatLeaderboardPlainText(model, this.leaderboardFooterText())
                );
            });
    }

    showLeaderboardMessage(message, requestId) {
        if (this.ui.destroyed || this.leaderboardRequestId !== requestId) {
            return;
        }
        const boardMode = this.scene.leaderboardManager?.mode === 'hard' ? 'HARD' : 'NORMAL';
        this.leaderboardTextContent = `LEADERBOARD · ${boardMode}\n${message}`;
        this.clearLeaderboardObjects();
        this.leaderboardModel = null;
        if (!this.leaderboardBackdrop) {
            this.leaderboardBackdrop = this.scene.add.graphics();
            this.leaderboardBackdrop.setScrollFactor(0);
            this.leaderboardBackdrop.setDepth(GAME_CONSTANTS.LEADERBOARD_OVERLAY_DEPTH - 1);
            this.ui.markUi(this.leaderboardBackdrop);
        }
        const metrics = this.ui.getLayoutMetrics();
        this.leaderboardTextObject = this.scene.add
            .text(0, 0, this.leaderboardTextContent, {
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
        this.leaderboardVisible = true;
        this.layoutLeaderboard();
        this.ui.refreshLeaderboardButtonStyle();
    }

    createLeaderboardModel(competition) {
        const level = this.leaderboardPage;
        const metrics = this.ui.getLayoutMetrics();
        const compactLandscape = metrics.isCompact && !metrics.isPortrait;
        // Short landscape fits two rows per board; portrait phones have
        // the height for three.
        const visibleCount = metrics.isTiny
            ? 2
            : metrics.isCompact
              ? metrics.isPortrait
                  ? 3
                  : 2
              : 5;
        const best = this.scene.leaderboardManager.getPersonalBest(level);
        const localTimes =
            level === 0
                ? best === null
                    ? []
                    : [{ time: best, name: this.scene.playerName }]
                : this.scene.leaderboardManager.readLeaderboard(level);
        return buildLeaderboardModel({
            level,
            best,
            playerName: this.scene.playerName,
            remoteTimes: competition?.levels?.[level] || [],
            localTimes,
            weekly: competition?.weekly?.[level] || [],
            winners: competition?.hallOfFame?.[level] || [],
            week: competition?.week || null,
            online: Boolean(competition),
            visibleCount,
            pastCount: metrics.isCompact ? 1 : 2,
            hidePast: !competition || (compactLandscape && this.scene.gameOver),
        });
    }

    // Rich board: gold header, mode badge, callout pill, medal rows with
    // gaps, and a control footer. Row geometry is measured after each text
    // lands so zebra bands, medals, and the pill always line up, even
    // when long names wrap on tiny screens.
    renderLeaderboard(model, plainText) {
        if (this.ui.destroyed) {
            return;
        }
        this.clearLeaderboardObjects();
        this.leaderboardModel = model;
        this.leaderboardPlainText = plainText;
        const boardMode = this.scene.leaderboardManager?.mode === 'hard' ? 'HARD' : 'NORMAL';
        this.leaderboardTextContent = `LEADERBOARD · ${boardMode}\n${plainText}`;
        if (!this.leaderboardBackdrop) {
            this.leaderboardBackdrop = this.scene.add.graphics();
            this.leaderboardBackdrop.setScrollFactor(0);
            this.leaderboardBackdrop.setDepth(GAME_CONSTANTS.LEADERBOARD_OVERLAY_DEPTH - 1);
            this.ui.markUi(this.leaderboardBackdrop);
        }
        this.renderLeaderboardCard(model, boardMode);
    }

    // Two-pass card: short screens drop past winners rather than pushing
    // the footer off the panel.
    renderLeaderboardCard(model, boardMode) {
        let ctx = this.createLeaderboardContext();
        this.renderLeaderboardHead(ctx, model, boardMode);
        this.renderLeaderboardBoards(ctx, model);
        this.renderLeaderboardPast(ctx, model);
        if (!model.hidePast && ctx.y - ctx.panelY + ctx.pad > ctx.maxPanelH) {
            this.clearLeaderboardObjects();
            ctx = this.createLeaderboardContext();
            const slim = { ...model, hidePast: true };
            this.renderLeaderboardHead(ctx, slim, boardMode);
            this.renderLeaderboardBoards(ctx, slim);
            this.renderLeaderboardPast(ctx, slim);
        }
        this.finishLeaderboardRender(ctx);
    }

    createLeaderboardContext() {
        const metrics = this.ui.getLayoutMetrics();
        const insets = this.ui.getSafeAreaInsets();
        const availableWidth = Math.max(180, metrics.innerWidth - (metrics.isCompact ? 24 : 48));
        const panelWidth = Math.min(availableWidth, 520);
        const centerX = insets.left + metrics.innerWidth / 2;
        const top = this.leaderboardTop(metrics, insets);
        const pad = metrics.isCompact ? 10 : 14;
        const rowSize = metrics.fonts.leaderboard;
        const contentWidth = panelWidth - pad * 2;
        const panelY = top - pad;
        return {
            depth: GAME_CONSTANTS.LEADERBOARD_OVERLAY_DEPTH,
            metrics,
            panelWidth,
            centerX,
            pad,
            gap: metrics.isCompact ? 3 : 8,
            rowGap: metrics.isCompact ? 0 : 1,
            maxPanelH: Math.max(200, metrics.height - panelY - insets.bottom - 8),
            panelX: centerX - panelWidth / 2,
            panelY,
            rowSize,
            headerSize: Math.min(rowSize + 6, 26),
            smallSize: Math.max(12, rowSize - 2),
            tinySize: Math.max(10, rowSize - 4),
            contentWidth,
            rowWrap: Math.max(140, contentWidth - 60),
            rowX: centerX + 14,
            medalX: centerX - panelWidth / 2 + 30,
            rows: [],
            callout: null,
            dividerY: top,
            footer: null,
            y: top,
        };
    }

    addLeaderboardLine(
        ctx,
        content,
        {
            x = ctx.centerX,
            size = ctx.rowSize,
            color = LEADERBOARD_COLORS.row,
            wrap = ctx.contentWidth,
        } = {}
    ) {
        const text = this.scene.add.text(x, ctx.y, content, {
            fontSize: `${size}px`,
            fontFamily: HUD_FONT,
            fill: color,
            align: 'center',
        });
        text.setOrigin(0.5, 0);
        text.setScrollFactor(0);
        text.setDepth(ctx.depth);
        if (wrap) {
            text.setWordWrapWidth(wrap, true);
        }
        this.ui.styleHudText(text, 3);
        this.ui.markUi(text);
        this.leaderboardExtras.push(text);
        ctx.y += text.height;
        return text;
    }

    renderLeaderboardHead(ctx, model, boardMode) {
        const header = this.addLeaderboardLine(ctx, `LEADERBOARD · ${boardMode}`, {
            size: ctx.headerSize,
            color: LEADERBOARD_COLORS.header,
        });
        this.leaderboardTextObject = header;
        ctx.y += 2;
        const sub = this.addLeaderboardLine(
            ctx,
            `${model.label} · ${this.leaderboardPage + 1}/${this.leaderboardPageCount()}`,
            { size: ctx.smallSize, color: LEADERBOARD_COLORS.dim }
        );
        ctx.y += ctx.gap;
        ctx.dividerY = ctx.y;
        ctx.y += ctx.gap;

        // Badge rides the short level line so it never covers the header
        // on narrow panels.
        const hard = boardMode === 'HARD';
        const badge = this.scene.add.text(
            ctx.panelX + ctx.panelWidth - ctx.pad,
            sub.y - 2,
            boardMode,
            {
                fontSize: `${ctx.tinySize}px`,
                fontFamily: HUD_FONT,
                fill: hard ? '#ff8a7a' : '#8ce4ff',
                backgroundColor: hard ? '#5a1f2c' : '#17334b',
                align: 'center',
            }
        );
        badge.setOrigin(1, 0).setScrollFactor(0).setDepth(ctx.depth);
        badge.setPadding(8, 3, 8, 3);
        this.ui.styleHudText(badge, 2);
        this.ui.markUi(badge);
        this.leaderboardExtras.push(badge);

        const tone = CALLOUT_TONES[model.callout.tone] || CALLOUT_TONES.dim;
        const callout = this.addLeaderboardLine(ctx, model.callout.text, {
            size: ctx.smallSize,
            color: tone.text,
            wrap: ctx.contentWidth - 28,
        });
        ctx.callout = {
            x: ctx.centerX - callout.width / 2 - 12,
            y: callout.y - 5,
            width: callout.width + 24,
            height: callout.height + 10,
            tone: model.callout.tone,
        };
        ctx.y += ctx.gap;

        this.addLeaderboardLine(ctx, model.bestText, {
            size: ctx.smallSize,
            color: LEADERBOARD_COLORS.best,
        });
        ctx.y += ctx.gap;
    }

    renderLeaderboardBoards(ctx, model) {
        const sections = [
            {
                title: model.allTimeLabel,
                color: LEADERBOARD_COLORS.allTimeTitle,
                rows: model.allTimeRows,
            },
            {
                title: model.online
                    ? `THIS WEEK (${model.week || 'UTC'})`
                    : 'ONLINE BOARD UNAVAILABLE',
                color: LEADERBOARD_COLORS.weeklyTitle,
                rows: model.online ? model.weeklyRows : null,
            },
        ];
        for (const section of sections) {
            this.addLeaderboardLine(ctx, section.title, {
                size: ctx.smallSize,
                color: section.color,
            });
            ctx.y += 2;
            if (!section.rows || section.rows.length === 0) {
                this.addLeaderboardLine(ctx, model.online ? 'No times yet' : 'Try again later', {
                    size: ctx.smallSize,
                    color: LEADERBOARD_COLORS.dim,
                });
            } else {
                for (const row of section.rows) {
                    this.renderLeaderboardRow(ctx, row);
                }
            }
            ctx.y += ctx.gap;
        }
    }

    renderLeaderboardRow(ctx, row) {
        const line =
            `${row.timeText} · ${row.name}${row.deathText} · ${row.gapText}` +
            `${row.isPlayer ? ' · YOU' : ''}`;
        const rowTop = ctx.y;
        this.addLeaderboardLine(ctx, line, {
            x: ctx.rowX,
            size: ctx.rowSize,
            color: row.isPlayer ? LEADERBOARD_COLORS.playerRow : LEADERBOARD_COLORS.row,
            wrap: ctx.rowWrap,
        });
        ctx.rows.push({
            y: rowTop,
            height: ctx.y - rowTop,
            rank: row.rank,
            isPlayer: row.isPlayer,
        });
        ctx.y += ctx.rowGap;
    }

    renderLeaderboardPast(ctx, model) {
        if (model.hidePast) {
            return;
        }
        this.addLeaderboardLine(ctx, 'PAST WINNERS', {
            size: ctx.smallSize,
            color: LEADERBOARD_COLORS.pastTitle,
        });
        ctx.y += 2;
        if (model.past.length === 0) {
            this.addLeaderboardLine(ctx, 'No past winners yet', {
                size: ctx.smallSize,
                color: LEADERBOARD_COLORS.dim,
            });
        } else {
            for (const winner of model.past) {
                this.addLeaderboardLine(
                    ctx,
                    `${winner.week}: ${winner.timeText} - ${winner.name}`,
                    {
                        size: ctx.smallSize,
                        color: LEADERBOARD_COLORS.row,
                    }
                );
                ctx.y += ctx.rowGap;
            }
        }
        ctx.y += ctx.gap;
    }

    finishLeaderboardRender(ctx) {
        ctx.footer = this.addLeaderboardLine(ctx, this.leaderboardFooterText(), {
            size: ctx.tinySize,
            color: LEADERBOARD_COLORS.footer,
        });

        this.leaderboardLayout = {
            width: ctx.metrics.width,
            height: ctx.metrics.height,
            panelX: ctx.panelX,
            panelY: ctx.panelY,
            panelWidth: ctx.panelWidth,
            panelHeight: ctx.y - ctx.panelY + ctx.pad,
            pad: ctx.pad,
            dividerY: ctx.dividerY,
            callout: ctx.callout,
            rows: ctx.rows,
            medalX: ctx.medalX,
        };

        for (const row of ctx.rows) {
            const medal = medalForRank(row.rank);
            const label = this.scene.add.text(ctx.medalX, row.y + row.height / 2, `${row.rank}`, {
                fontSize: '11px',
                fontFamily: HUD_FONT,
                fill: medal.label,
                align: 'center',
            });
            label.setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(ctx.depth);
            this.ui.markUi(label);
            this.leaderboardExtras.push(label);
        }

        this.paintLeaderboardPanel();

        const nextPage = () => {
            this.leaderboardPage = (this.leaderboardPage + 1) % this.leaderboardPageCount();
            this.displayLeaderboard();
        };
        if (typeof this.scene.add.zone === 'function') {
            const zone = this.scene.add.zone(
                ctx.centerX,
                ctx.panelY + this.leaderboardLayout.panelHeight / 2,
                ctx.panelWidth,
                this.leaderboardLayout.panelHeight
            );
            zone.setScrollFactor(0);
            zone.setDepth(ctx.depth);
            zone.setInteractive({ useHandCursor: true });
            zone.on('pointerup', nextPage);
            this.ui.markUi(zone);
            this.leaderboardTapZone = zone;
        } else {
            ctx.footer.setInteractive({ useHandCursor: true });
            ctx.footer.on('pointerup', nextPage);
        }

        this.leaderboardVisible = true;
        this.ui.refreshLeaderboardButtonStyle();
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
        button.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
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
            this.titleDim = this.scene.add.rectangle(0, 0, width, height, 0x030712, 0.78);
            this.titleDim.setOrigin(0, 0);
        } else {
            this.titleDim = this.scene.add.graphics();
            this.titleDim.fillStyle(0x030712, 0.78);
            this.titleDim.fillRect(0, 0, width, height);
        }
        this.titleDim.setScrollFactor(0);
        this.titleDim.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        if (typeof this.titleDim.setInteractive === 'function') {
            this.titleDim.setInteractive();
            this.titleDim.on('pointerup', (pointer) => this.scene.onTitlePointerUp(pointer));
        }
        this.ui.markUi(this.titleDim);
        this.createTitleGraphics();
        const metrics = this.ui.getLayoutMetrics();
        this.createTitleMarks();
        this.createTitleEpic(metrics);
        this.titleText = this.scene.add
            .text(0, 0, 'SPACE CHICKEN', {
                fontSize: `${metrics.fonts.title}px`,
                fontFamily: 'Impact, Arial Black, sans-serif',
                fill: '#fff6c9',
                fontStyle: 'bold',
                align: 'center',
            })
            .setOrigin(0.5);
        this.titleText.setScrollFactor(0);
        this.titleText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.titleText.setStroke?.('#101529', 3);
        this.titleText.setShadow?.(0, 4, '#ff633c', 0, true, true);
        this.ui.markUi(this.titleText);
        this.titleTagline = this.scene.add
            .text(0, 0, 'REAL HEADLINES. UNREAL ADVENTURES.', {
                fontSize: `${Math.max(13, metrics.fonts.instructions)}px`,
                fontFamily: HUD_FONT,
                fill: '#8ce4ff',
                fontStyle: 'bold',
                align: 'center',
            })
            .setOrigin(0.5);
        this.titleTagline.setScrollFactor(0);
        this.titleTagline.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.titleTagline.setPadding(0);
        this.ui.styleHudText(this.titleTagline, 3);
        this.ui.markUi(this.titleTagline);

        this.createTitleHero(metrics);
        this.titleSubtitle = this.scene.add
            .text(0, 0, subtitle || 'Dawn Run', {
                fontSize: `${metrics.fonts.subtitle}px`,
                fontFamily: BANNER_FONT,
                fill: '#cfe7ff',
                align: 'center',
            })
            .setOrigin(0.5);
        this.titleSubtitle.setScrollFactor(0);
        this.titleSubtitle.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.ui.styleHudText(this.titleSubtitle, 4);
        this.ui.markUi(this.titleSubtitle);

        const canSelect = (this.scene.leaderboardManager?.getMaxUnlocked?.() || 1) > 1;
        let prompt = this.ui.touchControlsEnabled ? 'TAP TO START' : 'PRESS SPACE TO START';
        if (canSelect) {
            prompt = this.ui.touchControlsEnabled
                ? 'TAP A LEVEL TO START'
                : '← → SELECT · SPACE STARTS';
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
        this.titlePrompt.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.titlePrompt.setPadding(16, 10, 16, 10);
        this.titlePrompt.setBackgroundColor('#1b2f4a');
        this.ui.styleHudText(this.titlePrompt, 4);
        this.ui.markUi(this.titlePrompt);
        const controls = this.ui.touchControlsEnabled
            ? 'ARROWS move · JUMP boost · Crown wins  ·  Tap a headline above to play it now'
            : '←→ move · SPACE jump · J fire · ESC pause  ·  Click a headline to play it now';
        this.titleControls = this.scene.add
            .text(0, 0, controls, {
                fontSize: `${metrics.fonts.instructions}px`,
                fontFamily: HUD_FONT,
                fill: '#9fb3c8',
                align: 'center',
                lineSpacing: 4,
            })
            .setOrigin(0.5, 0);
        this.titleControls.setScrollFactor(0);
        this.titleControls.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.ui.styleHudText(this.titleControls, 2);
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
        this.titleGamepadStatus.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.ui.styleHudText(this.titleGamepadStatus, 3);
        this.ui.markUi(this.titleGamepadStatus);
        if (canSelect) {
            this.selectPrevButton = this.ui.markUi(this.createSelectChevron('◀', -1, metrics));
            this.selectNextButton = this.ui.markUi(this.createSelectChevron('▶', 1, metrics));
        }
        this.createTitleNewsSection(metrics);
        this.createTitleCampaignSection(metrics);
        this.createTitleSecondary(metrics);
        this.updateGamepadStatus();
        this.updateHero(false);
        this.startHeroTimer();

        this.ui.playerNameText.setOrigin(0.5);
        this.ui.playerNameText.setPadding(4, 2, 4, 2);
        this.ui.playerNameText.setBackgroundColor();
        this.ui.playerNameText.setDepth(GAME_CONSTANTS.LEADERBOARD_BUTTON_DEPTH);
        this.ui.playerNameText.setVisible(false);
        this.ui.updatePlayerName(this.ui.playerName);
        if (
            !this.prefersReducedTitleMotion() &&
            this.scene.tweens &&
            typeof this.scene.tweens.add === 'function'
        ) {
            this.titlePromptTween = this.scene.tweens.add({
                targets: this.titlePrompt,
                alpha: { from: 0.78, to: 1 },
                duration: GAME_CONSTANTS.TITLE_PROMPT_PULSE_MS,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
            if (this.titleChicken) {
                this.titleChickenTween = this.scene.tweens.add({
                    targets: this.titleChicken,
                    y: '+=7',
                    angle: { from: -12, to: -5 },
                    duration: 1100,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }
            if (this.titleGlow) {
                this.titleGlowTween = this.scene.tweens.add({
                    targets: this.titleGlow,
                    alpha: { from: 0.12, to: 0.24 },
                    scale: { from: 6, to: 7.5 },
                    duration: 1300,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }
            if (this.titleHeroPlay) {
                this.titlePlayTween = this.scene.tweens.add({
                    targets: this.titleHeroPlay,
                    scale: { from: 1, to: 1.045 },
                    duration: 850,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }
        }
        this.ui.setHudVisible(false);
        this.ui.setTouchControlsVisible?.(false);
        this.createRaceSetup();
        this.createJumpToggle();
        this.createDifficulty();
        this.titleView = 'featured';
        this.layoutTitleScreen();
        if (!this.prefersReducedTitleMotion() && this.scene.tweens?.add) {
            this.titleEntranceTween = this.scene.tweens.add({
                targets: [
                    this.titleText,
                    this.titleShadow,
                    this.titleTagline,
                    this.titleHeroThumb,
                ].filter(Boolean),
                alpha: { from: 0, to: 1 },
                duration: 650,
                ease: 'Cubic.easeOut',
            });
        }
    }

    createTitleGraphics() {
        if (typeof this.scene.add.graphics !== 'function') return;
        const mk = (depth) => {
            const g = this.scene.add.graphics();
            g.setScrollFactor(0);
            g.setDepth(depth);
            this.ui.markUi(g);
            return g;
        };
        this.titleBackdrop = mk(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.titleTickerBg = mk(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.titleAtmosphere = mk(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.titleHeroBg = mk(GAME_CONSTANTS.OVERLAY_DEPTH);
    }

    prefersReducedTitleMotion() {
        return (
            typeof window !== 'undefined' &&
            Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
        );
    }

    layoutTitleAtmosphere(metrics) {
        const g = this.titleAtmosphere;
        if (!g?.clear) return;
        const size = `${metrics.width}:${metrics.height}`;
        if (size === this.titleAtmosphereSize) return;
        this.titleAtmosphereSize = size;
        this.titleAtmosphereTween?.stop();
        g.clear();
        g.setPosition(0, 0);
        // One retained graphics object; the scene tween moves it without repainting.
        for (let i = 0; i < 42; i++) {
            const x = (i * 227 + 19) % (metrics.width + 120);
            const y = (i * 131 + 53) % metrics.height;
            g.fillStyle(i % 3 ? 0x8ce4ff : 0xffcb8a, 0.35);
            g.fillRect(x, y, i % 4 ? 2 : 14, 1);
            if (i % 7 === 0) {
                g.fillStyle(0xe9faff, 0.8);
                g.fillRect(x + 5, y - 3, 1, 7);
            }
        }
        if (!this.prefersReducedTitleMotion() && this.scene.tweens?.add) {
            this.titleAtmosphereTween = this.scene.tweens.add({
                targets: g,
                x: -70,
                y: 24,
                alpha: { from: 0.45, to: 1 },
                duration: 6500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }
    }

    createTitleMarks() {
        if (typeof this.scene.add.image !== 'function') return;
        if (this.scene.textures?.exists?.('crown')) {
            this.titleCrown = this.scene.add.image(0, 0, 'crown');
            this.titleCrown.setScrollFactor(0);
            this.titleCrown.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            this.titleCrown.setScale(1.15);
            this.ui.markUi(this.titleCrown);
        }
        if (this.scene.textures?.exists?.('chicken1')) {
            this.titleChicken = this.scene.add.image(
                0,
                0,
                this.scene.textures.exists('chicken_jetpack1') ? 'chicken_jetpack1' : 'chicken1'
            );
            this.titleChicken.setScrollFactor(0);
            this.titleChicken.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            this.titleChicken.setScale(2.6);
            this.ui.markUi(this.titleChicken);
        }
    }

    createTitleEpic(metrics) {
        if (typeof this.scene.add.text === 'function') {
            this.titleShadow = this.scene.add
                .text(0, 0, 'SPACE CHICKEN', {
                    fontSize: `${metrics.fonts.title}px`,
                    fontFamily: 'Impact, Arial Black, sans-serif',
                    fill: '#ff633c',
                    fontStyle: 'bold',
                    align: 'center',
                })
                .setOrigin(0.5);
            this.titleShadow.setScrollFactor(0);
            this.titleShadow.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            this.titleShadow.setAlpha(0.85);
            this.ui.markUi(this.titleShadow);
        }
        if (
            typeof this.scene.add.image === 'function' &&
            this.scene.textures?.exists?.('particleSoft')
        ) {
            this.titleGlow = this.scene.add.image(0, 0, 'particleSoft');
            this.titleGlow.setScrollFactor(0);
            this.titleGlow.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            this.titleGlow.setTint(0xffc93c);
            this.titleGlow.setAlpha(0.32);
            this.titleGlow.setScale(7);
            if (this.titleGlow.setBlendMode && typeof Phaser !== 'undefined')
                this.titleGlow.setBlendMode(Phaser.BlendModes.ADD);
            this.ui.markUi(this.titleGlow);
        }
    }

    createTitleStage() {
        if (typeof this.scene.add.image !== 'function') return;
        const mkImg = (key, fallback) => {
            const use = this.scene.textures?.exists?.(key) ? key : fallback;
            if (!use || !this.scene.textures?.exists?.(use)) return null;
            const img = this.scene.add.image(0, 0, use);
            img.setScrollFactor(0);
            img.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            img.setOrigin(0.5, 1);
            this.ui.markUi(img);
            return img;
        };
        this.titleStageChicken = mkImg('chicken_jetpack1', 'chicken1');
        this.titleStageEnemy = mkImg('servicerTug', 'tickerBot');
        if (this.scene.textures?.exists?.('crown')) {
            this.titleStageCrown = this.scene.add.image(0, 0, 'crown');
            this.titleStageCrown.setScrollFactor(0);
            this.titleStageCrown.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            this.titleStageCrown.setOrigin(0.5, 1);
            this.ui.markUi(this.titleStageCrown);
        }
        if (!this.prefersReducedTitleMotion() && this.scene.tweens?.add) {
            if (this.titleStageChicken)
                this.titleStageChickenTween = this.scene.tweens.add({
                    targets: this.titleStageChicken,
                    y: '-=7',
                    duration: 820,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            if (this.titleStageEnemy)
                this.titleStageEnemyTween = this.scene.tweens.add({
                    targets: this.titleStageEnemy,
                    x: '+=30',
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
        }
    }

    createTitleSecondary(metrics) {
        const depth = GAME_CONSTANTS.OVERLAY_DEPTH;
        const mkBtn = (label, view) => {
            const b = this.scene.add
                .text(0, 0, label, {
                    fontSize: `${Math.max(13, metrics.fonts.instructions - 1)}px`,
                    fontFamily: HUD_FONT,
                    fill: '#cfe7ff',
                    align: 'center',
                })
                .setOrigin(0.5);
            b.setScrollFactor(0);
            b.setDepth(depth);
            b.setPadding(10, 7, 10, 7);
            this.ui.styleHudText(b, 2);
            if (typeof b.setInteractive === 'function') {
                b.setInteractive({ useHandCursor: true });
                b.on('pointerup', () => this.setTitleView(view));
                b.on('pointerover', () => b.setStyle({ fill: '#ffe566' }));
                b.on('pointerout', () => b.setStyle({ fill: '#cfe7ff' }));
            }
            this.ui.markUi(b);
            return b;
        };
        this.titleMoreButton = mkBtn('More stories', 'stories');
        this.titleCampaignButton = mkBtn('Campaign', 'campaign');
        this.titleSettingsButton = mkBtn('Settings', 'settings');
        this.titleBackButton = mkBtn('← Back', 'featured');
        this.titleSettingsHeader = this.scene.add
            .text(0, 0, 'SETTINGS', {
                fontSize: `${Math.max(15, metrics.fonts.instructions + 1)}px`,
                fontFamily: HUD_FONT,
                fill: '#ffe566',
                fontStyle: 'bold',
                align: 'center',
            })
            .setOrigin(0.5, 0);
        this.titleSettingsHeader.setScrollFactor(0);
        this.titleSettingsHeader.setDepth(depth);
        this.ui.styleHudText(this.titleSettingsHeader, 3);
        this.ui.markUi(this.titleSettingsHeader);
    }

    setTitleView(view) {
        this.titleView = ['featured', 'stories', 'campaign', 'settings'].includes(view)
            ? view
            : 'featured';
        this.layoutTitleScreen();
        this.updateNewsRowHighlight();
    }

    heroObjects() {
        return [
            this.titleHeroBg,
            this.titleHeroThumb,
            this.titleHeroKicker,
            this.titleHeroOutlet,
            this.titleHeroHeadline,
            this.titleHeroLevel,
            this.titleHeroMechanic,
            this.titleHeroPlay,
            this.titleHeroPrev,
            this.titleHeroNext,
            this.titleHeroCounter,
            this.titleStageChicken,
            this.titleStageEnemy,
            this.titleStageCrown,
        ];
    }

    applyTitleView() {
        const view = this.titleView || 'featured';
        const show = (obj, on) => obj?.setVisible?.(on);
        for (const obj of this.heroObjects()) show(obj, view === 'featured');
        show(this.titleMoreButton, view === 'featured');
        show(this.titleCampaignButton, view === 'featured');
        show(this.titleSettingsButton, view === 'featured');
        show(this.titleBackButton, view !== 'featured');
        show(this.titleSettingsHeader, view === 'settings');
        show(this.titleNewsHeader, view === 'stories');
        for (const row of this.titleNewsRows || []) show(row, view === 'stories');
        show(this.titleSubtitle, false);
        show(this.selectPrevButton, false);
        show(this.selectNextButton, false);
        show(this.titlePrompt, view === 'campaign');
        for (const tab of this.titleCampaignTabs || []) show(tab, view === 'campaign');
        for (const row of this.titleCampaignRows || []) {
            show(row, view === 'campaign' && row?.campaignId === this.campaignTab);
        }
        if (this.titleControls) this.titleControls.setVisible(false);
        if (this.titleGamepadStatus) this.titleGamepadStatus.setVisible(false);
        if (this.titleTickerLive) this.titleTickerLive.setVisible(false);
        if (this.titleTickerText) this.titleTickerText.setVisible(false);
        this.titleTickerBg?.clear?.();
        const inSettings = view === 'settings';
        for (const btn of [this.raceSetupButton, this.jumpToggleButton, this.difficultyButton]) {
            if (btn?.style) btn.style.display = inSettings ? '' : 'none';
        }
        if (this.ui.playerNameText) this.ui.playerNameText.setVisible(inSettings);
        if (view === 'featured' && this.titleHeroThumb) this.updateStageVisibility();
    }

    updateStageVisibility() {
        const id = this.featuredNewsId();
        const plate = newsPlateKey(id);
        if (this.titleHeroThumb) {
            const has = Boolean(plate && this.scene.textures?.exists?.(plate));
            this.titleHeroThumb.setVisible(has);
            if (has) this.titleHeroThumb.setTexture(plate);
        }
        const enemyKey = stageEnemyKey(id);
        if (this.titleStageEnemy && this.scene.textures?.exists?.(enemyKey))
            this.titleStageEnemy.setTexture(enemyKey);
    }

    createTitleHero(metrics) {
        const depth = GAME_CONSTANTS.OVERLAY_DEPTH;
        const mk = (str, size, fill, bold = false) => {
            const t = this.scene.add
                .text(0, 0, str, {
                    fontSize: `${size}px`,
                    fontFamily: HUD_FONT,
                    fill,
                    fontStyle: bold ? 'bold' : 'normal',
                    align: 'left',
                })
                .setOrigin(0, 0);
            t.setScrollFactor(0);
            t.setDepth(depth);
            this.ui.styleHudText(t, 3);
            this.ui.markUi(t);
            return t;
        };
        const ins = metrics.fonts.instructions;
        this.titleHeroKicker = mk('NEWS → NEXT LEVEL', Math.max(11, ins - 2), '#8ce4ff', true);
        this.titleHeroCounter = mk('', Math.max(11, ins - 2), '#8ce4ff', true);
        this.titleHeroCounter.setOrigin(1, 0);
        this.titleHeroOutlet = mk('', Math.max(12, ins - 1), '#9fb3c8');
        if (typeof this.titleHeroOutlet.setInteractive === 'function') {
            this.titleHeroOutlet.setInteractive({ useHandCursor: true });
            this.titleHeroOutlet.on('pointerup', () => this.openNewsLink());
            this.titleHeroOutlet.on('pointerover', () => this.titleHeroOutlet.setColor('#8ce4ff'));
            this.titleHeroOutlet.on('pointerout', () => this.titleHeroOutlet.setColor('#9fb3c8'));
        }
        this.titleHeroHeadline = mk('', Math.max(16, ins + 2), '#ffffff', true);
        this.titleHeroHeadline.setWordWrapWidth(400, true);
        this.titleHeroLevel = mk('', Math.max(15, ins + 1), '#ffe566', true);
        this.titleHeroMechanic = mk('', Math.max(13, ins - 1), '#e8f1ff');
        this.titleHeroMechanic.setWordWrapWidth(400, true);
        if (typeof this.scene.add.image === 'function') {
            this.titleHeroThumb = this.scene.add.image(0, 0, 'tickerBg');
            this.titleHeroThumb.setScrollFactor(0);
            this.titleHeroThumb.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            this.titleHeroThumb.setOrigin(0, 0);
            this.ui.markUi(this.titleHeroThumb);
            if (!this.scene.textures?.exists?.('tickerBg')) this.titleHeroThumb.setVisible(false);
        }
        this.createTitleStage();
        this.titleHeroPlay = this.scene.add
            .text(0, 0, '▶  LAUNCH STORY', {
                fontSize: `${Math.max(15, ins + 1)}px`,
                fontFamily: HUD_FONT,
                fill: '#111827',
                fontStyle: 'bold',
                align: 'center',
            })
            .setOrigin(0, 0.5);
        this.titleHeroPlay.setScrollFactor(0);
        this.titleHeroPlay.setDepth(depth);
        this.titleHeroPlay.setPadding(16, 10, 16, 10);
        this.titleHeroPlay.setBackgroundColor('#ffe566');
        // Dark text on gold: HUD stroke/shadow smears it, so keep it flat.
        this.titleHeroPlay.setStroke?.('#ffe566', 0);
        this.titleHeroPlay.setShadow?.(0, 0, '#000000', 0, false, false);
        if (typeof this.titleHeroPlay.setInteractive === 'function') {
            this.titleHeroPlay.setInteractive({ useHandCursor: true });
            this.titleHeroPlay.on('pointerup', () => {
                const id = NEWS_LEVEL_IDS[this.titleHeroIndex];
                if (id) this.scene.startNewsLevel(id);
            });
            this.titleHeroPlay.on('pointerover', () =>
                this.titleHeroPlay.setBackgroundColor('#fff0a0')
            );
            this.titleHeroPlay.on('pointerout', () =>
                this.titleHeroPlay.setBackgroundColor('#ffe566')
            );
        }
        this.ui.markUi(this.titleHeroPlay);
        const nav = (label, dir) => {
            const b = this.scene.add
                .text(0, 0, label, {
                    fontSize: `${Math.max(18, ins + 4)}px`,
                    fontFamily: HUD_FONT,
                    fill: '#ffffff',
                    fontStyle: 'bold',
                    align: 'center',
                })
                .setOrigin(0.5);
            b.setScrollFactor(0);
            b.setDepth(depth);
            b.setPadding(10, 6, 10, 6);
            b.setBackgroundColor('#1b3a5c');
            this.ui.styleHudText(b, 3);
            if (typeof b.setInteractive === 'function') {
                b.setInteractive({ useHandCursor: true });
                b.on('pointerup', () => this.cycleHero(dir));
            }
            this.ui.markUi(b);
            return b;
        };
        this.titleHeroPrev = nav('‹', -1);
        this.titleHeroNext = nav('›', 1);
    }

    featuredNewsId() {
        return NEWS_LEVEL_IDS[this.titleHeroIndex] || NEWS_LEVEL_IDS[0];
    }

    openNewsLink() {
        const url = this.titleHeroSourceUrl;
        if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return false;
        if (typeof window === 'undefined' || typeof window.open !== 'function') return false;
        window.open(url, '_blank', 'noopener');
        return true;
    }

    updateHero(animate = true) {
        const id = this.featuredNewsId();
        if (!id || !this.titleHeroHeadline) return;
        const title = LEVEL_DEFINITIONS[id]?.TITLE || `Level ${id}`;
        const news = LEVEL_CONTENT[id]?.news || {};
        const outlet = news.outlet || 'News wire';
        this.titleHeroSourceUrl = typeof news.url === 'string' && news.url ? news.url : null;
        if (this.titleHeroOutlet) {
            this.titleHeroOutlet.setText(
                this.titleHeroSourceUrl ? `Source: ${outlet} ↗` : `Source: ${outlet}`
            );
        }
        if (this.titleHeroHeadline) {
            const raw = news.headline || title;
            this.titleHeroHeadline.setText(raw.length > 110 ? `${raw.slice(0, 107)}…` : raw);
        }
        if (this.titleHeroLevel)
            this.titleHeroLevel.setText(`LEVEL ${id} · ${title.toUpperCase()}`);
        if (this.titleHeroMechanic) this.titleHeroMechanic.setText(actionSentence(id));
        if (this.titleHeroCounter)
            this.titleHeroCounter.setText(
                `Story ${this.titleHeroIndex + 1} of ${NEWS_LEVEL_IDS.length}`
            );
        this.updateStageVisibility();
        this.updateNewsRowHighlight(id);
        if (
            animate &&
            !this.prefersReducedTitleMotion() &&
            this.scene.tweens?.add &&
            this.titleHeroHeadline
        ) {
            this.titleHeroHeadline.setAlpha(0.25);
            this.scene.tweens.add({
                targets: [this.titleHeroHeadline, this.titleHeroLevel, this.titleHeroMechanic],
                alpha: { from: 0.25, to: 1 },
                duration: 260,
                ease: 'Sine.easeOut',
            });
        }
        this.layoutTitleScreen();
    }

    cycleHero(dir) {
        if (!NEWS_LEVEL_IDS.length) return;
        this.titleHeroIndex =
            (this.titleHeroIndex + dir + NEWS_LEVEL_IDS.length) % NEWS_LEVEL_IDS.length;
        this.updateHero(true);
        this.restartHeroTimer();
    }

    startHeroTimer() {
        this.stopHeroTimer();
        if (!this.scene.time?.addEvent || NEWS_LEVEL_IDS.length < 2) return;
        try {
            this.titleHeroTimer = this.scene.time.addEvent({
                delay: 6000,
                loop: true,
                callback: () => this.cycleHero(1),
            });
        } catch {
            this.titleHeroTimer = null;
        }
    }

    restartHeroTimer() {
        if (this.titleHeroTimer?.reset) {
            try {
                this.titleHeroTimer.reset({
                    delay: 6000,
                    loop: true,
                    callback: () => this.cycleHero(1),
                });
                return;
            } catch {
                /* fall through */
            }
        }
        this.startHeroTimer();
    }

    stopHeroTimer() {
        if (this.titleHeroTimer?.remove) {
            try {
                this.titleHeroTimer.remove(false);
            } catch {
                /* noop */
            }
        }
        this.titleHeroTimer = null;
    }

    createTitleNewsSection(metrics) {
        this.titleNewsHeader = null;
        this.titleNewsRows = [];
        if (!Array.isArray(NEWS_LEVEL_IDS) || NEWS_LEVEL_IDS.length === 0) {
            return;
        }
        this.titleNewsHeader = this.scene.add
            .text(0, 0, 'MORE STORIES', {
                fontSize: `${metrics.fonts.instructions}px`,
                fontFamily: HUD_FONT,
                fill: '#ffe566',
                fontStyle: 'bold',
                align: 'center',
            })
            .setOrigin(0.5, 0);
        this.titleNewsHeader.setScrollFactor(0);
        this.titleNewsHeader.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.ui.styleHudText(this.titleNewsHeader, 3);
        this.ui.markUi(this.titleNewsHeader);
        for (const id of NEWS_LEVEL_IDS) {
            const title = LEVEL_DEFINITIONS[id]?.TITLE || `Level ${id}`;
            const outlet = LEVEL_CONTENT[id]?.news?.outlet || '';
            const row = this.scene.add
                .text(0, 0, formatNewsRow(id, title, outlet), {
                    fontSize: `${Math.max(12, metrics.fonts.instructions - 1)}px`,
                    fontFamily: HUD_FONT,
                    fill: '#ffffff',
                    align: 'center',
                })
                .setOrigin(0.5, 0);
            row.setScrollFactor(0);
            row.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            row.setPadding(10, 4, 10, 4);
            row.setBackgroundColor('#14283e');
            this.ui.styleHudText(row, 3);
            if (typeof row.setInteractive === 'function') {
                row.setInteractive({ useHandCursor: true });
                row.on('pointerup', () => this.scene.startNewsLevel(id));
                row.on('pointerover', () => {
                    const idx = NEWS_LEVEL_IDS.indexOf(id);
                    if (idx >= 0 && idx !== this.titleHeroIndex) {
                        this.titleHeroIndex = idx;
                        this.updateHero(true);
                        this.restartHeroTimer();
                    }
                });
            }
            this.ui.markUi(row);
            this.titleNewsRows.push(row);
        }
    }

    createTitleCampaignSection(metrics) {
        this.titleCampaignTabs = [];
        this.titleCampaignRows = [];
        const selected = this.scene?.selectedLevel;
        this.campaignTab = campaignForLevel(selected)?.id || 'starlight-voyage';
        const fontSize = Math.max(12, metrics.fonts.instructions - 1);
        for (const campaign of CAMPAIGNS) {
            const levels = campaign.levels;
            const tab = this.scene.add
                .text(
                    0,
                    0,
                    `${campaign.name.toUpperCase()} · ${levels[0]}-${levels[levels.length - 1]}`,
                    {
                        fontSize: `${fontSize}px`,
                        fontFamily: HUD_FONT,
                        fill: '#ffffff',
                        fontStyle: 'bold',
                        align: 'center',
                    }
                )
                .setOrigin(0.5, 0);
            tab.setScrollFactor(0);
            tab.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            tab.setPadding(10, 6, 10, 6);
            tab.setBackgroundColor('#1b3a5c');
            this.ui.styleHudText(tab, 3);
            tab.campaignId = campaign.id;
            if (typeof tab.setInteractive === 'function') {
                tab.setInteractive({ useHandCursor: true });
                tab.on('pointerup', () => this.scene.selectCampaignTab(campaign.id));
            }
            this.ui.markUi(tab);
            this.titleCampaignTabs.push(tab);
        }
        for (const campaign of CAMPAIGNS) {
            for (const id of campaign.levels) {
                const title = LEVEL_DEFINITIONS[id]?.TITLE || `Level ${id}`;
                const row = this.scene.add
                    .text(0, 0, formatCampaignRow(id, title, false), {
                        fontSize: `${fontSize}px`,
                        fontFamily: HUD_FONT,
                        fill: '#ffffff',
                        align: 'center',
                    })
                    .setOrigin(0.5, 0);
                row.setScrollFactor(0);
                row.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
                row.setPadding(10, 4, 10, 4);
                row.setBackgroundColor('#14283e');
                this.ui.styleHudText(row, 3);
                row.campaignLevel = id;
                row.campaignId = campaign.id;
                if (typeof row.setInteractive === 'function') {
                    row.setInteractive({ useHandCursor: true });
                    row.on('pointerup', () => this.scene.startCampaignLevel(id));
                }
                this.ui.markUi(row);
                this.titleCampaignRows.push(row);
            }
        }
        this.updateCampaignHighlight();
    }

    followCampaignTab() {
        const followed = campaignForLevel(this.scene?.selectedLevel);
        if (followed) {
            this.campaignTab = followed.id;
        }
    }

    updateCampaignHighlight() {
        const selected = this.scene?.selectedLevel;
        const max = this.scene?.leaderboardManager?.getMaxUnlocked?.() || 1;
        for (const tab of this.titleCampaignTabs || []) {
            const active = tab?.campaignId === this.campaignTab;
            tab?.setBackgroundColor?.(active ? '#8c1d18' : '#1b3a5c');
            tab?.setStyle?.({ fill: active ? '#ffe566' : '#ffffff' });
        }
        for (const row of this.titleCampaignRows || []) {
            if (!row) {
                continue;
            }
            const id = row.campaignLevel;
            const locked = !(Number.isFinite(id) && id <= max);
            const title = LEVEL_DEFINITIONS[id]?.TITLE || `Level ${id}`;
            row.setText?.(formatCampaignRow(id, title, locked));
            const active = row.campaignId === this.campaignTab && id === selected;
            row.setBackgroundColor?.(active ? '#8c1d18' : '#14283e');
            row.setStyle?.({
                fill: active ? '#ffe566' : locked ? '#5a6b82' : '#ffffff',
            });
        }
    }

    showBranchChoice(options, onPick, subtitle = null) {
        if (this.ui.destroyed || !Array.isArray(options) || options.length < 2) {
            return;
        }
        this.ui.clearLevelBanner();
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
        this.followCampaignTab();
        this.updateCampaignHighlight();
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
        const maxTitleWidth = Math.max(160, metrics.innerWidth - 24);
        const logoSize = Math.min(
            metrics.isCompact ? (metrics.isPortrait ? 54 : 42) : 108,
            Math.floor(metrics.innerWidth * 0.105)
        );
        this.ui.applyFontSize(this.titleText, logoSize);
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
        if (this.titleTagline)
            this.ui.applyFontSize(this.titleTagline, Math.max(13, metrics.fonts.instructions));
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
                this.titleDim.fillStyle(0x030712, 0.78);
                this.titleDim.fillRect(0, 0, width, height);
            }
        }
        this.placeTitleCluster(centerX, metrics);
    }

    paintTitleChrome(metrics) {
        const insets = this.ui.getSafeAreaInsets();
        if (this.titleBackdrop?.clear) {
            const g = this.titleBackdrop;
            g.clear();
            g.fillStyle(0x04070f, 1);
            g.fillRect(0, 0, metrics.width, metrics.height);
            for (let i = 0; i < 70; i++) {
                const sx = (i * 173 + 41) % Math.max(1, metrics.width);
                const sy = (i * 97 + 23) % Math.max(1, metrics.height);
                g.fillStyle(i % 5 === 0 ? 0xffe566 : 0xffffff, i % 3 === 0 ? 0.5 : 0.22);
                g.fillCircle(sx, sy, i % 7 === 0 ? 2 : 1);
            }
            // Baked orbital glow and perspective rails: no per-frame drawing.
            const cx = metrics.width * 0.5;
            const horizon = metrics.height * 1.35;
            const radius = metrics.height * 0.69;
            for (let i = 12; i > 0; i--) {
                g.fillStyle(0x367de8, 0.012 + (12 - i) * 0.002);
                g.fillCircle(cx, horizon, radius + i * 12);
            }
            g.fillStyle(0x071329, 1);
            g.fillCircle(cx, horizon, radius);
            if (g.strokeCircle) {
                g.lineStyle(2, 0x79dcff, 0.6);
                g.strokeCircle(cx, horizon, radius);
            }
            if (g.lineBetween) {
                for (let i = -5; i <= 5; i++) {
                    g.lineStyle(1, 0x5c9bda, 0.12);
                    g.lineBetween(
                        cx + i * 45,
                        metrics.height * 0.72,
                        cx + i * metrics.width * 0.23,
                        metrics.height
                    );
                }
                for (let i = 0; i < 7; i++) {
                    const x = (i * 317 + 70) % metrics.width;
                    const y = (i * 137 + 50) % metrics.height;
                    g.lineStyle(2, i % 2 ? 0xffae68 : 0x8ce4ff, 0.3);
                    g.lineBetween(x, y, x + 40, y - 16);
                }
            }
            g.fillStyle(0xff794c, 1);
            g.fillRect(0, insets.top, metrics.width * 0.3, 3);
            g.fillStyle(0x8ce4ff, 1);
            g.fillRect(metrics.width * 0.3, insets.top, metrics.width * 0.7, 3);
        }
    }

    layoutTitleChicken(centerX, metrics) {
        if (!this.titleChicken) return;
        const tw = this.titleText.displayWidth || 320;
        const shortLandscape = metrics.isCompact && !metrics.isPortrait;
        const wide = metrics.innerWidth >= 700 && !metrics.isPortrait;
        const portrait = metrics.isPortrait && metrics.innerWidth >= 600;
        const show = !shortLandscape && (wide || portrait);
        this.titleChicken.setVisible(show);
        if (wide) {
            this.titleChicken.setPosition(centerX + tw / 2 + 58, this.titleText.y + 2);
            this.titleChicken.setScale(metrics.isCompact ? 2.2 : 3.6);
        } else if (portrait) {
            this.titleChicken.setPosition(centerX + tw / 2 + 22, this.titleText.y + 2);
            this.titleChicken.setScale(1.7);
        }
        const g = this.titleBackdrop;
        if (wide && show && g?.strokeCircle) {
            const x = this.titleChicken.x;
            const y = this.titleChicken.y;
            g.lineStyle(1, 0x8ce4ff, 0.5);
            g.strokeCircle(x, y, 57);
            g.lineStyle(5, 0x8ce4ff, 0.06);
            g.strokeCircle(x, y, 63);
            g.fillStyle(0xffbc63, 0.8);
            g.fillRect(x - 63, y + 36, 26, 2);
            g.fillRect(x + 37, y - 36, 26, 2);
        }
        if (this.titleGlow) {
            this.titleGlow.setVisible(show);
            if (show) this.titleGlow.setPosition(this.titleChicken.x, this.titleChicken.y);
        }
    }

    layoutTitleHeader(centerX, metrics) {
        const insets = this.ui.getSafeAreaInsets();
        const shortLandscape = metrics.isCompact && !metrics.isPortrait;
        this.paintTitleChrome(metrics);
        this.layoutTitleAtmosphere(metrics);
        let y = insets.top + (shortLandscape ? 8 : Math.max(30, (metrics.innerHeight - 650) / 2));
        // Name lives in Settings now; the header keeps a clear band under
        // the top HUD row (leaderboard/music) on small screens.
        if (metrics.innerWidth < 700 && !shortLandscape) y += 30;
        const titleH = this.titleText.displayHeight || this.titleText.height || 48;
        if (this.titleCrown) {
            const tw = this.titleText.displayWidth || this.titleText.width || 320;
            if (metrics.innerWidth >= 560) {
                this.titleCrown.setPosition(centerX - tw / 2 - 30, y + titleH / 2 - 2);
                this.titleCrown.setScale(metrics.isCompact ? 0.95 : 1.2);
                this.titleCrown.setVisible(true);
            } else {
                this.titleCrown.setPosition(centerX, y + 10);
                this.titleCrown.setVisible(!shortLandscape);
                if (!shortLandscape) y += 20;
            }
        }
        this.titleText.setPosition(centerX, y + titleH / 2);
        this.titleShadow?.setPosition(centerX + 5, y + titleH / 2 + 5);
        if (this.titleShadow) {
            this.ui.applyFontSize(this.titleShadow, parseInt(this.titleText.style.fontSize, 10));
            this.titleShadow.setVisible(true);
        }
        y += titleH + 6;
        this.layoutTitleChicken(centerX, metrics);
        if (this.titleTagline) {
            this.titleTagline.setPosition(centerX, y + 12);
            this.titleTagline.setVisible(true);
            y += 26;
        }
        return y;
    }

    heroSize(metrics) {
        const shortLandscape = metrics.isCompact && !metrics.isPortrait;
        const w = Math.max(300, Math.min(metrics.innerWidth - 24, metrics.isPortrait ? 680 : 920));
        // Short landscape keeps a compact-but-real hero: tall enough for the
        // preview thumb beside the headline/mechanic plus the play row, and
        // clamped so the card + secondary row still fit the inner height.
        let h = shortLandscape
            ? Math.max(176, Math.min(216, metrics.innerHeight - 168))
            : metrics.isTiny
              ? 272
              : metrics.isCompact
                ? 306
                : 420;
        if (metrics.isPortrait && metrics.innerWidth < 600)
            h = Math.min(420, metrics.innerHeight - 245);
        return { w, h, shortLandscape };
    }

    paintCardFrame(heroX, heroTop, heroW, heroH) {
        const g = this.titleHeroBg;
        if (!g?.clear) return;
        g.clear();
        // Layered edge light gives the mission panel depth without a bitmap asset.
        for (let i = 3; i > 0; i--) {
            g.lineStyle(i * 4, 0x4acfff, 0.025);
            if (g.strokeRoundedRect) g.strokeRoundedRect(heroX, heroTop, heroW, heroH, 16);
        }
        g.fillStyle(0x0b1628, 0.97);
        if (typeof g.fillRoundedRect === 'function')
            g.fillRoundedRect(heroX, heroTop, heroW, heroH, 16);
        else g.fillRect(heroX, heroTop, heroW, heroH);
        g.fillStyle(0xff794c, 1);
        if (typeof g.fillRoundedRect === 'function')
            g.fillRoundedRect(heroX, heroTop, heroW, 7, { tl: 16, tr: 16, bl: 0, br: 0 });
        else g.fillRect(heroX, heroTop, heroW, 7);
        g.lineStyle(1, 0x6896b3, 0.7);
        if (typeof g.strokeRoundedRect === 'function')
            g.strokeRoundedRect(heroX, heroTop, heroW, heroH, 16);
        else g.strokeRect(heroX, heroTop, heroW, heroH);
        g.fillStyle(0x8ce4ff, 0.8);
        g.fillRect(heroX + 24, heroTop + heroH - 2, 68, 2);
        g.fillRect(heroX + heroW - 92, heroTop + heroH - 2, 68, 2);
    }

    layoutStage(heroX, stageY, stageW, stageH, pad, compact = false) {
        const floorY = stageY + stageH - 6;
        if (this.titleHeroThumb) {
            this.titleHeroThumb.setPosition(heroX + pad, stageY);
            this.titleHeroThumb.setDisplaySize(stageW, stageH);
            this.titleHeroThumb.setAlpha(1);
        }
        const place = (img, x, size) => {
            if (!img) return;
            img.setPosition(x, floorY);
            const s = size / Math.max(1, img.width || size);
            img.setScale(s, s);
            img.setVisible(true);
        };
        place(this.titleStageChicken, heroX + pad + (compact ? 30 : 42), compact ? 34 : 46);
        place(this.titleStageEnemy, heroX + pad + stageW * 0.52, compact ? 54 : 78);
        place(this.titleStageCrown, heroX + pad + stageW - (compact ? 30 : 42), compact ? 26 : 36);
        const g = this.titleHeroBg;
        if (g?.fillStyle) {
            g.fillStyle(0x8ce4ff, 0.35);
            g.fillRect(heroX + pad, floorY, stageW, 3);
        }
    }

    layoutHeroCard(centerX, heroTop, metrics) {
        if (!this.titleHeroBg) return { bottom: heroTop, heroX: centerX, heroW: 0 };
        const { w: heroW, h: heroH, shortLandscape } = this.heroSize(metrics);
        const heroX = centerX - heroW / 2;
        this.paintCardFrame(heroX, heroTop, heroW, heroH);
        const pad = metrics.isTiny ? 12 : 16;
        const textX = heroX + pad;
        const textW = heroW - pad * 2;
        const mini = shortLandscape;
        this.titleMini = mini;
        this.ui.applyFontSize(this.titleHeroHeadline, metrics.isCompact ? 16 : 22);
        this.ui.applyFontSize(this.titleHeroLevel, metrics.isCompact ? 15 : 20);
        this.titleHeroLevel?.setWordWrapWidth(textW, true);
        let y = heroTop + 12;
        this.titleHeroKicker?.setPosition(textX, y);
        this.titleHeroCounter?.setPosition(heroX + heroW - pad, heroTop + 12);
        y += 24;
        if (mini) {
            // Compact-but-real hero: a scaled preview thumb on the left with
            // the stage sprites on it, headline/level/mechanic on the right.
            const thumbW = Math.min(280, Math.floor(textW * 0.38));
            const thumbH = Math.max(84, Math.min(118, heroH - 98));
            this.layoutStage(heroX, y, thumbW, thumbH, pad, true);
            const colX = textX + thumbW + 14;
            const colW = Math.max(180, heroX + heroW - pad - colX);
            let cy = y;
            this.titleHeroOutlet?.setPosition(colX, cy);
            cy += Math.max(16, (this.titleHeroOutlet?.displayHeight || 16) + 4);
            if (this.titleHeroHeadline) {
                this.titleHeroHeadline.setWordWrapWidth(colW, true);
                this.titleHeroHeadline.setPosition(colX, cy);
                cy += (this.titleHeroHeadline.displayHeight || 36) + 6;
            }
            this.titleHeroLevel?.setPosition(colX, cy);
            cy += (this.titleHeroLevel?.displayHeight || 22) + 4;
            if (this.titleHeroMechanic) {
                this.titleHeroMechanic.setWordWrapWidth(colW, true);
                this.titleHeroMechanic.setPosition(colX, cy);
            }
        } else {
            const stageH = metrics.isCompact
                ? metrics.isPortrait && metrics.innerHeight >= 650
                    ? 150
                    : 70
                : 180;
            this.layoutStage(heroX, y, textW, stageH, pad);
            y += stageH + 10;
            this.titleHeroOutlet?.setPosition(textX, y);
            y += Math.max(16, (this.titleHeroOutlet?.displayHeight || 16) + 4);
            if (this.titleHeroHeadline) {
                this.titleHeroHeadline.setWordWrapWidth(textW, true);
                this.titleHeroHeadline.setPosition(textX, y);
                y += (this.titleHeroHeadline.displayHeight || 36) + 6;
            }
            this.titleHeroLevel?.setPosition(textX, y);
            y += (this.titleHeroLevel?.displayHeight || 22) + 4;
            if (this.titleHeroMechanic) {
                this.titleHeroMechanic.setWordWrapWidth(textW, true);
                this.titleHeroMechanic.setPosition(textX, y);
            }
        }
        // Long headlines must push the action row down, never overlap it.
        const copyBottom =
            (this.titleHeroMechanic?.y || y) + (this.titleHeroMechanic?.displayHeight || 20);
        const actualH = Math.max(heroH, copyBottom - heroTop + 68);
        this.paintCardFrame(heroX, heroTop, heroW, actualH);
        const btnY = heroTop + actualH - 30;
        this.titleHeroPlay?.setPosition(textX, btnY);
        // A luminous launch rail, aligned with the actual button hit area.
        const g = this.titleHeroBg;
        if (g?.fillStyle && this.titleHeroPlay) {
            const bw = this.titleHeroPlay.width;
            const bh = this.titleHeroPlay.height;
            g.fillStyle(0xffbd45, 0.1);
            g.fillRect(textX - 5, btnY - bh / 2 - 5, bw + 10, bh + 10);
            g.fillStyle(0xff9945, 0.9);
            g.fillRect(textX, btnY + bh / 2 + 2, bw, 3);
        }
        this.titleHeroNext?.setPosition(heroX + heroW - pad - 18, btnY);
        this.titleHeroPrev?.setPosition(heroX + heroW - pad - 62, btnY);
        return { bottom: heroTop + actualH, heroX, heroW };
    }

    layoutStoriesPanel(frame, metrics) {
        const pad = 16;
        const rows = this.titleNewsRows || [];
        this.ui.applyFontSize(this.titleNewsHeader, metrics.fonts.instructions);
        for (const row of rows)
            this.ui.applyFontSize(row, Math.max(11, metrics.fonts.instructions - 2));
        this.titleNewsHeader.setPosition(frame.centerX, frame.y + 28);
        const top = frame.y + 56;
        const columns = metrics.innerWidth >= 700 ? 2 : 1;
        const totalW = frame.w - pad * 2;
        const colW = (totalW - (columns - 1) * 10) / columns;
        for (const row of rows) row.setWordWrapWidth?.(colW, true);
        // Deal row-major across two columns so story numbers read
        // left-to-right like the campaign rows.
        const lanes =
            columns === 1
                ? [rows]
                : [rows.filter((_, i) => i % 2 === 0), rows.filter((_, i) => i % 2 === 1)];
        lanes.forEach((lane, c) => {
            const colX = columns === 1 ? frame.centerX : frame.x + pad + colW * (c + 0.5) + c * 10;
            let rowY = top;
            for (const row of lane) {
                row.setPosition(colX, rowY);
                rowY += (row.displayHeight || 26) + 8;
            }
        });
    }

    layoutCampaignPanel(frame, metrics) {
        const tabs = this.titleCampaignTabs || [];
        const rows = (this.titleCampaignRows || []).filter(
            (row) => row && row.campaignId === this.campaignTab
        );
        for (const tab of tabs) {
            this.ui.applyFontSize(tab, Math.max(11, metrics.fonts.instructions - 1));
        }
        for (const row of rows) {
            this.ui.applyFontSize(row, Math.max(11, metrics.fonts.instructions - 2));
        }
        const pad = 16;
        const tabH = tabs[0]?.displayHeight || 30;
        tabs.forEach((tab, i) => {
            tab.setWordWrapWidth?.(frame.w - pad * 2, true);
            tab.setPosition(frame.centerX, frame.y + 18 + i * (tabH + 6));
        });
        const top = frame.y + 18 + tabs.length * (tabH + 6) + 8;
        const footerH = (this.titlePrompt?.displayHeight || 24) + 26;
        const availH = Math.max(60, frame.bottom - footerH - top);
        const pitch = rows.reduce((most, row) => Math.max(most, row.displayHeight || 24), 0) + 6;
        const columns = newsColumnsFor(rows.length, rows.length * pitch, availH);
        const totalW = frame.w - pad * 2;
        const colW = (totalW - (columns - 1) * 10) / columns;
        for (const row of rows) row.setWordWrapWidth?.(colW, true);
        // One column when it fits; otherwise deal row-major across two so the
        // numbers still read left-to-right (1,2 / 3,4) instead of snaking.
        const lanes =
            columns === 1
                ? [rows]
                : [rows.filter((_, i) => i % 2 === 0), rows.filter((_, i) => i % 2 === 1)];
        lanes.forEach((lane, c) => {
            const colX = columns === 1 ? frame.centerX : frame.x + pad + colW * (c + 0.5) + c * 10;
            let rowY = top;
            for (const row of lane) {
                row.setPosition(colX, rowY);
                rowY += (row.displayHeight || 26) + 6;
            }
        });
        if (this.titlePrompt) {
            this.ui.applyFontSize(this.titlePrompt, metrics.fonts.prompt);
            this.titlePrompt.setPosition(frame.centerX, frame.bottom - 20);
        }
        this.updateCampaignHighlight();
    }

    layoutSettingsPanel(frame, metrics) {
        this.titleSettingsHeader?.setPosition(frame.centerX, frame.y + 26);
        this.settingsNameY = frame.y + 62;
        if (this.ui.playerNameText)
            this.ui.playerNameText.setPosition(frame.centerX, this.settingsNameY);
        if (this.titlePrompt) this.titlePrompt.setPosition(frame.centerX, frame.y + 78);
        this.positionRaceSetupButton(metrics);
        this.positionJumpToggleButton(metrics);
        this.positionDifficultyButton(metrics);
    }

    layoutSecondaryRow(centerX, y, metrics) {
        const btns = [
            this.titleMoreButton,
            this.titleCampaignButton,
            this.titleSettingsButton,
        ].filter(Boolean);
        if (btns.length === 0) {
            return;
        }
        btns.forEach((b) => b.setScale?.(1));
        const widths = btns.map((b) => b.displayWidth || b.width || 110);
        let gap = 18;
        const natural = widths.reduce((a, b) => a + b, 0) + gap * (btns.length - 1);
        const available = Math.max(200, (metrics?.innerWidth || 800) - 16);
        if (natural > available) {
            gap = 8;
            const tight = widths.reduce((a, b) => a + b, 0) + gap * (btns.length - 1);
            const scale = Math.min(1, available / Math.max(1, tight));
            if (scale < 1) {
                btns.forEach((b) => b.setScale?.(Math.max(0.75, scale)));
            }
        }
        const placed = btns.map((b) => b.displayWidth || b.width || 110);
        const total = placed.reduce((a, b) => a + b, 0) + gap * (btns.length - 1);
        let x = centerX - total / 2;
        btns.forEach((b, i) => {
            b.setPosition(x + placed[i] / 2, y);
            x += placed[i] + gap;
        });
    }

    placeTitleCluster(centerX, metrics) {
        const afterHeader = this.layoutTitleHeader(centerX, metrics);
        const panelTop = afterHeader + 8;
        const { w, h } = this.heroSize(metrics);
        const frame = { x: centerX - w / 2, y: panelTop, w, h, centerX, bottom: panelTop + h };
        const view = this.titleView || 'featured';
        if (view === 'featured') {
            frame.bottom = this.layoutHeroCard(centerX, panelTop, metrics).bottom;
        } else {
            this.paintCardFrame(frame.x, frame.y, frame.w, frame.h);
            if (view === 'stories') this.layoutStoriesPanel(frame, metrics);
            if (view === 'campaign') this.layoutCampaignPanel(frame, metrics);
            if (view === 'settings') this.layoutSettingsPanel(frame, metrics);
        }
        if (this.titleBackButton)
            this.titleBackButton.setPosition(frame.x + frame.w - 52, frame.y + 20);
        if (view === 'featured') this.layoutSecondaryRow(centerX, frame.bottom + 30, metrics);
        this.applyTitleView();
    }

    positionRaceSetupButton(metrics) {
        const button = this.raceSetupButton;
        if (!button || !this.titlePrompt) {
            return 0;
        }
        const gapAbove = metrics.isTiny ? 8 : 10;
        const gapBelow = metrics.isTiny ? 8 : 8;
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
            <p id="race-controls">P1: A/D + Space/K, J fires, G swaps. P2: arrows + ↑, numpad 1 fires, numpad 2 swaps.</p>
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

    createJumpToggle() {
        const button = document.createElement('button');
        button.id = 'jump-toggle-button';
        button.className = 'game-button';
        button.type = 'button';
        button.addEventListener('click', () => {
            this.scene.toggleJumpMode();
        });
        document.body.append(button);
        this.jumpToggleButton = button;
        this.setJumpToggleLabel();
    }

    setJumpToggleLabel() {
        const button = this.jumpToggleButton;
        if (!button) {
            return;
        }
        const mode = normalizeJumpMode(this.scene.jumpMode);
        const kicker = document.createElement('span');
        kicker.className = 'jump-toggle-kicker';
        kicker.textContent = 'JUMP STYLE';
        const label = document.createElement('span');
        label.className = 'jump-toggle-mode';
        label.textContent = `Now: ${JUMP_MODE_LABEL[mode]}`;
        button.replaceChildren(kicker, label);
        button.setAttribute(
            'aria-label',
            mode === 'fine'
                ? 'Jump style. Fine control on: release early for short hops. Switch to max jump.'
                : 'Jump style. Max jump on: every jump is full height. Switch to fine control.'
        );
    }

    positionJumpToggleButton(metrics) {
        const button = this.jumpToggleButton;
        if (!button || !this.titlePrompt) {
            return 0;
        }
        button.style.left = '';
        const gapAbove = metrics.isTiny ? 6 : 10;
        const gapBelow = metrics.isTiny ? 6 : 10;
        const race = this.raceSetupButton;
        const raceBottom = race
            ? (parseFloat(race.style.top) || 0) +
              Math.max(race.offsetHeight || 0, metrics.isCompact ? 50 : 68)
            : this.titlePrompt.y + (this.titlePrompt.displayHeight || 0) / 2;
        button.style.top = `${Math.round(raceBottom + gapAbove)}px`;
        const height = Math.max(button.offsetHeight || 0, metrics.isCompact ? 46 : 60);
        return gapAbove + height + gapBelow;
    }

    createDifficulty() {
        const button = document.createElement('button');
        button.id = 'difficulty-button';
        button.className = 'game-button';
        button.type = 'button';
        button.addEventListener('click', () => {
            this.scene.toggleDifficulty();
        });
        document.body.append(button);
        this.difficultyButton = button;
        this.setDifficultyLabel();
    }

    setDifficultyLabel() {
        const button = this.difficultyButton;
        if (!button) {
            return;
        }
        const mode = normalizeDifficulty(this.scene.difficulty);
        const kicker = document.createElement('span');
        kicker.className = 'difficulty-kicker';
        kicker.textContent = 'DIFFICULTY';
        const label = document.createElement('span');
        label.className = 'difficulty-mode';
        label.textContent = `Now: ${DIFFICULTY_LABEL[mode]}`;
        button.replaceChildren(kicker, label);
        button.setAttribute(
            'aria-label',
            mode === 'hard'
                ? 'Difficulty. Hard on: faster hazards, separate records. Switch to normal.'
                : 'Difficulty. Normal on. Switch to hard.'
        );
    }

    positionDifficultyButton(metrics) {
        const button = this.difficultyButton;
        if (!button || !this.titlePrompt) {
            return 0;
        }
        button.style.left = '';
        // Short landscape cannot stack three buttons under the prompt, so
        // difficulty sits beside the jump toggle in one row (already counted
        // by jumpSpace). Everywhere else it stacks below.
        const sideBySide =
            metrics.isCompact &&
            !metrics.isPortrait &&
            metrics.innerWidth >= 640 &&
            this.jumpToggleButton;
        if (sideBySide) {
            this.jumpToggleButton.style.left = 'calc(50% + 150px)';
            button.style.left = 'calc(50% - 150px)';
            button.style.top = this.jumpToggleButton.style.top;
            return 0;
        }
        const gapAbove = metrics.isTiny ? 6 : 10;
        const gapBelow = metrics.isTiny ? 6 : 10;
        const above = this.jumpToggleButton || this.raceSetupButton;
        let aboveBottom = this.titlePrompt.y + (this.titlePrompt.displayHeight || 0) / 2;
        if (above) {
            let minHeight = metrics.isCompact ? 46 : 60;
            if (above === this.raceSetupButton) {
                minHeight = metrics.isCompact ? 50 : 68;
            }
            aboveBottom =
                (parseFloat(above.style.top) || 0) + Math.max(above.offsetHeight || 0, minHeight);
        }
        button.style.top = `${Math.round(aboveBottom + gapAbove)}px`;
        const height = Math.max(button.offsetHeight || 0, metrics.isCompact ? 46 : 60);
        return gapAbove + height + gapBelow;
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
        if (this.handleTitleMenu(menu)) {
            return true;
        }
        return this.handleFinishMenu(menu);
    }

    handleTitleMenu(menu) {
        if (!this.scene.awaitingStart) {
            return false;
        }
        const view = this.titleView || 'featured';
        if (view === 'settings') {
            if (menu.confirm) {
                this.setTitleView('featured');
                return true;
            }
            if (menu.down) {
                this.raceSetupButton?.click();
                return true;
            }
            if (menu.up) {
                this.jumpToggleButton?.click();
                return true;
            }
            if (menu.back) {
                this.difficultyButton?.click();
                return true;
            }
            return false;
        }
        if (menu.back) {
            if (view === 'featured') {
                return false;
            }
            this.setTitleView('featured');
            return true;
        }
        if (view === 'stories') {
            if (menu.up || menu.down) {
                this.cycleHero(menu.down ? 1 : -1);
                return true;
            }
            if (menu.confirm) {
                this.scene.startSelectedNewsRow?.();
                return true;
            }
            return false;
        }
        if (menu.up || menu.down) {
            this.cycleTitleView(menu.down ? 1 : -1);
            return true;
        }
        if (menu.confirm) {
            if (view === 'featured') {
                this.scene.startFeaturedStory?.();
                return true;
            }
            if (view === 'campaign') {
                this.scene.startSelectedLevel?.();
                return true;
            }
        }
        return false;
    }

    cycleTitleView(direction) {
        const order = ['featured', 'stories', 'campaign', 'settings'];
        const current = order.indexOf(this.titleView);
        const next = order[(current + direction + order.length) % order.length] || 'featured';
        this.setTitleView(next);
    }

    updateNewsRowHighlight(activeId = this.featuredNewsId()) {
        (this.titleNewsRows || []).forEach((row, index) => {
            const active = NEWS_LEVEL_IDS[index] === activeId;
            row?.setBackgroundColor?.(active ? '#8c1d18' : '#14283e');
            row?.setStyle?.({ fill: active ? '#ffe566' : '#ffffff' });
        });
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
        this.jumpToggleButton?.remove();
        this.jumpToggleButton = null;
        this.difficultyButton?.remove();
        this.difficultyButton = null;
        this.stopHeroTimer();
        this.titleAtmosphereTween?.stop();
        this.titleEntranceTween?.stop();
        this.titleEntranceTween = null;
        this.titleAtmosphereTween = null;
        this.titleAtmosphere?.destroy();
        this.titleAtmosphere = null;
        this.titleAtmosphereSize = null;
        if (this.titlePromptTween && typeof this.titlePromptTween.stop === 'function') {
            this.titlePromptTween.stop();
        }
        this.titlePromptTween = null;
        if (this.titleChickenTween?.stop) this.titleChickenTween.stop();
        this.titleChickenTween = null;
        if (this.titleStageChickenTween?.stop) this.titleStageChickenTween.stop();
        this.titleStageChickenTween = null;
        if (this.titleStageEnemyTween?.stop) this.titleStageEnemyTween.stop();
        this.titleStageEnemyTween = null;
        if (this.titleGlowTween?.stop) this.titleGlowTween.stop();
        this.titleGlowTween = null;
        if (this.titlePlayTween?.stop) this.titlePlayTween.stop();
        this.titlePlayTween = null;
        [
            this.titleDim,
            this.titleBackdrop,
            this.titleTickerBg,
            this.titleTickerText,
            this.titleTickerLive,
            this.titleText,
            this.titleShadow,
            this.titleGlow,
            this.titleTagline,
            this.titleCrown,
            this.titleChicken,
            this.titleHeroBg,
            this.titleHeroThumb,
            this.titleHeroKicker,
            this.titleHeroOutlet,
            this.titleHeroHeadline,
            this.titleHeroLevel,
            this.titleHeroMechanic,
            this.titleHeroPlay,
            this.titleHeroPrev,
            this.titleHeroNext,
            this.titleHeroCounter,
            this.titleMoreButton,
            this.titleCampaignButton,
            this.titleSettingsButton,
            this.titleBackButton,
            this.titleSettingsHeader,
            this.titleStageChicken,
            this.titleStageEnemy,
            this.titleStageCrown,
            this.titleSubtitle,
            this.titlePrompt,
            this.titleControls,
            this.titleGamepadStatus,
            this.titleNewsHeader,
            ...(this.titleNewsRows || []),
            ...(this.titleCampaignTabs || []),
            ...(this.titleCampaignRows || []),
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
        this.titleBackdrop = null;
        this.titleTickerBg = null;
        this.titleTickerText = null;
        this.titleTickerLive = null;
        this.titleText = null;
        this.titleShadow = null;
        this.titleGlow = null;
        this.titleTagline = null;
        this.titleCrown = null;
        this.titleChicken = null;
        this.titleHeroBg = null;
        this.titleHeroThumb = null;
        this.titleHeroKicker = null;
        this.titleHeroOutlet = null;
        this.titleHeroHeadline = null;
        this.titleHeroLevel = null;
        this.titleHeroMechanic = null;
        this.titleHeroPlay = null;
        this.titleHeroPrev = null;
        this.titleHeroNext = null;
        this.titleHeroCounter = null;
        this.titleHeroSourceUrl = null;
        this.titleMoreButton = null;
        this.titleCampaignButton = null;
        this.titleSettingsButton = null;
        this.titleBackButton = null;
        this.titleSettingsHeader = null;
        this.titleStageChicken = null;
        this.titleStageEnemy = null;
        this.titleStageCrown = null;
        this.titleView = 'featured';
        this.titleSubtitle = null;
        this.titlePrompt = null;
        this.titleControls = null;
        this.titleGamepadStatus = null;
        this.titleNewsHeader = null;
        this.titleNewsRows = [];
        this.titleCampaignTabs = [];
        this.titleCampaignRows = [];
        if (!this.ui.destroyed && this.ui.playerNameText) {
            this.ui.playerNameText.setVisible(true);
            this.ui.playerNameText.setOrigin(1, 0.5);
            this.ui.playerNameText.setPadding(0);
            this.ui.playerNameText.setBackgroundColor();
            this.ui.playerNameText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
            this.ui.updatePlayerName(this.ui.playerName);
        }
        if (!this.ui.destroyed) {
            this.ui.setHudVisible(true);
            if (this.ui.touchControlsEnabled && !this.scene.player2Camera)
                this.ui.setTouchControlsVisible?.(true);
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
