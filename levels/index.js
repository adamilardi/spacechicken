import { level as dawnRun } from './dawn-run.js';
import { level as arcadeOrbit } from './arcade-orbit.js';
import { level as orbitalGauntlet } from './orbital-gauntlet.js';
import { level as moonfallCitadel } from './moonfall-citadel.js';
import { level as specimenWing } from './specimen-wing.js';
import { level as redReach } from './red-reach.js';
import { level as earthwatch } from './earthwatch.js';

const LEVELS = [
    dawnRun,
    arcadeOrbit,
    orbitalGauntlet,
    moonfallCitadel,
    specimenWing,
    redReach,
    earthwatch,
].sort((left, right) => left.id - right.id);

export const LEVEL_DEFINITIONS = Object.fromEntries(
    LEVELS.map((entry) => [entry.id, entry.definition])
);

export const LEVEL_CONTENT = Object.fromEntries(LEVELS.map((entry) => [entry.id, entry.content]));

export const LEVEL_IDS = Object.freeze(LEVELS.map((entry) => entry.id));
