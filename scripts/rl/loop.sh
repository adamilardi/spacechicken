#!/bin/bash
# Speedrun RL loop: rollout with temperature -> REINFORCE update -> track
# best clear times -> expand the level curriculum on wins.
#
#   npm run rl:loop
#   WORKERS=3 EPISODES=6 MAX_ITERS=10 TIME_BUDGET_MIN=120 npm run rl:loop
#
# Stops on MAX_ITERS, TIME_BUDGET_MIN, or all 7 levels cleared (rerun to push
# times lower). State lives in rl/weights/campaign.json, logs in loop.log.
# Needs torch in $PYTHON (default python3): see rl/requirements.txt.
set -u
cd "$(dirname "$0")/../.."

WORKERS="${WORKERS:-3}"
EPISODES="${EPISODES:-6}"
MAX_ITERS="${MAX_ITERS:-}"
TIME_BUDGET_MIN="${TIME_BUDGET_MIN:-}"
PYTHON="${PYTHON:-python3}"
POLICY=rl/weights/rl-policy.json
CAMP=rl/weights/campaign.json
LOG=rl/weights/loop.log
ROLLOUT_DUR="${ROLLOUT_DUR:-75000}"
# Reverse curriculum: teleport episodes to grounded late-demo states.
# Unset/0 = full episodes from spawn (default). Warm-start wins train the
# policy but never count as level clears (see header.warmStart filter below).
WARM_START="${WARM_START:-0}"

mkdir -p rl/weights rl/rollouts
[ -f "$POLICY" ] || cp rl/weights/bc-policy.json "$POLICY"
[ -f "$CAMP" ] || echo '{"levels":[1],"bestTimes":{},"wins":{},"iter":0}' > "$CAMP"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

levels_json() { python3 -c "import json;print(' '.join(map(str,json.load(open('$CAMP'))['levels'])))"; }
best_ms() { python3 -c "import json,sys;print(json.load(open('$CAMP')).get('bestTimes',{}).get(str(sys.argv[1]),''))" "$1"; }

ITER=$(python3 -c "import json;print(json.load(open('$CAMP'))['iter'])")
START=$SECONDS
while true; do
    ITER=$((ITER + 1))
    if [ -n "$MAX_ITERS" ] && [ "$ITER" -gt "$MAX_ITERS" ]; then log "max iters reached"; break; fi
    if [ -n "$TIME_BUDGET_MIN" ] && [ $(( (SECONDS - START) / 60 )) -ge "$TIME_BUDGET_MIN" ]; then log "time budget reached"; break; fi
    PID="iter$ITER"
    if [ "$ITER" -lt 3 ]; then TEMP=1.0; else TEMP=0.7; fi
    log "=== iter $ITER policy=$PID temp=$TEMP levels=$(levels_json) ==="

    for f in rl/rollouts/rollout-*.jsonl; do
        case "$f" in *"$PID"*|*"iter$((ITER - 1))"*) ;; *) rm -f "$f" ;; esac
    done 2>/dev/null

    i=0
    while [ "$i" -lt "$EPISODES" ]; do
        while [ "$(jobs -r | wc -l)" -ge "$WORKERS" ]; do wait -n; done
        LVL=$(levels_json | tr ' ' '\n' | shuf -n 1)
        POLICY="$POLICY" POLICY_ID="$PID" LEVEL="$LVL" SEED="$RANDOM" TEMPERATURE="$TEMP" \
            DURATION_MS="$ROLLOUT_DUR" BEST_MS="$(best_ms "$LVL")" WARM_START="$WARM_START" ROLLOUT_OUT=rl/rollouts node scripts/rl/rollout.mjs >> "$LOG" 2>&1 &
        i=$((i + 1))
    done
    wait

    "$PYTHON" rl/train_rl.py --rollouts rl/rollouts --policy-in "$POLICY" \
        --policy-out "$POLICY" --epochs 4 --lr 3e-4 >> "$LOG" 2>&1 \
        || { log "trainer failed; keeping previous policy"; }

    python3 - "$CAMP" "$PID" <<'EOF' >> "$LOG" 2>&1
import glob, json, sys
camp_path, pid = sys.argv[1], sys.argv[2]
camp = json.load(open(camp_path))
wins = {}
best = dict(camp.get("bestTimes", {}))
for name in glob.glob("rl/rollouts/rollout-*.jsonl"):
    try:
        header = json.loads(open(name).readline())
    except (OSError, ValueError):
        continue
    if header.get("policyId") != pid or not header.get("won"):
        continue
    if header.get("warmStart"):
        print(f"warm-start win {name} trains but does not count as a clear")
        continue
    lvl = str(header.get("level"))
    wins[lvl] = wins.get(lvl, 0) + 1
    t = header.get("elapsedMs") or header.get("timeMs")
    if t and (lvl not in best or t < best[lvl]):
        best[lvl] = t
        print(f"new best L{lvl}: {t / 1000:.1f}s")
camp["bestTimes"] = best
for lvl, n in wins.items():
    camp["wins"][lvl] = camp.get("wins", {}).get(lvl, 0) + n
print(f"iter {pid} wins: {wins or 'none'}")
top = max(camp["levels"])
if str(top) in wins and top < 10 and (top + 1) not in camp["levels"]:
    camp["levels"].append(top + 1)
    print(f"curriculum expands to level {top + 1}")
camp["iter"] = int(pid.replace("iter", ""))
json.dump(camp, open(camp_path, "w"), indent=2)
EOF

    if [ "${WATCH:-0}" = "1" ]; then
        log "watch: headed replay of $POLICY on L1 (see it play)"
        POLICY="$POLICY" LEVEL=1 DURATION_MS=90000 HEADLESS=0 \
            node scripts/rl/play-policy.mjs >> "$LOG" 2>&1 || true
    fi
done
log "loop done: $(cat "$CAMP")"
