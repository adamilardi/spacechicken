import { valueOrDefault } from '../GameUtils.js';
import { adjustColor, getRangeValue, starsFor } from './paint.js';

function createStationModule(x, y, width, height, palette, options = {}) {
    const padding = Phaser.Math.Between(10, 16);
    const insetWidth = Math.max(32, width - padding * 2);
    const insetHeight = Math.max(32, height - padding * 2);
    const panels = [];
    const windows = [];
    const braces = [];
    const panelRows = getRangeValue(options.panelRows, 2, 4);
    const panelCols = getRangeValue(options.panelCols, 2, 4);
    const gap = 8;
    const panelWidth = Math.max(24, Math.floor((insetWidth - (panelCols - 1) * gap) / panelCols));
    const panelHeight = Math.max(20, Math.floor((insetHeight - (panelRows - 1) * gap) / panelRows));

    for (let row = 0; row < panelRows; row++) {
        for (let col = 0; col < panelCols; col++) {
            const panelX = x + padding + col * (panelWidth + gap);
            const panelY = y + padding + row * (panelHeight + gap);
            panels.push({
                x: panelX,
                y: panelY,
                width: panelWidth,
                height: panelHeight,
                fill: (row + col) % 2 === 0 ? palette.metalAlt : adjustColor(palette.metal, -8),
                alpha: 0.85,
                strokeColor: palette.highlight,
                strokeAlpha: 0.16,
            });
        }
    }

    const windowCount = getRangeValue(options.windowCount, 8, 18);
    for (let i = 0; i < windowCount; i++) {
        const windowWidth = Phaser.Math.Between(8, 18);
        const windowHeight = Phaser.Math.Between(3, 6);
        windows.push({
            x: Phaser.Math.Between(x + 14, x + Math.max(14, width - windowWidth - 14)),
            y: Phaser.Math.Between(y + 14, y + Math.max(14, height - windowHeight - 14)),
            width: windowWidth,
            height: windowHeight,
            color: Phaser.Utils.Array.GetRandom([palette.haze, palette.highlight, palette.accent]),
            alpha: Phaser.Math.FloatBetween(0.55, 0.95),
        });
    }

    braces.push({
        points: [
            { x: x + 8, y: y + height * 0.2 },
            { x: x + width * 0.5, y: y + height * 0.08 },
            { x: x + width - 8, y: y + height * 0.2 },
            { x: x + width - 20, y: y + height * 0.34 },
            { x: x + 20, y: y + height * 0.34 },
        ],
        fill: palette.shadow,
        alpha: 0.4,
        stroke: { width: 1, color: palette.highlight, alpha: 0.12 },
    });

    const antennaHeight = getRangeValue(options.antennaHeight, 20, 56);
    return {
        x,
        y,
        width,
        height,
        fill: palette.metal,
        insetFill: adjustColor(palette.metalAlt, -6),
        strokeColor: palette.highlight,
        edgeAlpha: 0.72,
        alpha: 0.92,
        panels,
        windows,
        braces,
        antenna: {
            x: x + width - Phaser.Math.Between(18, 30),
            baseY: y,
            tipY: y - antennaHeight,
            color: palette.highlight,
            alpha: 0.7,
            beaconColor: palette.accent,
            beaconAlpha: 0.85,
        },
    };
}

// eslint-disable-next-line max-lines-per-function
export function createStationBackgroundLayout(background, worldWidth, worldHeight) {
    const palette = Object.assign(
        {
            haze: 0x86f0ff,
            glow: 0xffc87c,
            metal: 0x18253a,
            metalAlt: 0x243657,
            highlight: 0x9de4ff,
            accent: 0xff9642,
            shadow: 0x09111d,
        },
        background.palette || {}
    );
    const stars = [];
    const starCount = valueOrDefault(background.starCount, 80);
    const ribbonCount = valueOrDefault(background.ribbonCount, 2);
    const nebulaCount = valueOrDefault(background.nebulaCount, 3);
    const frameCount = valueOrDefault(background.frameCount, 2);
    const moduleStride = valueOrDefault(background.moduleStride, 260);
    const catwalkStep = valueOrDefault(background.catwalkStep, 220);
    const deckLightStep = valueOrDefault(background.deckLightStep, 130);
    const beaconChance = valueOrDefault(background.moduleBeaconChance, 0.5);
    const starColors = [0xffffff, palette.haze, palette.highlight];
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Phaser.Math.Between(0, worldWidth),
            y: Phaser.Math.Between(0, Math.round(worldHeight * 0.7)),
            size: Phaser.Math.Between(1, 2),
            color: Phaser.Utils.Array.GetRandom(starColors),
            alpha: Phaser.Math.FloatBetween(0.35, 0.95),
            flare: Phaser.Math.Between(0, 12) === 0 ? Phaser.Math.Between(2, 4) : 0,
        });
    }

    const ribbons = [];
    for (let i = 0; i < ribbonCount; i++) {
        const startY = Phaser.Math.Between(30, Math.round(worldHeight * 0.42));
        const thickness = Phaser.Math.Between(50, 120);
        const endY = startY + Phaser.Math.Between(-80, 80);
        ribbons.push({
            points: [
                { x: -120, y: startY },
                { x: worldWidth + 120, y: endY },
                { x: worldWidth + 120, y: endY + thickness },
                { x: -120, y: startY + thickness },
            ],
            fill: Phaser.Utils.Array.GetRandom([palette.haze, palette.highlight, palette.accent]),
            alpha: Phaser.Math.FloatBetween(0.04, 0.09),
        });
    }

    const nebulas = [];
    for (let i = 0; i < nebulaCount; i++) {
        nebulas.push({
            x: Phaser.Math.Between(0, worldWidth),
            y: Phaser.Math.Between(50, Math.round(worldHeight * 0.45)),
            radius: Phaser.Math.Between(120, 260),
            color: Phaser.Utils.Array.GetRandom([palette.haze, palette.highlight]),
            alpha: Phaser.Math.FloatBetween(0.04, 0.1),
        });
    }

    const frameTemplates = [
        {
            x: Math.round(worldWidth * 0.26),
            y: Math.round(worldHeight * 0.22),
            width: 300,
            height: 128,
            color: palette.highlight,
            alpha: 0.18,
            lineWidth: 2,
        },
        {
            x: Math.round(worldWidth * 0.76),
            y: Math.round(worldHeight * 0.18),
            width: 420,
            height: 164,
            color: palette.haze,
            alpha: 0.12,
            lineWidth: 3,
        },
    ];
    const frames = frameTemplates.slice(0, Math.max(0, frameCount));

    const modules = [];
    const beacons = [];
    const moduleCount = Math.ceil(worldWidth / moduleStride) + 1;
    for (let i = 0; i < moduleCount; i++) {
        const width = Phaser.Math.Between(180, 260);
        const height = Phaser.Math.Between(140, 220);
        const x = i * moduleStride + Phaser.Math.Between(-20, 40);
        const y = Phaser.Math.Between(80, Math.max(120, worldHeight - height - 160));
        const module = createStationModule(
            x,
            y,
            width,
            height,
            palette,
            background.moduleDetail || {}
        );
        modules.push(module);
        if (module.antenna && Math.random() < beaconChance) {
            beacons.push({
                x: module.antenna.x,
                y: module.antenna.tipY,
                radius: 2,
                color: palette.accent,
                alpha: 0.82,
            });
        }
    }

    const catwalks = [];
    const struts = [];
    for (let x = -40; x < worldWidth + 40; x += catwalkStep) {
        const width = Phaser.Math.Between(120, 240);
        const y = Phaser.Math.Between(
            Math.round(worldHeight * 0.58),
            Math.round(worldHeight * 0.76)
        );
        const lights = [];
        const catwalkLightStep = valueOrDefault(background.catwalkLightStep, 28);
        for (let lightX = x + 18; lightX < x + width - 18; lightX += catwalkLightStep) {
            lights.push({
                x: lightX,
                y: y + 7,
                width: 12,
                height: 3,
                color: Phaser.Utils.Array.GetRandom([palette.haze, palette.accent]),
                alpha: Phaser.Math.FloatBetween(0.55, 0.9),
            });
        }
        catwalks.push({
            x,
            y,
            width,
            height: 18,
            fill: palette.metalAlt,
            strokeColor: palette.highlight,
            alpha: 0.8,
            lights,
        });

        const supportHeight = Phaser.Math.Between(60, 140);
        struts.push({
            points: [
                { x: x + 22, y: y + 18 },
                { x: x + 10, y: y + 18 + supportHeight },
                { x: x + 34, y: y + 18 + supportHeight },
                { x: x + 44, y: y + 18 },
            ],
            fill: palette.shadow,
            alpha: 0.42,
            stroke: { width: 1, color: palette.highlight, alpha: 0.08 },
        });
        struts.push({
            points: [
                { x: x + width - 22, y: y + 18 },
                { x: x + width - 34, y: y + 18 + supportHeight },
                { x: x + width - 10, y: y + 18 + supportHeight },
                { x: x + width, y: y + 18 },
            ],
            fill: palette.shadow,
            alpha: 0.42,
            stroke: { width: 1, color: palette.highlight, alpha: 0.08 },
        });
    }

    const floorBands = [
        {
            points: [
                { x: -100, y: worldHeight },
                { x: -100, y: Math.round(worldHeight * 0.84) },
                { x: Math.round(worldWidth * 0.3), y: Math.round(worldHeight * 0.77) },
                { x: Math.round(worldWidth * 0.68), y: Math.round(worldHeight * 0.8) },
                { x: worldWidth + 100, y: Math.round(worldHeight * 0.78) },
                { x: worldWidth + 100, y: worldHeight },
            ],
            fill: palette.shadow,
            alpha: 0.94,
        },
        {
            points: [
                { x: -100, y: worldHeight },
                { x: -100, y: Math.round(worldHeight * 0.91) },
                { x: Math.round(worldWidth * 0.42), y: Math.round(worldHeight * 0.87) },
                { x: worldWidth + 100, y: Math.round(worldHeight * 0.89) },
                { x: worldWidth + 100, y: worldHeight },
            ],
            fill: palette.metal,
            alpha: 0.76,
            stroke: { width: 2, color: palette.highlight, alpha: 0.08 },
        },
    ];

    const deckLights = [];
    for (let x = -20; x < worldWidth + 40; x += deckLightStep) {
        deckLights.push({
            x,
            y: Math.round(worldHeight * 0.9),
            width: 42,
            height: 4,
            color: Phaser.Utils.Array.GetRandom([palette.haze, palette.accent, palette.highlight]),
            alpha: Phaser.Math.FloatBetween(0.55, 0.9),
        });
    }

    const planets = background.disablePlanet
        ? []
        : [
              {
                  x: worldWidth - 190,
                  y: 150,
                  color: 0x1d4f76,
                  size: Math.round(worldHeight * 0.12),
                  alpha: 0.92,
                  glowColor: palette.haze,
                  atmosphereColor: palette.haze,
                  shadowColor: 0x0a1a2e,
                  highlightColor: 0x5db5ff,
              },
              {
                  x: worldWidth - 78,
                  y: 102,
                  color: 0x67789f,
                  size: 24,
                  alpha: 0.84,
                  glowColor: palette.highlight,
                  atmosphereColor: palette.highlight,
                  shadowColor: 0x25334d,
                  highlightColor: 0xbfd4ff,
              },
          ];

    return {
        stars,
        ribbons,
        nebulas,
        planets,
        frames,
        modules,
        catwalks: background.showCatwalks === false ? [] : catwalks,
        struts: background.showCatwalks === false ? [] : struts,
        floorBands,
        deckLights: background.showDeckLights === false ? [] : deckLights,
        beacons,
    };
}

export function renderStationBackground(
    renderer,
    background,
    layout,
    worldWidth,
    worldHeight,
    layerId
) {
    const palette = Object.assign(
        {
            top: 0x040915,
            mid: 0x102544,
            bottom: 0x1f5d7a,
            haze: 0x86f0ff,
            glow: 0xffc87c,
            metal: 0x18253a,
            metalAlt: 0x243657,
            highlight: 0x9de4ff,
            accent: 0xff9642,
            shadow: 0x09111d,
        },
        background.palette || {}
    );

    if (layerId === 'sky') {
        renderer.renderVerticalGradient(
            0,
            0,
            worldWidth,
            worldHeight,
            [palette.top, palette.mid, palette.bottom],
            52
        );
        renderer.drawGlow(
            worldWidth * 0.68,
            worldHeight * 0.18,
            Math.max(worldWidth * 0.12, 150),
            palette.haze,
            0.05,
            4
        );
        return;
    }

    if (layerId === 'far') {
        renderer.renderAtmosphericRibbons(layout.ribbons);
        (layout.nebulas || []).forEach((nebula) => {
            renderer.drawGlow(nebula.x, nebula.y, nebula.radius, nebula.color, nebula.alpha, 6);
        });
        renderer.renderStars(starsFor(layout, 'far'));
        (layout.frames || []).forEach((frame) => {
            renderer.graphics.lineStyle(frame.lineWidth, frame.color, frame.alpha);
            renderer.graphics.strokeEllipse(frame.x, frame.y, frame.width, frame.height);
        });
        return;
    }

    if (layerId === 'mid') {
        renderer.renderStars(starsFor(layout, 'mid'));
        renderer.renderPlanets(layout.planets);
        return;
    }

    if (layerId !== 'near') {
        return;
    }

    (layout.modules || []).forEach((module) => {
        renderer.graphics.fillStyle(module.fill, valueOrDefault(module.alpha, 1));
        renderer.graphics.fillRect(module.x, module.y, module.width, module.height);
        renderer.graphics.fillStyle(module.insetFill, 0.95);
        renderer.graphics.fillRect(
            module.x + 6,
            module.y + 6,
            Math.max(8, module.width - 12),
            Math.max(8, module.height - 12)
        );
        renderer.graphics.lineStyle(2, module.strokeColor, valueOrDefault(module.edgeAlpha, 0.75));
        renderer.graphics.strokeRect(module.x, module.y, module.width, module.height);

        (module.braces || []).forEach((brace) => {
            renderer.renderPolygon(brace.points, brace.fill, brace.alpha, brace.stroke);
        });

        (module.panels || []).forEach((panel) => {
            renderer.graphics.fillStyle(panel.fill, valueOrDefault(panel.alpha, 1));
            renderer.graphics.fillRect(panel.x, panel.y, panel.width, panel.height);
            if (panel.strokeColor) {
                renderer.graphics.lineStyle(
                    1,
                    panel.strokeColor,
                    valueOrDefault(panel.strokeAlpha, 0.4)
                );
                renderer.graphics.strokeRect(panel.x, panel.y, panel.width, panel.height);
            }
        });

        (module.windows || []).forEach((windowPanel) => {
            renderer.graphics.fillStyle(windowPanel.color, valueOrDefault(windowPanel.alpha, 1));
            renderer.graphics.fillRect(
                windowPanel.x,
                windowPanel.y,
                windowPanel.width,
                windowPanel.height
            );
            renderer.drawGlow(
                windowPanel.x + windowPanel.width * 0.5,
                windowPanel.y + windowPanel.height * 0.5,
                Math.max(windowPanel.width, windowPanel.height) * 1.8,
                windowPanel.color,
                windowPanel.alpha * 0.18,
                3
            );
        });

        if (module.antenna) {
            renderer.graphics.lineStyle(2, module.antenna.color, module.antenna.alpha);
            renderer.graphics.beginPath();
            renderer.graphics.moveTo(module.antenna.x, module.antenna.baseY);
            renderer.graphics.lineTo(module.antenna.x, module.antenna.tipY);
            renderer.graphics.strokePath();
            renderer.drawGlow(
                module.antenna.x,
                module.antenna.tipY,
                16,
                module.antenna.beaconColor,
                module.antenna.beaconAlpha * 0.18,
                3
            );
            renderer.graphics.fillStyle(module.antenna.beaconColor, module.antenna.beaconAlpha);
            renderer.graphics.fillCircle(module.antenna.x, module.antenna.tipY, 2);
        }
    });

    (layout.catwalks || []).forEach((catwalk) => {
        renderer.graphics
            .fillStyle(catwalk.fill, catwalk.alpha)
            .fillRect(catwalk.x, catwalk.y, catwalk.width, catwalk.height);
        renderer.graphics
            .lineStyle(2, catwalk.strokeColor, 0.55)
            .strokeRect(catwalk.x, catwalk.y, catwalk.width, catwalk.height);
        (catwalk.lights || []).forEach((light) => {
            renderer.graphics
                .fillStyle(light.color, light.alpha)
                .fillRect(light.x, light.y, light.width, light.height);
        });
    });

    (layout.struts || []).forEach((strut) => {
        renderer.renderPolygon(strut.points, strut.fill, strut.alpha, strut.stroke);
    });

    (layout.floorBands || []).forEach((band) => {
        renderer.renderPolygon(band.points, band.fill, band.alpha, band.stroke);
    });

    (layout.deckLights || []).forEach((light) => {
        renderer.drawGlow(
            light.x + light.width * 0.5,
            light.y + light.height * 0.5,
            light.width * 1.6,
            light.color,
            light.alpha * 0.18,
            3
        );
        renderer.graphics
            .fillStyle(light.color, light.alpha)
            .fillRect(light.x, light.y, light.width, light.height);
    });

    (layout.beacons || []).forEach((beacon) => {
        renderer.drawGlow(
            beacon.x,
            beacon.y,
            beacon.radius * 4,
            beacon.color,
            beacon.alpha * 0.2,
            4
        );
        renderer.graphics
            .fillStyle(beacon.color, beacon.alpha)
            .fillCircle(beacon.x, beacon.y, beacon.radius);
    });

    renderer.renderScanlines(
        worldWidth,
        worldHeight,
        palette.highlight,
        Math.min(valueOrDefault(background.scanlineAlpha, 0), 0.008),
        6,
        1
    );
}
