# Space Chicken RL stack

Behavior-cloning starter: JEV playtest output → JSONL demos → MLP policy →
browser play. Built for **offline** training runs; nothing here deploys
(`rl/` is not in `config/runtime-assets.cjs`, so Cloudflare never sees it).

## Pipeline

```
JEV_RECORD_DEMOS=1 npm run jev:playtest   # full-observation raw demos (needs TYPESAFE_API_KEY)
npm run rl:convert            # reports + raw demos -> rl/demos/demo-*.jsonl
npm run rl:train              # rl/train_bc.py -> rl/weights/bc-policy.json
npm run rl:play               # play weights in the live game (LEVEL=1, EXPLORE=1)
```

`npm run rl:convert` reads both legacy playtest reports (partial steps:
player/objective only, board slots zero-filled) and raw full-observation
recordings. Once any full episode exists, the trainer supersedes partials
automatically; until then it trains on partials with a loud warning.

## Contract

`rl/contract.json` is the source of truth: obs version 2, 70 floats — the
12 v1 goal/ego features plus 58 board slots (nearest 4 hazards with
active/bonk/boarder/danger/timing, nearest 3 platforms, nearest moving
platform, navigation summary, nearest timed hazard, nearest bomb, canShoot,
kill-zone gap, world size). 10 discrete actions (the `GAME_TEST_ACTIONS`
order). `scripts/rl/features.mjs` is the single encoder used by the
converter, the recorder's reward shaping, and the player — never reimplement
it by hand. `rl/contract.py` mirrors the constants for Python.

## Honest-data notes

- Stored legacy JEV traces (Oct 2026) never won a level (0/17 episodes), so
  they are a **bootstrap prior**, not an expert: seek-the-crown movement with
  occasional jumps, and their board slots are zeros. Sample weights lean on
  JEV confidence × forward progress. Fresh full-observation demos supersede
  them in training as soon as they exist.
- `move_right` dominates legacy steps; the trainer balances classes by
  default (`--no-balance` disables).

## Offline training

```bash
uv pip install -r rl/requirements.txt \
    --index-url https://download.pytorch.org/whl/cpu \
    --extra-index-url https://pypi.org/simple
python3 rl/train_bc.py --epochs 60 --hidden 128,64
LEVEL=2 npm run rl:play
```

Useful flags: `--lr`, `--batch`, `--seed`, `--val-frac`, `--demos <dir>`,
`--keep-partial` (skip the auto-supersede once 200+ full steps exist),
`DECISION_MS`, `DURATION_MS`, `EVAL_OUT`. Eval results land in
`rl/weights/last-eval.json`.

## Speedrun loop (wins, then fastest times)

```
npm run rl:loop                                    # runs until stopped
WORKERS=3 EPISODES=6 MAX_ITERS=20 npm run rl:loop  # bounded
TIME_BUDGET_MIN=480 npm run rl:loop                # 8h overnight
```

Each iteration fans out `WORKERS` temperature-sampling rollouts
(`scripts/rl/rollout.mjs`), runs one REINFORCE update (`rl/train_rl.py`,
learned baseline + entropy bonus, latest cohort only), and records best
clear times in `rl/weights/campaign.json`. The curriculum starts on level 1
and adds the next level whenever the current top is cleared. Needs torch in
`$PYTHON` (default `python3`). Monitor with `tail -f rl/weights/loop.log`.

## Files

| Path                          | Purpose                                              |
| ----------------------------- | ---------------------------------------------------- |
| `rl/contract.json`            | obs/action contract (source of truth)                |
| `rl/contract.py`              | Python mirror of the contract                        |
| `rl/demos_io.py`              | JSONL demo loader                                    |
| `rl/model.py`                 | MLP + JSON weight codec (+ numpy reference forward)  |
| `rl/train_bc.py`              | weighted-NLL BC trainer                              |
| `rl/train_rl.py`              | REINFORCE fine-tuner (baseline + entropy)            |
| `rl/requirements.txt`         | torch (CPU) + numpy                                  |
| `rl/demos/`                   | converted JEV episodes (regenerate with rl:convert)  |
| `rl/weights/`                 | trained policies (prettier-ignored generated output) |
| `scripts/rl/features.mjs`     | shared observation encoder                           |
| `scripts/rl/convert-jev.mjs`  | JEV reports → demos                                  |
| `scripts/rl/policy-infer.mjs` | dependency-free JS forward pass                      |
| `scripts/rl/play-policy.mjs`  | node-side policy player (argmax, optional explore)   |
| `scripts/rl/rollout.mjs`      | temperature-sampling rollout collector for RL        |
| `scripts/rl/loop.sh`          | speedrun loop: rollout → train → best times          |
| `tests/rl-demos.test.cjs`     | contract conformance for demos + weights             |
