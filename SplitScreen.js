export const SPLIT_GAP = 6;

export function splitPanes(width, height) {
    const safeWidth = Math.max(2, Math.floor(width));
    const safeHeight = Math.max(2, Math.floor(height));
    const sideBySide = safeWidth >= safeHeight;
    if (sideBySide) {
        const left = Math.max(1, Math.floor((safeWidth - SPLIT_GAP) / 2));
        return {
            sideBySide: true,
            panes: [
                { x: 0, y: 0, width: left, height: safeHeight },
                {
                    x: left + SPLIT_GAP,
                    y: 0,
                    width: Math.max(1, safeWidth - left - SPLIT_GAP),
                    height: safeHeight,
                },
            ],
        };
    }
    const top = Math.max(1, Math.floor((safeHeight - SPLIT_GAP) / 2));
    return {
        sideBySide: false,
        panes: [
            { x: 0, y: 0, width: safeWidth, height: top },
            {
                x: 0,
                y: top + SPLIT_GAP,
                width: safeWidth,
                height: Math.max(1, safeHeight - top - SPLIT_GAP),
            },
        ],
    };
}

export function paneZoom(pane, worldHeight) {
    let zoom = 1;
    if (worldHeight > 0 && pane.height > worldHeight) {
        zoom = pane.height / worldHeight;
    }
    const minVisibleWidth = 280;
    if (zoom > 1 && pane.width / zoom < minVisibleWidth) {
        zoom = pane.width / minVisibleWidth;
    }
    if (zoom < 1) {
        return 1;
    }
    if (zoom > 1.55) {
        return 1.55;
    }
    return zoom;
}
