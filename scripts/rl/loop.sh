#!/bin/bash
# Speedrun RL loop: rollout with temperature -> PPO update -> track best
# clear times -> expand the level curriculum on wins.
#
#   npm run rl:loop
#   WORKERS=4 EPISODES=8 MAX_ITERS=10 TIME_BUDGET_MIN=120 npm run rl:loop
#   TIMESCALE=1 npm run rl:loop          (1x; default is 2x)
#   ROLLOUT_TEMP=1.5 ENTROPY=0.2 npm run rl:loop  (more exploration)
#
# Exploration: rollout temperature stays ABOVE 1 (flatten) and the trainer
# scales its entropy bonus up whenever policy entropy drops under its
# target. T < 1 sharpens the policy and collapses it to a deterministic
# repeat within a few all-fail cohorts.
#
# Defaults run the game at 2x and shorten the decision interval so each
# action still covers ~150ms of game time. The wall-clock horizon shrinks
# the same way, so a failed episode costs ~37s instead of ~75s. Level picks
# are repeated toward the unsolved frontier (a cleared level is sampled
# less often than the one the curriculum just opened). The curriculum can
# open every level through 16. When a level has a clear, one worker sweeps
# up to three cleared levels at temperature 1 while the others explore.
# The fastest real clear of each level is kept in rl/weights/success and
# replayed on every update.
#
# Stops on MAX_ITERS or TIME_BUDGET_MIN (rerun to push times lower). State
# lives in rl/weights/campaign.json, logs in loop.log. Uses .venv/bin/python
# when that env exists, otherwise python3. See rl/requirements.txt.
set -u
cd "$(dirname "$0")/../.."

WORKERS="${WORKERS:-4}"
EPISODES="${EPISODES:-8}"
MAX_ITERS="${MAX_ITERS:-}"
TIME_BUDGET_MIN="${TIME_BUDGET_MIN:-}"
if [ -z "${PYTHON:-}" ]; then
    if [ -x .venv/bin/python ]; then
        PYTHON=".venv/bin/python"
    else
        PYTHON="python3"
    fi
fi
POLICY=rl/weights/rl-policy.json
CAMP=rl/weights/campaign.json
LOG=rl/weights/loop.log
TIMESCALE="${TIMESCALE:-2}"
case "$TIMESCALE" in
    ''|*[!0-9]*) TIMESCALE=2 ;;
esac
if [ "$TIMESCALE" -lt 1 ]; then TIMESCALE=1; fi
if [ "$TIMESCALE" -gt 4 ]; then TIMESCALE=4; fi
# ~150ms of game time per action, and ~75s of game time before a timeout.
if [ -z "${DECISION_MS:-}" ]; then
    DECISION_MS=$((150 / TIMESCALE))
    if [ "$DECISION_MS" -lt 30 ]; then DECISION_MS=30; fi
fi
if [ -z "${ROLLOUT_DUR:-}" ]; then
    ROLLOUT_DUR=$((75000 / TIMESCALE))
fi
ENTROPY="${ENTROPY:-0.15}"
# Reverse curriculum: teleport episodes to grounded late-demo states.
# Unset/0 = full episodes from spawn (default). Warm-start wins train the
# policy but never count as level clears (see header.warmStart filter below).
WARM_START="${WARM_START:-0}"

mkdir -p rl/weights rl/rollouts
[ -f "$POLICY" ] || cp rl/weights/bc-policy.json "$POLICY"
[ -f "$CAMP" ] || echo '{"levels":[1],"bestTimes":{},"wins":{},"iter":0}' > "$CAMP"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

levels_json() { python3 -c "import json;print(' '.join(map(str,json.load(open('$CAMP'))['levels'])))"; }
# Repeat unsolved levels so a uniform draw spends more episodes on the frontier.
levels_weighted() {
    python3 - "$CAMP" <<'EOF'
import json, sys
camp = json.load(open(sys.argv[1]))
levels = camp.get("levels") or [1]
wins = camp.get("wins") or {}
frontier = max(int(level) for level in levels)
parts = []
for level in levels:
    clears = int(wins.get(str(level), 0))
    if int(level) == frontier and clears == 0:
        reps = 4
    elif clears < 3:
        reps = 3
    elif clears < 10:
        reps = 2
    else:
        reps = 1
    parts.extend([str(level)] * reps)
print(" ".join(parts))
EOF
}
best_json() { python3 -c "import json;print(json.dumps(json.load(open('$CAMP')).get('bestTimes',{})))"; }

ITER=$(python3 -c "import json;print(json.load(open('$CAMP'))['iter'])")
START=$SECONDS
while true; do
    ITER=$((ITER + 1))
    if [ -n "$MAX_ITERS" ] && [ "$ITER" -gt "$MAX_ITERS" ]; then log "max iters reached"; break; fi
    if [ -n "$TIME_BUDGET_MIN" ] && [ $(( (SECONDS - START) / 60 )) -ge "$TIME_BUDGET_MIN" ]; then log "time budget reached"; break; fi
    PID="iter$ITER"
    if [ -n "${ROLLOUT_TEMP:-}" ]; then
        TEMP="$ROLLOUT_TEMP"
    elif [ "$ITER" -lt 3 ]; then
        TEMP=1.5
    else
        TEMP=1.2
    fi
    # Keep the fastest real clear of each level. The rm below drops the
    # cohort, and a rare win never comes back unless it is replayed.
    python3 - <<'PY' >> "$LOG" 2>&1 || log "success archive failed"
import glob, json, os, shutil
os.makedirs("rl/weights/success", exist_ok=True)
best = {}
for name in glob.glob("rl/rollouts/rollout-*.jsonl"):
    try:
        header = json.loads(open(name).readline())
    except (OSError, ValueError):
        continue
    if not header.get("won") or header.get("warmStart"):
        continue
    lvl = header.get("level")
    t = header.get("elapsedMs") or header.get("timeMs")
    if lvl is None or not t:
        continue
    prev = best.get(lvl)
    if prev is None or t < prev[0]:
        best[lvl] = (t, name)
for lvl, (t, name) in sorted(best.items(), key=lambda item: int(item[0])):
    dest = f"rl/weights/success/L{lvl}.jsonl"
    old_t = None
    if os.path.exists(dest):
        try:
            old = json.loads(open(dest).readline())
            old_t = old.get("elapsedMs") or old.get("timeMs")
        except (OSError, ValueError):
            old_t = None
    if old_t is None or t < old_t:
        shutil.copy(name, dest)
        print(f"archived L{lvl} clear {t / 1000:.1f}s")
PY

    EXPLOIT_LEVELS=""
    if [ "${EXPLOIT:-1}" != "0" ]; then
        EXPLOIT_LEVELS="$(python3 - "$CAMP" <<'PY' 2>>"$LOG"
import json, sys
path = sys.argv[1]
camp = json.load(open(path))
wins = camp.get("wins") or {}
cleared = sorted(int(k) for k, n in wins.items() if str(k).isdigit() and int(n) > 0)
if not cleared:
    print("")
    raise SystemExit(0)
cursor = int(camp.get("exploitCursor") or 0) % len(cleared)
count = min(3, len(cleared))
picked = [str(cleared[(cursor + i) % len(cleared)]) for i in range(count)]
camp["exploitCursor"] = (cursor + count) % len(cleared)
json.dump(camp, open(path, "w"), indent=2)
print(" ".join(picked))
PY
)" || EXPLOIT_LEVELS=""
    fi
    log "=== iter $ITER policy=$PID temp=$TEMP exploit=${EXPLOIT_LEVELS:-none} levels=$(levels_json) sample=$(levels_weighted) scale=${TIMESCALE}x ==="

    # Drop the previous cohort. A crashed iter can leave files with this same
    # policy id, and the trainer would mix them with the new rollouts.
    rm -f rl/rollouts/rollout-*.jsonl

    BESTS="$(best_json)"
    EXPLORE_WORKERS=$WORKERS
    if [ -n "$EXPLOIT_LEVELS" ] && [ "$WORKERS" -gt 1 ]; then
        EXPLORE_WORKERS=$((WORKERS - 1))
    fi
    BASE_COUNT=$((EPISODES / EXPLORE_WORKERS))
    REMAINDER=$((EPISODES % EXPLORE_WORKERS))
    i=0
    while [ "$i" -lt "$EXPLORE_WORKERS" ]; do
        COUNT=$BASE_COUNT
        if [ "$i" -lt "$REMAINDER" ]; then COUNT=$((COUNT + 1)); fi
        if [ "$COUNT" -gt 0 ]; then
            POLICY="$POLICY" POLICY_ID="$PID" LEVELS="$(levels_weighted)" SEED="$RANDOM" TEMPERATURE="$TEMP" \
                DURATION_MS="$ROLLOUT_DUR" DECISION_MS="$DECISION_MS" BEST_JSON="$BESTS" WARM_START="$WARM_START" \
                ROLLOUT_OUT=rl/rollouts EPISODE_COUNT="$COUNT" TIMESCALE="$TIMESCALE" \
                node scripts/rl/rollout.mjs >> "$LOG" 2>&1 &
        fi
        i=$((i + 1))
    done
    if [ -n "$EXPLOIT_LEVELS" ] && [ "$WORKERS" -gt 1 ]; then
        EXPLOIT_TEMP=1.0
        EXPLOIT_COUNT=0
        for _lvl in $EXPLOIT_LEVELS; do
            EXPLOIT_COUNT=$((EXPLOIT_COUNT + 1))
        done
        POLICY="$POLICY" POLICY_ID="$PID" LEVELS="$EXPLOIT_LEVELS" LEVEL_SWEEP=1 SEED="$RANDOM" \
            TEMPERATURE="$EXPLOIT_TEMP" \
            DURATION_MS="$ROLLOUT_DUR" DECISION_MS="$DECISION_MS" BEST_JSON="$BESTS" WARM_START=0 \
            ROLLOUT_OUT=rl/rollouts EPISODE_COUNT="$EXPLOIT_COUNT" TIMESCALE="$TIMESCALE" \
            node scripts/rl/rollout.mjs >> "$LOG" 2>&1 &
    fi
    wait

    "$PYTHON" rl/train_rl.py --rollouts rl/rollouts --policy-in "$POLICY" \
        --policy-out "$POLICY" --success rl/weights/success --epochs 4 --lr 3e-4 --entropy "$ENTROPY" >> "$LOG" 2>&1 \
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
if str(top) in wins and top < 16 and (top + 1) not in camp["levels"]:
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
