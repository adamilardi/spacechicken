#!/usr/bin/env python3
"""
Behavior-cloning trainer for Space Chicken.

Reads JSONL demos from rl/demos/ (see npm run rl:convert), trains a small
MLP classifier over the 10 discrete test actions, and exports
rl/weights/bc-policy.json for scripts/rl/play-policy.mjs.

  python3 rl/train_bc.py --epochs 30
  python3 rl/train_bc.py --epochs 2 --hidden 32 --no-balance (smoke test)
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path
from typing import List

import numpy as np

try:
    import torch
    import torch.nn.functional as F
    from torch.utils.data import DataLoader, Dataset, random_split
except ImportError as exc:
    print("PyTorch is required. See rl/requirements.txt", file=sys.stderr)
    raise SystemExit(1) from exc

_RL_DIR = Path(__file__).resolve().parent
if str(_RL_DIR) not in sys.path:
    sys.path.insert(0, str(_RL_DIR))

from contract import ACTION_SIZE, OBS_SIZE, OBS_VERSION  # noqa: E402
from demos_io import Sample, load_bc_samples  # noqa: E402
from model import PolicyMLP, export_policy_json  # noqa: E402

ROOT = _RL_DIR.parent
DEFAULT_DEMOS = ROOT / "rl" / "demos"
DEFAULT_OUT = ROOT / "rl" / "weights" / "bc-policy.json"


class DemoDataset(Dataset):
    def __init__(self, samples: List[Sample]):
        self.samples = list(samples)

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        s = self.samples[idx]
        return (
            torch.from_numpy(s.obs),
            torch.tensor(s.action, dtype=torch.long),
            torch.tensor(s.weight, dtype=torch.float32),
        )


def parse_args(argv=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Space Chicken BC trainer")
    parser.add_argument("--demos", type=Path, default=DEFAULT_DEMOS)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--hidden", type=str, default="64,64")
    parser.add_argument("--lr", type=float, default=3e-3)
    parser.add_argument("--batch", type=int, default=256)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--val-frac", type=float, default=0.15)
    parser.add_argument(
        "--no-balance",
        action="store_true",
        help="Disable inverse-frequency class balancing (move_right dominates JEV traces).",
    )
    parser.add_argument(
        "--keep-partial",
        action="store_true",
        help="Keep legacy partial-observation steps even when full demos exist.",
    )
    return parser.parse_args(argv)


# Legacy partial steps (zero-filled board slots) are superseded once enough
# full-observation steps exist to train on (~3 episodes). Until then they
# still carry the ego/goal prior, so they are kept with a loud warning.
FULL_SUPERSEDE_MIN_STEPS = 200


def select_samples(samples: List[Sample], keep_partial: bool) -> List[Sample]:
    full = [s for s in samples if not s.partial]
    if keep_partial or len(full) < FULL_SUPERSEDE_MIN_STEPS:
        if not full:
            print(
                "WARNING: training on partial observations only (board slots "
                "are zero-filled). Record full demos with JEV_RECORD_DEMOS=1."
            )
        else:
            print(
                f"keeping {len(samples) - len(full)} partial steps alongside "
                f"{len(full)} full steps (below {FULL_SUPERSEDE_MIN_STEPS} full)"
            )
        return samples
    print(f"superseding {len(samples) - len(full)} partial steps with {len(full)} full steps")
    return full


def class_weights(samples: List[Sample]) -> torch.Tensor:
    counts = np.zeros(ACTION_SIZE, dtype=np.float64)
    for s in samples:
        counts[s.action] += 1
    counts = np.maximum(counts, 1.0)
    weights = counts.sum() / (ACTION_SIZE * counts)
    return torch.tensor(weights, dtype=torch.float32)


def train(args: argparse.Namespace) -> Path:
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)

    samples, meta = load_bc_samples(args.demos)
    samples = select_samples(samples, args.keep_partial)
    print(f"demos: {meta['episodes']} episodes, {len(samples)} steps, {meta['wins']} wins")
    hidden = [int(w) for w in args.hidden.split(",") if w.strip()]
    policy = PolicyMLP(OBS_SIZE, hidden, ACTION_SIZE)
    opt = torch.optim.Adam(policy.parameters(), lr=args.lr)
    balance = class_weights(samples) if not args.no_balance else None

    dataset = DemoDataset(samples)
    n_val = max(1, int(len(dataset) * args.val_frac)) if len(dataset) > 10 else 0
    if n_val > 0:
        train_set, val_set = random_split(
            dataset,
            [len(dataset) - n_val, n_val],
            generator=torch.Generator().manual_seed(args.seed),
        )
    else:
        train_set, val_set = dataset, None
    loader = DataLoader(train_set, batch_size=args.batch, shuffle=True)

    for epoch in range(args.epochs):
        policy.net.train()
        total, correct, loss_sum = 0, 0, 0.0
        for obs, act, weight in loader:
            logits = policy(obs)
            nll = F.cross_entropy(logits, act, reduction="none")
            if balance is not None:
                nll = nll * balance[act]
            loss = (nll * weight).mean()
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += act.numel()
            correct += int((logits.argmax(dim=1) == act).sum())
            loss_sum += float(loss.detach()) * act.numel()
        val_line = ""
        if val_set is not None:
            policy.net.eval()
            with torch.no_grad():
                vo, va, _ = next(iter(DataLoader(val_set, batch_size=len(val_set))))
                vlogits = policy(vo)
                vacc = float((vlogits.argmax(dim=1) == va).float().mean())
                vloss = float(F.cross_entropy(vlogits, va))
            val_line = f" val_loss={vloss:.4f} val_acc={vacc:.3f}"
        print(f"epoch {epoch + 1}/{args.epochs} loss={loss_sum / total:.4f} acc={correct / total:.3f}{val_line}")

    payload = export_policy_json(policy, OBS_SIZE, ACTION_SIZE)
    payload["obsVersion"] = OBS_VERSION
    payload["meta"] = {"epochs": args.epochs, "hidden": hidden, "demoMeta": meta}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload))
    print(f"wrote {args.out}")
    return args.out


if __name__ == "__main__":
    train(parse_args())
