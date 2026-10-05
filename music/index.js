import { buildTrack as buildSolarRun } from './solar-run.js';
import { buildTrack as buildNeonPursuit } from './neon-pursuit.js';
import { buildTrack as buildOrbitalMachinery } from './orbital-machinery.js';
import { buildTrack as buildLunarHorizon } from './lunar-horizon.js';
import { buildTrack as buildSpecimenWing } from './specimen-wing.js';
import { buildTrack as buildRedReach } from './red-reach.js';
import { buildTrack as buildEarthwatch } from './earthwatch.js';
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
});

export function getMusicDefinition(level) {
    return MUSIC_DEFINITIONS[level] || MUSIC_DEFINITIONS[1];
}
