export function spawn(builder, group, config) {
    const alien = group.create(config.x, config.y, 'boarder');
    if (!alien) {
        return;
    }
    alien.shootable = true;
    alien.homeX = config.x;
    alien.homeY = config.y;
    alien.wave = config.wave > 1 ? config.wave : 1;
    alien.arrived = alien.wave === 1;
    alien.setDepth(7);
    alien.setBounce(0);
    alien.setCollideWorldBounds(false);
    alien.body.allowGravity = true;
    alien.body.setSize(22, 36, true);
    builder.tagTestEntity(alien, {
        kind: 'hazard',
        type: 'boarder',
        shootable: true,
        wave: alien.wave,
        origin: { x: config.x, y: config.y },
    });
    if (!alien.arrived) {
        alien.body.enable = false;
        alien.setActive(false);
        alien.setVisible(false);
    }
}
