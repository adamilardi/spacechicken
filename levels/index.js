import { level as dawnRun } from './dawn-run.js';
import { level as arcadeOrbit } from './arcade-orbit.js';
import { level as orbitalGauntlet } from './orbital-gauntlet.js';
import { level as moonfallCitadel } from './moonfall-citadel.js';
import { level as specimenWing } from './specimen-wing.js';
import { level as redReach } from './red-reach.js';
import { level as earthwatch } from './earthwatch.js';
import { level as colonyDrop } from './colony-drop.js';
import { level as hiveWarrens } from './hive-warrens.js';
import { level as spireCrown } from './spire-crown.js';
import { level as bastionRelay } from './bastion-relay.js';
import { level as crimsonWomb } from './crimson-womb.js';
import { level as rustHarbor } from './rust-harbor.js';
import { level as emberFoundry } from './ember-foundry.js';
import { level as skyhookAnchor } from './skyhook-anchor.js';
import { level as ironVault } from './iron-vault.js';
import { level as tickerPlunge } from './ticker-plunge.js';
import { level as fearSpike } from './fear-spike.js';
import { level as hubbleRescue } from './hubble-rescue.js';
import { level as robotDanceSync } from './robot-dance-sync.js';
import { level as phobosSampleRun } from './phobos-sample-run.js';
import { level as boosterHomecoming } from './booster-homecoming.js';
import { level as reconnection } from './reconnection.js';
import { level as clutchCrown } from './clutch-crown.js';

const LEVELS = [
    dawnRun,
    arcadeOrbit,
    orbitalGauntlet,
    moonfallCitadel,
    specimenWing,
    redReach,
    earthwatch,
    colonyDrop,
    hiveWarrens,
    spireCrown,
    bastionRelay,
    crimsonWomb,
    rustHarbor,
    emberFoundry,
    skyhookAnchor,
    ironVault,
    tickerPlunge,
    fearSpike,
    hubbleRescue,
    robotDanceSync,
    phobosSampleRun,
    boosterHomecoming,
    reconnection,
    clutchCrown,
].sort((left, right) => left.id - right.id);

export const LEVEL_DEFINITIONS = Object.fromEntries(
    LEVELS.map((entry) => [entry.id, entry.definition])
);

export const LEVEL_CONTENT = Object.fromEntries(LEVELS.map((entry) => [entry.id, entry.content]));

export const LEVEL_IDS = Object.freeze(LEVELS.map((entry) => entry.id));

// News levels (content.news set) live outside the campaign chain and get their
// own section on the title screen, always playable regardless of unlocks.
export const NEWS_LEVEL_IDS = Object.freeze(
    LEVELS.filter((entry) => entry.content && entry.content.news).map((entry) => entry.id)
);

// The campaign section shows two named campaigns: the platformer voyage
// (1-7, ending as the chicken earns its phaser) and the contra assault
// (8-16, phaser run-and-gun including the Iron Vault branch off 12).
export const CAMPAIGNS = Object.freeze([
    {
        id: 'starlight-voyage',
        name: 'Starlight Voyage',
        levels: Object.freeze([1, 2, 3, 4, 5, 6, 7]),
    },
    {
        id: 'iron-front',
        name: 'Iron Front',
        levels: Object.freeze([8, 9, 10, 11, 12, 13, 14, 15, 16]),
    },
]);

export function campaignForLevel(level) {
    const id = Number(level);
    return CAMPAIGNS.find((campaign) => campaign.levels.includes(id)) || null;
}
