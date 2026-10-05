import { spawn as spawnLaser } from './laser.js';
import { spawn as spawnDrone } from './drone.js';
import { spawn as spawnRover } from './rover.js';
import { spawn as spawnCosmicRay } from './cosmic-ray.js';
import { spawn as spawnBonk } from './bonk.js';
import { spawn as spawnCrusher } from './crusher.js';
import { spawn as spawnDrip } from './drip.js';
import { spawn as spawnRoller } from './roller.js';
import { spawn as spawnDustDevil } from './dust-devil.js';
import { spawn as spawnBoarder } from './boarder.js';
import { spawn as spawnGeneric } from './generic.js';

const DYNAMIC_SPAWNERS = {
    laser: spawnLaser,
    drone: spawnDrone,
    rover: spawnRover,
    cosmicRay: spawnCosmicRay,
    bonk: spawnBonk,
    crusher: spawnCrusher,
    drip: spawnDrip,
    roller: spawnRoller,
    dustDevil: spawnDustDevil,
};

export const spawners = {
    ...DYNAMIC_SPAWNERS,
    boarder: spawnBoarder,
};

export function spawnDynamicHazard(builder, group, config) {
    const spawnHazard = DYNAMIC_SPAWNERS[config.type] || spawnGeneric;
    spawnHazard(builder, group, config);
}
