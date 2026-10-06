"""Tiny MLP policy for Space Chicken BC. Exports plain-JSON weights for JS play."""

from __future__ import annotations

from typing import List, Sequence

import numpy as np

try:
    import torch
    import torch.nn as nn
except ImportError:  # pragma: no cover - trainer requires torch, loader does not
    torch = None  # type: ignore[assignment]
    nn = None  # type: ignore[assignment]


class PolicyMLP:
    """MLP source of truth lives in torch; this module also ships the JSON codec."""

    def __init__(self, obs_size: int, hidden: Sequence[int], action_size: int):
        if torch is None:
            raise RuntimeError("PyTorch is required to build PolicyMLP")
        layers: List[nn.Module] = []
        prev = obs_size
        for width in hidden:
            layers.append(nn.Linear(prev, int(width)))
            layers.append(nn.ReLU())
            prev = int(width)
        layers.append(nn.Linear(prev, action_size))
        self.net = nn.Sequential(*layers)
        self.hidden = [int(width) for width in hidden]

    def parameters(self):
        return self.net.parameters()

    def __call__(self, batch):
        return self.net(batch)


class ValueMLP:
    """Scalar baseline for REINFORCE. Lives only in the trainer (never exported)."""

    def __init__(self, obs_size: int, hidden: Sequence[int]):
        if torch is None:
            raise RuntimeError("PyTorch is required to build ValueMLP")
        layers: List[nn.Module] = []
        prev = obs_size
        for width in hidden:
            layers.append(nn.Linear(prev, int(width)))
            layers.append(nn.ReLU())
            prev = int(width)
        layers.append(nn.Linear(prev, 1))
        self.net = nn.Sequential(*layers)

    def parameters(self):
        return self.net.parameters()

    def __call__(self, batch):
        return self.net(batch).squeeze(-1)


def load_policy_json(weights: dict) -> "PolicyMLP":
    """Rebuild a PolicyMLP from exported JSON weights (same shapes enforced)."""
    obs_size = int(weights["obsSize"])
    hidden = [int(w) for w in weights["hidden"]]
    action_size = int(weights["actionSize"])
    policy = PolicyMLP(obs_size, hidden, action_size)
    linears = [m for m in policy.net if torch is not None and isinstance(m, torch.nn.Linear)]
    assert len(linears) == len(weights["layers"]), "weight layer count mismatch"
    with torch.no_grad():
        for module, saved in zip(linears, weights["layers"]):
            w = torch.tensor(saved["w"], dtype=torch.float32)
            b = torch.tensor(saved["b"], dtype=torch.float32)
            assert w.shape == module.weight.shape and b.shape == module.bias.shape
            module.weight.copy_(w)
            module.bias.copy_(b)
    return policy


def export_policy_json(policy: "PolicyMLP", obs_size: int, action_size: int) -> dict:
    layers = []
    for module in policy.net:
        if torch is not None and isinstance(module, torch.nn.Linear):
            layers.append(
                {
                    "w": module.weight.detach().cpu().tolist(),
                    "b": module.bias.detach().cpu().tolist(),
                }
            )
    return {
        "obsSize": obs_size,
        "hidden": list(policy.hidden),
        "actionSize": action_size,
        "layers": layers,
    }


def forward_numpy(weights: dict, obs: Sequence[float]) -> List[float]:
    """Reference forward pass in numpy (also mirrors scripts/rl/policy-infer.mjs)."""
    vec = np.asarray(obs, dtype=np.float64)
    for layer in weights["layers"]:
        vec = np.asarray(layer["w"]) @ vec + np.asarray(layer["b"])
        if layer is not weights["layers"][-1]:
            vec = np.maximum(vec, 0.0)
    shifted = vec - vec.max()
    exp = np.exp(shifted)
    return (exp / exp.sum()).tolist()
