/**
 * Pure-JS forward pass for exported BC policy weights (rl/weights/*.json).
 * Mirrors rl/model.py forward_numpy. No dependencies.
 */
export function forwardPolicy(weights, obs) {
    let vec = [...obs];
    const layers = weights.layers;
    for (let i = 0; i < layers.length; i++) {
        const { w, b } = layers[i];
        const next = new Array(b.length).fill(0);
        for (let r = 0; r < b.length; r++) {
            let sum = b[r];
            const row = w[r];
            for (let c = 0; c < vec.length; c++) {
                sum += row[c] * vec[c];
            }
            next[r] = sum;
        }
        vec = i === layers.length - 1 ? next : next.map((v) => Math.max(0, v));
    }
    const max = Math.max(...vec);
    const exp = vec.map((v) => Math.exp(v - max));
    const total = exp.reduce((a, b) => a + b, 0);
    return exp.map((v) => v / total);
}

export function argmax(probs) {
    let best = 0;
    for (let i = 1; i < probs.length; i++) {
        if (probs[i] > probs[best]) best = i;
    }
    return best;
}
