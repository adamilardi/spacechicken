/**
 * Branch routing for the speedrun bot — no per-level logic.
 *
 * A branch level (L12: RUST HARBOR or the IRON VAULT shortcut) offers a
 * UI choice the gameplay pilot cannot answer. The driver picks the
 * option with the fewest remaining levels to the finale by walking the
 * level graph (NEXT_LEVEL/BRANCH), so shortcuts win automatically.
 */

/**
 * Count levels from `start` to the finale (NEXT_LEVEL null), following
 * BRANCH options by their own shortest path. Unknown levels and cycles
 * count as infinite so they never win a pick.
 */
export function levelsToFinale(start, defs) {
    const memo = new Map();
    const visiting = new Set();
    const count = (level) => {
        if (memo.has(level)) return memo.get(level);
        const def = defs?.[level];
        if (!def || visiting.has(level)) return Number.POSITIVE_INFINITY;
        if (def.NEXT_LEVEL == null && !Array.isArray(def.BRANCH)) {
            memo.set(level, 1);
            return 1;
        }
        visiting.add(level);
        const options =
            Array.isArray(def.BRANCH) && def.BRANCH.length > 0 ? def.BRANCH : [def.NEXT_LEVEL];
        let best = Number.POSITIVE_INFINITY;
        for (const next of options) {
            if (next == null) continue;
            best = Math.min(best, count(next));
        }
        visiting.delete(level);
        const total = best === Number.POSITIVE_INFINITY ? best : best + 1;
        memo.set(level, total);
        return total;
    };
    return count(start);
}

/**
 * Pick the branch option index with the shortest path to the finale.
 * Ties and unroutable options fall back to the first valid option.
 */
export function shortestBranchIndex(options, defs) {
    if (!Array.isArray(options) || options.length === 0) return 0;
    let bestIndex = 0;
    let bestCount = Number.POSITIVE_INFINITY;
    for (let index = 0; index < options.length; index++) {
        if (options[index] == null) continue;
        const count = levelsToFinale(options[index], defs);
        if (count < bestCount) {
            bestCount = count;
            bestIndex = index;
        }
    }
    return bestIndex;
}
