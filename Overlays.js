import { GAME_CONSTANTS } from './Constants.js';
import { LEVEL_CONTENT, LEVEL_DEFINITIONS, LEVEL_IDS, NEWS_LEVEL_IDS } from './levels/index.js';
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

export function mechanicSnippet(id) {
    const raw = LEVEL_CONTENT[id]?.instructions || '';
    const dash = raw.indexOf(' - ');
    const body = (dash >= 0 ? raw.slice(dash + 3) : raw).replace(/\s+/g, ' ').trim();
    const dot = body.indexOf('. ');
    const first = dot > 0 ? body.slice(0, dot + 1) : body;
    return first.length > 148 ? `${first.slice(0, 145)}…` : first;
}

export function tickerLine() {
    return NEWS_LEVEL_IDS.map((id) => {
        const headline = LEVEL_CONTENT[id]?.news?.headline || '';
        const title = LEVEL_DEFINITIONS[id]?.TITLE || `Level ${id}`;
        return headline ? `${title.toUpperCase()} — ${headline}` : title.toUpperCase();
    }).join('   •   BREAKING   •   ');
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

export function heroDots(index, total) {
    return Array.from({ length: total }, (_, i) => (i === index ? '●' : '○')).join(' ');
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
        this.titleBackdrop = null;
        this.titleTickerBg = null;
        this.titleTickerText = null;
        this.titleTickerLive = null;
        this.titleTickerTween = null;
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
        this.titleHeroLive = null;
        this.titleHeroKicker = null;
        this.titleHeroOutlet = null;
        this.titleHeroHeadline = null;
        this.titleHeroArrow = null;
        this.titleHeroLevel = null;
        this.titleHeroMechanic = null;
        this.titleHeroPlay = null;
        this.titleHeroPrev = null;
        this.titleHeroNext = null;
        this.titleHeroDots = null;
        this.titleHeroCounter = null;
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
                fontFamily: BANNER_FONT,
                fill: '#fff6c9',
                fontStyle: 'bold',
                align: 'center',
            })
            .setOrigin(0.5);
        this.titleText.setScrollFactor(0);
        this.titleText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.ui.styleHudText(this.titleText, 8);
        this.ui.markUi(this.titleText);
        this.titleTagline = this.scene.add
            .text(0, 0, "Don't just read the news. Play it.", {
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
        let prompt = this.ui.touchControlsEnabled
            ? 'TAP TO START CAMPAIGN'
            : 'PRESS SPACE TO START CAMPAIGN';
        if (canSelect) {
            prompt = this.ui.touchControlsEnabled
                ? 'TAP ◀ ▶ · TAP TO START CAMPAIGN'
                : '← → SELECT · SPACE STARTS CAMPAIGN';
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
        if (this.scene.tweens && typeof this.scene.tweens.add === 'function') {
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
                    duration: 1100,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }
            if (this.titleGlow) {
                this.titleGlowTween = this.scene.tweens.add({
                    targets: this.titleGlow,
                    alpha: { from: 0.22, to: 0.42 },
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
        this.titleHeroBg = mk(GAME_CONSTANTS.OVERLAY_DEPTH);
    }

    createTitleTicker(metrics) {
        if (typeof this.scene.add.text !== 'function') return;
        const size = Math.max(12, metrics.fonts.instructions - 1);
        this.titleTickerLive = this.scene.add
            .text(0, 0, '● LIVE', {
                fontSize: `${size}px`,
                fontFamily: HUD_FONT,
                fill: '#ffffff',
                fontStyle: 'bold',
                align: 'center',
            })
            .setOrigin(0, 0.5);
        this.titleTickerLive.setScrollFactor(0);
        this.titleTickerLive.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.titleTickerLive.setPadding(10, 5, 10, 5);
        this.titleTickerLive.setBackgroundColor('#e10600');
        this.ui.styleHudText(this.titleTickerLive, 2);
        this.ui.markUi(this.titleTickerLive);
        this.titleTickerText = this.scene.add
            .text(0, 0, tickerLine(), {
                fontSize: `${size}px`,
                fontFamily: HUD_FONT,
                fill: '#ffffff',
                fontStyle: 'bold',
            })
            .setOrigin(0, 0.5);
        this.titleTickerText.setScrollFactor(0);
        this.titleTickerText.setDepth(GAME_CONSTANTS.OVERLAY_DEPTH);
        this.ui.styleHudText(this.titleTickerText, 2);
        this.ui.markUi(this.titleTickerText);
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
            this.titleChicken = this.scene.add.image(0, 0, 'chicken1');
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
                    fontFamily: BANNER_FONT,
                    fill: '#e10600',
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
        if (this.scene.tweens?.add) {
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
        if (this.titleHeroDots) this.titleHeroDots.setVisible(false);
        if (this.titleHeroArrow) this.titleHeroArrow.setVisible(false);
        if (this.titleHeroLive) this.titleHeroLive.setVisible(false);
        show(this.titleMoreButton, view === 'featured');
        show(this.titleCampaignButton, view === 'featured');
        show(this.titleSettingsButton, view === 'featured');
        show(this.titleBackButton, view !== 'featured');
        show(this.titleSettingsHeader, view === 'settings');
        show(this.titleNewsHeader, view === 'stories');
        for (const row of this.titleNewsRows || []) show(row, view === 'stories');
        show(this.titleSubtitle, view === 'campaign');
        show(this.selectPrevButton, view === 'campaign');
        show(this.selectNextButton, view === 'campaign');
        show(this.titlePrompt, view === 'campaign');
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
        this.titleHeroKicker = mk('FEATURED STORY', Math.max(11, ins - 2), '#8ce4ff', true);
        this.titleHeroCounter = mk('', Math.max(11, ins - 2), '#8ce4ff', true);
        this.titleHeroCounter.setOrigin(1, 0);
        this.titleHeroOutlet = mk('', Math.max(12, ins - 1), '#9fb3c8');
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
            .text(0, 0, '▶  PLAY THIS STORY', {
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
        this.titleHeroDots = mk('', Math.max(12, ins), '#ffe566', true);
        this.titleHeroDots.setOrigin(0.5, 0.5);
    }

    featuredNewsId() {
        return NEWS_LEVEL_IDS[this.titleHeroIndex] || NEWS_LEVEL_IDS[0];
    }

    updateHero(animate = true) {
        const id = this.featuredNewsId();
        if (!id || !this.titleHeroHeadline) return;
        const title = LEVEL_DEFINITIONS[id]?.TITLE || `Level ${id}`;
        const news = LEVEL_CONTENT[id]?.news || {};
        const outlet = news.outlet || 'News wire';
        if (this.titleHeroOutlet) this.titleHeroOutlet.setText(`Source: ${outlet}`);
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
        if (this.titleHeroDots)
            this.titleHeroDots.setText(heroDots(this.titleHeroIndex, NEWS_LEVEL_IDS.length));
        this.updateStageVisibility();
        (this.titleNewsRows || []).forEach((row, i) => {
            const active = NEWS_LEVEL_IDS[i] === id;
            row.setBackgroundColor(active ? '#8c1d18' : '#14283e');
            row.setStyle({ fill: active ? '#ffe566' : '#ffffff' });
        });
        if (animate && this.scene.tweens?.add && this.titleHeroHeadline) {
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

    startTickerTween() {
        if (!this.titleTickerText || !this.scene.tweens?.add) return;
        if (this.titleTickerTween?.stop) this.titleTickerTween.stop();
        const w = this.scene.getViewportWidth?.() || 800;
        const tw = this.titleTickerText.width || 1200;
        this.titleTickerText.setX(w + 90);
        try {
            this.titleTickerTween = this.scene.tweens.add({
                targets: this.titleTickerText,
                x: -tw - 20,
                duration: Math.max(14000, (w + tw) * 9),
                repeat: -1,
                ease: 'Linear',
                onRepeat: () => this.titleTickerText.setX(w + 90),
            });
        } catch {
            this.titleTickerTween = null;
        }
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
            g.fillStyle(0xffc93c, 0.05);
            g.fillCircle(metrics.width / 2, insets.top + 120, 210);
            g.fillStyle(0xe10600, 0.045);
            g.fillCircle(metrics.width / 2, insets.top + 120, 300);
            g.fillStyle(0xe10600, 1);
            g.fillRect(0, insets.top, metrics.width, 3);
        }
    }

    layoutTitleChicken(centerX, metrics) {
        if (!this.titleChicken) return;
        const tw = this.titleText.displayWidth || 320;
        const shortLandscape = metrics.isCompact && !metrics.isPortrait;
        const wide = metrics.innerWidth >= 700 && !metrics.isPortrait;
        const portrait = metrics.isPortrait && metrics.innerWidth >= 340;
        const show = !shortLandscape && (wide || portrait);
        this.titleChicken.setVisible(show);
        if (wide) {
            this.titleChicken.setPosition(centerX + tw / 2 + 58, this.titleText.y + 2);
            this.titleChicken.setScale(metrics.isCompact ? 2.2 : 3.0);
        } else if (portrait) {
            this.titleChicken.setPosition(centerX + tw / 2 + 22, this.titleText.y + 2);
            this.titleChicken.setScale(1.7);
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
        let y = insets.top + (shortLandscape ? 8 : 14);
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
            this.ui.applyFontSize(this.titleShadow, metrics.fonts.title);
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
        const w = Math.max(300, Math.min(metrics.innerWidth - 24, metrics.isPortrait ? 680 : 780));
        // Short landscape keeps a compact-but-real hero: tall enough for the
        // preview thumb beside the headline/mechanic plus the play row, and
        // clamped so the card + secondary row still fit the inner height.
        let h = shortLandscape
            ? Math.max(176, Math.min(216, metrics.innerHeight - 168))
            : metrics.isTiny
              ? 272
              : metrics.isCompact
                ? 306
                : 322;
        if (metrics.isPortrait && metrics.innerWidth < 600) h = 300;
        return { w, h, shortLandscape };
    }

    paintCardFrame(heroX, heroTop, heroW, heroH) {
        const g = this.titleHeroBg;
        if (!g?.clear) return;
        g.clear();
        g.fillStyle(0x0b1628, 0.97);
        if (typeof g.fillRoundedRect === 'function')
            g.fillRoundedRect(heroX, heroTop, heroW, heroH, 16);
        else g.fillRect(heroX, heroTop, heroW, heroH);
        g.fillStyle(0xe10600, 1);
        if (typeof g.fillRoundedRect === 'function')
            g.fillRoundedRect(heroX, heroTop, heroW, 7, { tl: 16, tr: 16, bl: 0, br: 0 });
        else g.fillRect(heroX, heroTop, heroW, 7);
        g.lineStyle(1, 0x3d5478, 0.9);
        if (typeof g.strokeRoundedRect === 'function')
            g.strokeRoundedRect(heroX, heroTop, heroW, heroH, 16);
        else g.strokeRect(heroX, heroTop, heroW, heroH);
    }

    layoutStage(heroX, stageY, stageW, stageH, pad, compact = false) {
        const floorY = stageY + stageH - 6;
        if (this.titleHeroThumb) {
            this.titleHeroThumb.setPosition(heroX + pad, stageY);
            this.titleHeroThumb.setDisplaySize(stageW, stageH);
            this.titleHeroThumb.setAlpha(0.9);
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
            const stageH = metrics.isCompact ? 88 : 108;
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
        const btnY = heroTop + heroH - 24;
        this.titleHeroPlay?.setPosition(textX, btnY);
        this.titleHeroNext?.setPosition(heroX + heroW - pad - 18, btnY);
        this.titleHeroPrev?.setPosition(heroX + heroW - pad - 62, btnY);
        return { bottom: heroTop + heroH, heroX, heroW };
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
        const perCol = Math.ceil(rows.length / columns);
        for (let c = 0; c < columns; c++) {
            const colX = frame.x + pad + colW * (c + 0.5) + c * 10;
            let rowY = top;
            for (const row of rows.slice(c * perCol, (c + 1) * perCol)) {
                row.setPosition(colX, rowY);
                rowY += (row.displayHeight || 26) + 8;
            }
        }
    }

    layoutCampaignPanel(frame, metrics) {
        const cy = frame.y + frame.h * 0.32;
        if (this.titleSubtitle) this.titleSubtitle.setPosition(frame.centerX, cy);
        if (this.selectPrevButton && this.selectNextButton && this.titleSubtitle) {
            const half =
                (this.titleSubtitle.displayWidth || this.titleSubtitle.width || 200) / 2 + 56;
            this.selectPrevButton.setPosition(frame.centerX - half, this.titleSubtitle.y);
            this.selectNextButton.setPosition(frame.centerX + half, this.titleSubtitle.y);
        }
        if (this.titlePrompt) this.titlePrompt.setPosition(frame.centerX, cy + 72);
        void metrics;
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

    layoutSecondaryRow(centerX, y) {
        const btns = [
            this.titleMoreButton,
            this.titleCampaignButton,
            this.titleSettingsButton,
        ].filter(Boolean);
        const widths = btns.map((b) => b.displayWidth || b.width || 110);
        const gap = 18;
        const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, btns.length - 1);
        let x = centerX - total / 2;
        btns.forEach((b, i) => {
            b.setPosition(x + widths[i] / 2, y);
            x += widths[i] + gap;
        });
    }

    placeTitleCluster(centerX, metrics) {
        const afterHeader = this.layoutTitleHeader(centerX, metrics);
        const panelTop = afterHeader + 8;
        const { w, h } = this.heroSize(metrics);
        const frame = { x: centerX - w / 2, y: panelTop, w, h, centerX, bottom: panelTop + h };
        const view = this.titleView || 'featured';
        if (view === 'featured') {
            this.layoutHeroCard(centerX, panelTop, metrics);
        } else {
            this.paintCardFrame(frame.x, frame.y, frame.w, frame.h);
            if (view === 'stories') this.layoutStoriesPanel(frame, metrics);
            if (view === 'campaign') this.layoutCampaignPanel(frame, metrics);
            if (view === 'settings') this.layoutSettingsPanel(frame, metrics);
        }
        if (this.titleBackButton)
            this.titleBackButton.setPosition(frame.x + frame.w - 52, frame.y + 20);
        if (view === 'featured') this.layoutSecondaryRow(centerX, frame.bottom + 22);
        this.applyTitleView();
    }

    titleModeLift(metrics) {
        if (!this.raceSetupButton) {
            return 0;
        }
        let lift = 0;
        if (!metrics.isCompact) {
            lift = 96;
        } else if (metrics.isPortrait) {
            lift = 22;
        }
        if (this.jumpToggleButton) {
            if (!metrics.isCompact) {
                lift += 64;
            } else if (metrics.isPortrait) {
                lift += 40;
            }
        }
        if (this.difficultyButton) {
            if (!metrics.isCompact) {
                lift += 16;
            } else if (metrics.isPortrait) {
                lift += 20;
            }
        }
        return lift;
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
        // Wide desktop: one row of mode buttons so the news wall fits.
        if (
            metrics.innerWidth >= 1000 &&
            this.titleView !== 'settings' &&
            this.raceSetupButton?.style.top
        ) {
            button.style.left = 'calc(50% - 322px)';
            button.style.top = this.raceSetupButton.style.top;
            return 0;
        }
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
        if (
            metrics.innerWidth >= 1000 &&
            this.titleView !== 'settings' &&
            this.raceSetupButton?.style.top
        ) {
            button.style.left = 'calc(50% + 322px)';
            button.style.top = this.raceSetupButton.style.top;
            return 0;
        }
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
        if (view !== 'settings') {
            if (menu.back && view !== 'featured') {
                this.setTitleView('featured');
                return true;
            }
            if (menu.confirm && view !== 'featured') {
                this.setTitleView('featured');
                return true;
            }
            return false;
        }
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
        if (this.titlePromptTween && typeof this.titlePromptTween.stop === 'function') {
            this.titlePromptTween.stop();
        }
        this.titlePromptTween = null;
        if (this.titleTickerTween?.stop) this.titleTickerTween.stop();
        this.titleTickerTween = null;
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
            this.titleHeroLive,
            this.titleHeroKicker,
            this.titleHeroOutlet,
            this.titleHeroHeadline,
            this.titleHeroArrow,
            this.titleHeroLevel,
            this.titleHeroMechanic,
            this.titleHeroPlay,
            this.titleHeroPrev,
            this.titleHeroNext,
            this.titleHeroDots,
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
        this.titleHeroLive = null;
        this.titleHeroKicker = null;
        this.titleHeroOutlet = null;
        this.titleHeroHeadline = null;
        this.titleHeroArrow = null;
        this.titleHeroLevel = null;
        this.titleHeroMechanic = null;
        this.titleHeroPlay = null;
        this.titleHeroPrev = null;
        this.titleHeroNext = null;
        this.titleHeroDots = null;
        this.titleHeroCounter = null;
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
