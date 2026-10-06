# Animation handoff: enemy-hive-brute-a

- Paint: `enemy-hive-brute-a/paint.js`, canvas 56x48, display 56x48, pivot top-left (28, 46).
- Silhouette: bulky chitin torso, horned right head, gold spring-cap pad on top. Colors `#3d1c4e`/`#7a3a8e`, cap `#ffe14a`.
- Moving parts: whole sprite patrols; squash on stomp.
- Method: tween (bonk patrol config) + generic `squashBonkTarget`. No new poses. Contact point: gold cap.
- Hidden structure unknown. Corners transparent (alpha pass).
