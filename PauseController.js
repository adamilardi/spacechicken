// Keep the resume control outside Phaser so it works while the scene is paused.
export function attachPauseControls(game) {
    const button = document.getElementById('pause-button');
    const dialog = document.getElementById('pause-dialog');
    const resume = document.getElementById('resume-button');
    let pausedScene = null;
    let pausedAt = 0;

    function pause() {
        const scene = game.scene.getScenes(true)[0];
        if (
            !scene ||
            scene.awaitingStart ||
            scene.gameOver ||
            scene.isTransitioning ||
            pausedScene
        ) {
            return;
        }
        pausedScene = scene;
        pausedAt = performance.now();
        scene.input.keyboard.resetKeys();
        scene.jumpRequested = false;
        scene.scene.pause();
        game.sound.context?.suspend()?.catch(() => {});
        dialog.showModal();
        resume.focus({ preventScroll: true });
        dialog.scrollTop = 0;
    }

    function unpause() {
        if (!pausedScene || document.hidden) return;
        pausedScene.startTime += performance.now() - pausedAt;
        pausedScene.input.keyboard.resetKeys();
        for (const pointer of pausedScene.input.manager.pointers) pointer.reset();
        pausedScene.jumpRequested = false;
        pausedScene.jumpPointerId = null;
        pausedScene.pointerTapTimes.clear();
        for (const name of ['leftButton', 'rightButton', 'jumpButton']) {
            pausedScene.uiManager?.[name]?.clearTint();
        }
        pausedScene.scene.resume();
        pausedScene = null;
        game.sound.context?.resume()?.catch(() => {});
        dialog.close();
        button.blur();
        game.canvas.focus();
    }

    function onKey(event) {
        if (event.code !== 'Escape' && event.code !== 'KeyP') return;
        if (event.repeat) return;
        event.preventDefault();
        if (pausedScene) unpause();
        else pause();
    }

    function onGamepadStart() {
        if (pausedScene) unpause();
        else pause();
    }

    function onVisibility() {
        if (document.hidden) pause();
    }

    function onCancel(event) {
        event.preventDefault();
        unpause();
    }

    function syncButton() {
        const scene = pausedScene || game.scene.getScenes(true)[0];
        button.hidden = !scene || scene.awaitingStart || scene.gameOver || scene.isTransitioning;
    }

    game.events.on('poststep', syncButton);
    button.addEventListener('click', pause);
    resume.addEventListener('click', unpause);
    dialog.addEventListener('cancel', onCancel);
    window.addEventListener('keydown', onKey);
    window.addEventListener('space-chicken-gamepad-start', onGamepadStart);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', onVisibility);
    game.events.once('destroy', () => {
        game.events.off('poststep', syncButton);
        button.removeEventListener('click', pause);
        resume.removeEventListener('click', unpause);
        dialog.removeEventListener('cancel', onCancel);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('space-chicken-gamepad-start', onGamepadStart);
        window.removeEventListener('blur', pause);
        document.removeEventListener('visibilitychange', onVisibility);
        dialog.close();
    });
}
