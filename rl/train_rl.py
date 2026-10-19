#!/usr/bin/env python3
"""
PPO fine-tuner for Space Chicken speedrunning.

Consumes policy rollout JSONL (see scripts/rl/rollout.mjs). Each step carries
an observation, a discrete action, the behavior log-prob (temperature-sampled
and masked to legal actions), a shaped reward, and the legal-action mask.

The update is clipped PPO on the masked policy, with an importance weight
for temperature sampling, GAE advantages once the critic beats the mean, and
an entropy bonus that scales up if the policy gets too peaked. The critic is
trained with gradients (it used to sit inside torch.no_grad and never moved).
The fastest clear of each level under rl/weights/success is mixed into every
update with its stored behavior log-prob, so deleting the cohort cannot
forget a win.

  python3 rl/train_rl.py --rollouts rl/rollouts --policy-in rl/weights/bc-policy.json
  python3 rl/train_rl.py --self-test
"""

from __future__ import annotations

import argparse
import glob
import json
import math
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
from model import PolicyMLP, ValueMLP, export_policy_json, load_policy_json  # noqa: E402

ROOT = _RL_DIR.parent


def parse_args(argv=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Space Chicken PPO trainer")
    parser.add_argument("--rollouts", type=Path, default=ROOT / "rl" / "rollouts")
    parser.add_argument("--policy-in", type=Path, default=ROOT / "rl" / "weights" / "bc-policy.json")
    parser.add_argument("--policy-out", type=Path, default=ROOT / "rl" / "weights" / "rl-policy.json")
    parser.add_argument("--value", type=Path, default=ROOT / "rl" / "weights" / "value.pt")
    parser.add_argument(
        "--success",
        type=Path,
        default=ROOT / "rl" / "weights" / "success",
        help="Fastest win per level. Replayed every update; behavior log-probs "
        "stay on the step so the importance weight corrects the old policy.",
    )
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--value-epochs", type=int, default=4)
    parser.add_argument(
        "--device",
        type=str,
        default="auto",
        help="Train on 'cuda', 'cpu', or 'auto' (cuda when available).",
    )
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--value-lr", type=float, default=1e-3)
    parser.add_argument("--gamma", type=float, default=0.995)
    parser.add_argument("--gae-lambda", type=float, default=0.95)
    parser.add_argument(
        "--gae-ev-floor",
        type=float,
        default=0.0,
        help="Use GAE only when the critic's explained variance beats this. "
        "Below it, advantages are Monte Carlo returns (a random critic is worse "
        "than no critic).",
    )
    parser.add_argument("--entropy", type=float, default=0.15)
    parser.add_argument(
        "--entropy-target",
        type=float,
        default=0.6,
        help="Adaptive floor: scale the entropy bonus up (max 10x) when mean "
        "policy entropy falls below this, so all-fail cohorts cannot "
        "collapse the policy to a deterministic repeat.",
    )
    parser.add_argument(
        "--entropy-adapt-gain",
        type=float,
        default=4.0,
        help="Adaptation strength for the entropy floor.",
    )
    parser.add_argument(
        "--clip-ratio",
        type=float,
        default=5.0,
        help="Clip temperature importance weights pi/behavior to [1/clip, clip].",
    )
    parser.add_argument("--ppo-clip", type=float, default=0.2)
    parser.add_argument("--value-coef", type=float, default=0.5)
    parser.add_argument("--target-kl", type=float, default=0.03)
    parser.add_argument("--minibatch", type=int, default=512)
    parser.add_argument(
        "--win-repeat",
        type=int,
        default=2,
        help="Extra copies of winning episodes in the PPO batch so rare clears "
        "are not swamped by long failures.",
    )
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Check GAE, action masking, and that the critic receives gradients.",
    )
    return parser.parse_args(argv)


def read_episode(path):
    header = None
    steps = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if row.get("type") == "header":
                header = row
            elif row.get("type") == "step":
                steps.append(row)
    return header, steps


def load_cohort(rollout_dir: Path):
    """Latest-policyId rollout steps only. Returns (policy_id, episodes)."""
    files = sorted(glob.glob(str(rollout_dir / "rollout-*.jsonl")))
    episodes = []
    for name in files:
        try:
            header, steps = read_episode(name)
        except (OSError, ValueError):
            continue
        if header and steps:
            episodes.append((header, steps))
    if not episodes:
        raise RuntimeError(f"No rollout episodes under {rollout_dir}")
    latest = max(episodes, key=lambda pair: (pair[0].get("policyId", ""), pair[0].get("createdAt", "")))
    policy_id = latest[0].get("policyId")
    cohort = [(h, s) for h, s in episodes if h.get("policyId") == policy_id]
    return policy_id, cohort


def _episode_steps_ok(steps) -> bool:
    for step in steps:
        obs = step.get("obs")
        action = step.get("action")
        if not isinstance(obs, list) or len(obs) != OBS_SIZE:
            return False
        if isinstance(action, bool) or not isinstance(action, int):
            return False
        if not 0 <= action < ACTION_SIZE:
            return False
    return True


def load_success(success_dir: Path):
    """Fastest archived clear per level, even when the policy id differs.

    Stored behavior log-probs make the temperature importance weight treat
    these as off-policy. They are marked replay so the iter's win count
    stays the fresh cohort only.
    """
    if success_dir is None or not success_dir.is_dir():
        return []
    episodes = []
    for name in sorted(success_dir.glob("L*.jsonl")):
        try:
            header, steps = read_episode(name)
        except (OSError, ValueError):
            print(f"skipping unreadable success file {name}")
            continue
        if not header or not steps or not header.get("won") or header.get("warmStart"):
            continue
        if not _episode_steps_ok(steps):
            print(f"skipping success file with a bad step {name}")
            continue
        stamped = dict(header)
        stamped["replay"] = True
        episodes.append((stamped, steps))
    return episodes


def discounted_returns(rewards, gamma):
    out = np.zeros(len(rewards), dtype=np.float32)
    running = 0.0
    for t in range(len(rewards) - 1, -1, -1):
        running = float(rewards[t]) + gamma * running
        out[t] = running
    return out


def gae_advantages(rewards, values, gamma, lam):
    """GAE(λ) with a zero bootstrap after the last step (episode already ended)."""
    rewards = np.asarray(rewards, dtype=np.float32)
    values = np.asarray(values, dtype=np.float32)
    out = np.zeros(len(rewards), dtype=np.float32)
    last = 0.0
    for t in range(len(rewards) - 1, -1, -1):
        next_v = float(values[t + 1]) if t + 1 < len(values) else 0.0
        delta = float(rewards[t]) + gamma * next_v - float(values[t])
        last = delta + gamma * lam * last
        out[t] = last
    return out


def explained_variance(y, pred) -> float:
    y_t = torch.as_tensor(y, dtype=torch.float32)
    p_t = torch.as_tensor(pred, dtype=torch.float32)
    var_y = torch.var(y_t, unbiased=False)
    if float(var_y) < 1e-8:
        return 0.0
    return float(1.0 - torch.var(y_t - p_t, unbiased=False) / var_y)


def masked_log_probs(logits, mask):
    """Log-softmax over legal actions. Empty masks fall back to every action."""
    legal = mask > 0.5
    legal = legal | ~legal.any(dim=1, keepdim=True)
    masked = logits.masked_fill(~legal, -1e9)
    return F.log_softmax(masked, dim=-1)


def entropy_coef(prev_entropy, args) -> float:
    """Bonus only while entropy is under the floor. Temperature already explores.

    A constant bonus on a policy that is already flat washes out the wins.
    """
    if prev_entropy is None:
        return args.entropy
    if prev_entropy >= args.entropy_target:
        return 0.0
    shortfall = (args.entropy_target - prev_entropy) / max(args.entropy_target, 1e-6)
    return args.entropy * min(10.0, 1.0 + args.entropy_adapt_gain * shortfall)


def ppo_loss(policy, value, obs, act, mask, old_logp, is_w, adv, returns, ent_coef, ppo_clip, value_coef):
    """Clipped surrogate plus a live value loss. The critic must stay in the graph."""
    logp_all = masked_log_probs(policy(obs), mask)
    logp = logp_all.gather(1, act.unsqueeze(1)).squeeze(1)
    ratio = (logp - old_logp).exp()
    unclipped = is_w * ratio * adv
    clipped = is_w * ratio.clamp(1.0 - ppo_clip, 1.0 + ppo_clip) * adv
    policy_loss = -torch.min(unclipped, clipped).mean()
    probs = logp_all.exp()
    entropy = -(probs * logp_all).sum(dim=-1).mean()
    value_pred = value(obs)
    value_loss = F.smooth_l1_loss(value_pred, returns)
    loss = policy_loss + value_coef * value_loss - ent_coef * entropy
    clip_frac = (ratio - 1.0).abs().gt(ppo_clip).float().mean()
    return loss, policy_loss, value_loss, entropy, logp, clip_frac


def resolve_device(name: str) -> torch.device:
    if name == "auto":
        name = "cuda" if torch.cuda.is_available() else "cpu"
    if name == "cuda" and not torch.cuda.is_available():
        print("WARNING: --device cuda requested but CUDA is unavailable; using cpu")
        name = "cpu"
    device = torch.device(name)
    if device.type == "cuda":
        print(f"device: cuda ({torch.cuda.get_device_name(device)})")
    else:
        print("device: cpu")
    return device


def _step_arrays(steps):
    obs, act, behavior, mask = [], [], [], []
    for step in steps:
        vec = np.asarray(step["obs"], dtype=np.float32)
        assert vec.shape == (OBS_SIZE,)
        action = int(step["action"])
        assert 0 <= action < ACTION_SIZE
        obs.append(vec)
        act.append(action)
        try:
            behavior.append(float(step.get("behaviorLogProb")))
        except (TypeError, ValueError):
            behavior.append(float("nan"))
        raw_mask = step.get("mask")
        if not isinstance(raw_mask, list) or len(raw_mask) != ACTION_SIZE:
            raw_mask = [1] * ACTION_SIZE
        mask.append([1.0 if float(bit) > 0.5 else 0.0 for bit in raw_mask])
    return (
        np.stack(obs),
        np.asarray(act, dtype=np.int64),
        np.asarray(behavior, dtype=np.float32),
        np.asarray(mask, dtype=np.float32),
    )


def self_test() -> None:
    """GAE identity, masked softmax, and a non-zero critic gradient."""
    rewards = np.array([1.0, 0.0, 1.0], dtype=np.float32)
    values = np.zeros(3, dtype=np.float32)
    adv = gae_advantages(rewards, values, gamma=0.5, lam=1.0)
    mc = discounted_returns(rewards, 0.5)
    if not np.allclose(adv, mc, atol=1e-5):
        raise SystemExit(f"GAE λ=1 with a zero critic should match returns, got {adv} vs {mc}")

    logits = torch.tensor([[10.0, 0.0, 0.0, 0.0]])
    mask = torch.tensor([[0.0, 1.0, 1.0, 1.0]])
    probs = masked_log_probs(logits, mask).exp()
    if float(probs[0, 0]) > 1e-6 or not torch.allclose(probs[0, 1:], torch.full((3,), 1.0 / 3.0), atol=1e-5):
        raise SystemExit(f"masked log-softmax failed: {probs}")

    torch.manual_seed(0)
    policy = PolicyMLP(4, [8], 4)
    value = ValueMLP(4, [8])
    obs = torch.randn(32, 4)
    act = torch.randint(0, 3, (32,))
    step_mask = torch.ones(32, 4)
    step_mask[:, 3] = 0
    with torch.no_grad():
        old = masked_log_probs(policy(obs), step_mask).gather(1, act.unsqueeze(1)).squeeze(1)
    adv_t = torch.randn(32)
    ret = torch.randn(32)
    loss, _, value_loss, _, _, _ = ppo_loss(
        policy,
        value,
        obs,
        act,
        step_mask,
        old,
        torch.ones(32),
        adv_t,
        ret,
        ent_coef=0.15,
        ppo_clip=0.2,
        value_coef=0.5,
    )
    loss.backward()
    value_grad = sum(float(p.grad.abs().sum()) for p in value.parameters() if p.grad is not None)
    policy_grad = sum(float(p.grad.abs().sum()) for p in policy.parameters() if p.grad is not None)
    if value_grad <= 0 or policy_grad <= 0 or not math.isfinite(value_grad):
        raise SystemExit(f"expected policy and value gradients, got {policy_grad} {value_grad}")
    if float(value_loss.detach()) <= 0:
        raise SystemExit("value loss should be positive on random targets")
    print(
        f"self-test ok gae={adv.tolist()} value_grad={value_grad:.3f} policy_grad={policy_grad:.3f}"
    )


def train(args: argparse.Namespace) -> Path:
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    device = resolve_device(args.device)
    if device.type == "cuda":
        torch.cuda.manual_seed_all(args.seed)

    policy_id, cohort = load_cohort(args.rollouts)
    replay = load_success(args.success)
    if replay:
        replay_steps = sum(len(steps) for _, steps in replay)
        print(f"replaying {len(replay)} archived clears ({replay_steps} steps)")
    cohort = list(cohort) + replay
    obs_parts, act_parts, ret_parts, beh_parts, mask_parts = [], [], [], [], []
    win_parts, val_parts = [], []
    wins, win_times = 0, []
    for header, steps in cohort:
        rewards = np.array([float(s.get("reward", 0.0)) for s in steps], dtype=np.float32)
        obs, act, behavior, mask = _step_arrays(steps)
        obs_parts.append(obs)
        act_parts.append(act)
        beh_parts.append(behavior)
        mask_parts.append(mask)
        ret_parts.append(discounted_returns(rewards, args.gamma))
        # Placeholder values filled after the critic forward; lengths must match.
        val_parts.append(rewards)
        win_parts.append(np.full(len(steps), 1.0 if header.get("won") else 0.0, dtype=np.float32))
        if header.get("won") and not header.get("replay"):
            wins += 1
            if header.get("timeMs"):
                win_times.append(float(header["timeMs"]))

    obs_all = np.concatenate(obs_parts)
    act_all = np.concatenate(act_parts)
    ret_all = np.concatenate(ret_parts)
    behavior_all = np.concatenate(beh_parts)
    mask_all = np.concatenate(mask_parts)
    win_all = np.concatenate(win_parts)
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
    policy.net.to(device)
    value.net.to(device)

    obs_t = torch.from_numpy(obs_all).to(device)
    act_t = torch.from_numpy(act_all).to(device)
    ret_t = torch.from_numpy(ret_all).to(device)
    behavior_t = torch.from_numpy(behavior_all).to(device)
    mask_t = torch.from_numpy(mask_all).to(device)
    win_t = torch.from_numpy(win_all).to(device)

    with torch.no_grad():
        values = value(obs_t)
        logp_all = masked_log_probs(policy(obs_t), mask_t)
        old_logp = logp_all.gather(1, act_t.unsqueeze(1)).squeeze(1)
        finite = torch.isfinite(behavior_t)
        log_clip = math.log(max(args.clip_ratio, 1.01))
        is_w = torch.ones_like(old_logp)
        is_w[finite] = (old_logp[finite] - behavior_t[finite]).clamp(-log_clip, log_clip).exp()

    ev = explained_variance(ret_t, values)
    # The critic always regresses to Monte Carlo returns, so the next
    # iteration's explained variance is comparable. GAE is only the policy
    # advantage, and only once this critic already beats predicting the mean.
    returns = ret_t
    lengths = [len(part) for part in ret_parts]
    if ev >= args.gae_ev_floor:
        adv_np = []
        offset = 0
        values_np = values.detach().cpu().numpy()
        for length, rewards in zip(lengths, val_parts):
            adv_np.append(
                gae_advantages(rewards, values_np[offset : offset + length], args.gamma, args.gae_lambda)
            )
            offset += length
        adv = torch.from_numpy(np.concatenate(adv_np)).to(device)
        adv_kind = "gae"
    else:
        adv = ret_t.clone()
        adv_kind = "mc"
    print(f"critic ev={ev:.3f} adv={adv_kind} is_mean={float(is_w.mean()):.3f}")

    adv = (adv - adv.mean()) / (adv.std() + 1e-6)
    if args.win_repeat > 1:
        win_idx = torch.nonzero(win_t > 0.5, as_tuple=False).flatten()
        if len(win_idx):
            extra = win_idx.repeat(args.win_repeat - 1)
            keep = torch.cat([torch.arange(obs_t.shape[0], device=device), extra])
            obs_t = obs_t[keep]
            act_t = act_t[keep]
            mask_t = mask_t[keep]
            old_logp = old_logp[keep]
            is_w = is_w[keep]
            adv = adv[keep]
            returns = returns[keep]

    policy_opt = torch.optim.Adam(policy.parameters(), lr=args.lr)
    value_opt = torch.optim.Adam(value.parameters(), lr=args.value_lr)
    n = obs_t.shape[0]
    mb = max(1, min(args.minibatch, n))
    with torch.no_grad():
        held = masked_log_probs(policy(obs_t), mask_t)
        prev_entropy = float((-(held.exp() * held).sum(dim=-1).mean()))
    print(f"batch entropy={prev_entropy:.3f} ent_coef={entropy_coef(prev_entropy, args):.3f}")
    for epoch in range(args.epochs):
        coef = entropy_coef(prev_entropy, args)
        policy_snap = {k: v.detach().clone() for k, v in policy.net.state_dict().items()}
        value_snap = {k: v.detach().clone() for k, v in value.net.state_dict().items()}
        policy.net.train()
        value.net.train()
        order = torch.randperm(n, device=device)
        for start in range(0, n, mb):
            batch = order[start : start + mb]
            loss, _, _, _, _, _ = ppo_loss(
                policy,
                value,
                obs_t[batch],
                act_t[batch],
                mask_t[batch],
                old_logp[batch],
                is_w[batch],
                adv[batch],
                returns[batch],
                coef,
                args.ppo_clip,
                args.value_coef,
            )
            if not torch.isfinite(loss):
                print("non-finite loss; refusing to write")
                raise SystemExit(1)
            policy_opt.zero_grad()
            value_opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(policy.parameters(), 1.0)
            torch.nn.utils.clip_grad_norm_(value.parameters(), 1.0)
            policy_opt.step()
            value_opt.step()

        with torch.no_grad():
            full_loss, policy_loss, value_loss, entropy, new_logp, clip_frac = ppo_loss(
                policy,
                value,
                obs_t,
                act_t,
                mask_t,
                old_logp,
                is_w,
                adv,
                returns,
                coef,
                args.ppo_clip,
                args.value_coef,
            )
            approx_kl = float((old_logp - new_logp).mean())
            ratio_mean = float((new_logp - old_logp).exp().mean())
        kept_entropy = float(entropy.detach())
        print(
            f"epoch {epoch + 1}/{args.epochs} loss={float(full_loss):.4f} "
            f"pol={float(policy_loss):.4f} val={float(value_loss):.4f} "
            f"ret_mean={float(ret_t.mean()):.3f} entropy={kept_entropy:.3f} "
            f"ent_coef={coef:.3f} ratio_mean={ratio_mean:.3f} "
            f"kl={approx_kl:.4f} clip={float(clip_frac):.3f} "
            f"behavior_cov={behavior_coverage:.2f}"
        )
        if approx_kl > args.target_kl:
            policy.net.load_state_dict(policy_snap)
            value.net.load_state_dict(value_snap)
            print(f"early stop: kl {approx_kl:.4f} > {args.target_kl}; reverted epoch")
            break
        prev_entropy = kept_entropy

    for _ in range(args.value_epochs):
        value.net.train()
        pred = value(obs_t)
        value_loss = F.smooth_l1_loss(pred, returns)
        if not torch.isfinite(value_loss):
            print("non-finite value loss; refusing to write")
            raise SystemExit(1)
        value_opt.zero_grad()
        value_loss.backward()
        torch.nn.utils.clip_grad_norm_(value.parameters(), 1.0)
        value_opt.step()

    payload = export_policy_json(policy, OBS_SIZE, ACTION_SIZE)
    payload["obsVersion"] = saved.get("obsVersion", 2)
    payload["meta"] = {
        "trainer": "ppo",
        "policyId": policy_id,
        "wins": wins,
        "device": str(device),
        "criticEv": round(ev, 4),
        "advantage": adv_kind,
    }
    args.policy_out.parent.mkdir(parents=True, exist_ok=True)
    args.policy_out.write_text(json.dumps(payload))
    torch.save(value.net.state_dict(), args.value)
    print(f"wrote {args.policy_out}")
    return args.policy_out


if __name__ == "__main__":
    parsed = parse_args()
    if parsed.self_test:
        self_test()
    else:
        train(parsed)
