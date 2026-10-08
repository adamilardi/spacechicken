import { buildTrack as buildSolarRun } from './solar-run.js';
import { buildTrack as buildNeonPursuit } from './neon-pursuit.js';
import { buildTrack as buildOrbitalMachinery } from './orbital-machinery.js';
import { buildTrack as buildLunarHorizon } from './lunar-horizon.js';
import { buildTrack as buildSpecimenWing } from './specimen-wing.js';
import { buildTrack as buildRedReach } from './red-reach.js';
import { buildTrack as buildEarthwatch } from './earthwatch.js';
import { buildTrack as buildColonyDrop } from './colony-drop.js';
import { buildTrack as buildHive } from './hive.js';
import { buildTrack as buildSpire } from './spire.js';
import { buildTrack as buildBastion } from './bastion.js';
import { buildTrack as buildWomb } from './womb.js';
import { buildTrack as buildRustHarbor } from './rust-harbor.js';
import { buildTrack as buildEmberFoundry } from './ember-foundry.js';
import { buildTrack as buildSkyhook } from './skyhook.js';
import { buildTrack as buildVault } from './vault.js';
import { midiToFrequency } from './score.js';

export { midiToFrequency };

export const MUSIC_DEFINITIONS = Object.freeze({
    1: buildSolarRun(),
    2: buildNeonPursuit(),
    3: buildOrbitalMachinery(),
    4: buildLunarHorizon(),
    5: buildSpecimenWing(),
    6: buildRedReach(),
    7: buildEarthwatch(),
    8: buildColonyDrop(),
    9: buildHive(),
    10: buildSpire(),
    11: buildBastion(),
    12: buildWomb(),
    13: buildRustHarbor(),
    14: buildEmberFoundry(),
    15: buildSkyhook(),
    16: buildVault(),
});

export function getMusicDefinition(level) {
    return MUSIC_DEFINITIONS[level] || MUSIC_DEFINITIONS[1];
}
