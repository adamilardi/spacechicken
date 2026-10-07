#!/usr/bin/env python3
"""
REINFORCE fine-tuner for Space Chicken speedrunning.

Consumes policy rollout JSONL (see scripts/rl/rollout.mjs): each step carries
obs, discrete action, behavior log-prob, shaped reward, and termination. A
learned scalar baseline (never exported) reduces variance; an entropy bonus
keeps the policy exploring. Only the latest policyId cohort trains, so
updates stay near-on-policy.

  python3 rl/train_rl.py --rollouts rl/rollouts --policy-in rl/weights/bc-policy.json
"""

from __future__ import annotations

import argparse
import glob
import json
import random
import sys
from pathlib import Path

import numpy as np

try:
    import torch
    import torch.nn.functional as F
except ImportError as exc:
    print("PyTorch is required. See rl/requirements.txt", file=sys.stderr)
    raise SystemExit(1) from exc

_RL_DIR = Path(__file__).resolve().parent
if str(_RL_DIR) not in sys.path:
    sys.path.insert(0, str(_RL_DIR))

from contract import ACTION_SIZE, OBS_SIZE  # noqa: E402
from model import ValueMLP, export_policy_json, load_policy_json  # noqa: E402

ROOT = _RL_DIR.parent


def parse_args(argv=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Space Chicken REINFORCE trainer")
    parser.add_argument("--rollouts", type=Path, default=ROOT / "rl" / "rollouts")
    parser.add_argument("--policy-in", type=Path, default=ROOT / "rl" / "weights" / "bc-policy.json")
    parser.add_argument("--policy-out", type=Path, default=ROOT / "rl" / "weights" / "rl-policy.json")
    parser.add_argument("--value", type=Path, default=ROOT / "rl" / "weights" / "value.pt")
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--gamma", type=float, default=0.995)
    parser.add_argument("--entropy", type=float, default=0.03)
    parser.add_argument(
        "--clip-ratio",
        type=float,
        default=5.0,
        help="Clip importance weights pi/behavior to [1/clip, clip].",
    )
    parser.add_argument("--seed", type=int, default=7)
    return parser.parse_args(argv)


def load_cohort(rollout_dir: Path):
    """Latest-policyId rollout steps only. Returns (obs, act, ret, meta)."""
    files = sorted(glob.glob(str(rollout_dir / "rollout-*.jsonl")))
    episodes = []
    for name in files:
        header = None
        steps = []
        with open(name, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                if row.get("type") == "header":
                    header = row
                elif row.get("type") == "step":
                    steps.append(row)
        if header and steps:
            episodes.append((header, steps))
    if not episodes:
        raise RuntimeError(f"No rollout episodes under {rollout_dir}")
    latest = max(episodes, key=lambda pair: (pair[0].get("policyId", ""), pair[0].get("createdAt", "")))
    policy_id = latest[0].get("policyId")
    cohort = [(h, s) for h, s in episodes if h.get("policyId") == policy_id]
    return policy_id, cohort


def discounted_returns(rewards, gamma):
    out = np.zeros(len(rewards), dtype=np.float32)
    running = 0.0
    for t in range(len(rewards) - 1, -1, -1):
        running = rewards[t] + gamma * running
        out[t] = running
    return out


def train(args: argparse.Namespace) -> Path:
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)

    policy_id, cohort = load_cohort(args.rollouts)
    obs_all, act_all, ret_all, behavior_all = [], [], [], []
    wins, win_times = 0, []
    for header, steps in cohort:
        rewards = np.array([float(s.get("reward", 0.0)) for s in steps], dtype=np.float32)
        ret_all.append(discounted_returns(rewards, args.gamma))
        for step in steps:
            obs = np.asarray(step["obs"], dtype=np.float32)
            assert obs.shape == (OBS_SIZE,)
            assert 0 <= int(step["action"]) < ACTION_SIZE
            obs_all.append(obs)
            act_all.append(int(step["action"]))
            try:
                behavior_all.append(float(step.get("behaviorLogProb")))
            except (TypeError, ValueError):
                behavior_all.append(float("nan"))
        if header.get("won"):
            wins += 1
            if header.get("timeMs"):
                win_times.append(float(header["timeMs"]))
    obs_all = np.stack(obs_all)
    act_all = np.asarray(act_all, dtype=np.int64)
    ret_all = np.concatenate(ret_all)
    behavior_all = np.asarray(behavior_all, dtype=np.float32)
    behavior_coverage = float(np.isfinite(behavior_all).mean()) if len(behavior_all) else 0.0
    print(
        f"cohort {policy_id}: {len(cohort)} episodes, {len(act_all)} steps, "
        f"{wins} wins" + (f", best {min(win_times) / 1000:.1f}s" if win_times else "")
    )

    saved = json.loads(args.policy_in.read_text())
    policy = load_policy_json(saved)
    hidden = list(policy.hidden)
    value = ValueMLP(OBS_SIZE, hidden)
    if args.value.exists():
        value.net.load_state_dict(torch.load(args.value, map_location="cpu", weights_only=True))

    opt = torch.optim.Adam(
        list(policy.parameters()) + list(value.parameters()), lr=args.lr
    )
    obs_t = torch.from_numpy(obs_all)
    act_t = torch.from_numpy(act_all)
    ret_t = torch.from_numpy(ret_all)
    behavior_t = torch.from_numpy(behavior_all)
    ret_norm = (ret_t - ret_t.mean()) / (ret_t.std() + 1e-6)

    for epoch in range(args.epochs):
        policy.net.train()
        value.net.train()
        logits = policy(obs_t)
        log_probs = F.log_softmax(logits, dim=1)
        chosen = log_probs.gather(1, act_t.unsqueeze(1)).squeeze(1)
        with torch.no_grad():
            baseline = value(obs_t)
            advantage = ret_norm - baseline
            adv_norm = (advantage - advantage.mean()) / (advantage.std() + 1e-6)
            # Off-policy correction: rollouts are temperature-sampled, so
            # weight by pi/behavior (detached, clipped). Steps without a
            # stored behavior log-prob (legacy rollouts) get weight 1.
            finite = torch.isfinite(behavior_t)
            ratio = torch.ones_like(chosen)
            ratio[finite] = (chosen[finite] - behavior_t[finite]).exp().clamp(
                1.0 / args.clip_ratio, args.clip_ratio
            )
        policy_loss = -(ratio * adv_norm.detach() * chosen).mean()
        value_loss = F.mse_loss(baseline, ret_norm)
        entropy = -(log_probs.exp() * log_probs).sum(dim=1).mean()
        loss = policy_loss + 0.5 * value_loss - args.entropy * entropy
        opt.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(
            list(policy.parameters()) + list(value.parameters()), 1.0
        )
        opt.step()
        print(
            f"epoch {epoch + 1}/{args.epochs} loss={float(loss.detach()):.4f} "
            f"ret_mean={float(ret_t.mean()):.3f} entropy={float(entropy.detach()):.3f} "
            f"ratio_mean={float(ratio.mean()):.3f} behavior_cov={behavior_coverage:.2f}"
        )

    payload = export_policy_json(policy, OBS_SIZE, ACTION_SIZE)
    payload["obsVersion"] = saved.get("obsVersion", 2)
    payload["meta"] = {"trainer": "reinforce", "policyId": policy_id, "wins": wins}
    args.policy_out.parent.mkdir(parents=True, exist_ok=True)
    args.policy_out.write_text(json.dumps(payload))
    torch.save(value.net.state_dict(), args.value)
    print(f"wrote {args.policy_out}")
    return args.policy_out


if __name__ == "__main__":
    train(parse_args())
