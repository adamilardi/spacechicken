"""Shared JSONL demo loading for the Space Chicken BC trainer."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

import numpy as np

from contract import ACTION_SIZE, OBS_SIZE, OBS_VERSION


@dataclass
class Sample:
    obs: np.ndarray  # (OBS_SIZE,)
    action: int
    weight: float = 1.0
    won: bool = False
    progress: float = 0.0
    partial: bool = False


@dataclass
class EpisodeRecord:
    path: str
    won: bool
    expert: str
    level: Optional[int]
    obs: np.ndarray  # (T, OBS_SIZE)
    act: np.ndarray  # (T,) int64
    weights: np.ndarray  # (T,)
    headers: dict = field(default_factory=dict)
    max_progress: float = 0.0

    @property
    def steps(self) -> int:
        return int(self.obs.shape[0])


def parse_jsonl_file(
    path: Path,
    *,
    require_version: int = OBS_VERSION,
    require_size: int = OBS_SIZE,
) -> Tuple[Optional[dict], List[dict], Optional[str]]:
    """Returns (header, steps, skip_reason)."""
    header = None
    steps: List[dict] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if row.get("type") == "header":
                header = row
                if row.get("obsVersion", require_version) != require_version:
                    return None, [], "version"
                if row.get("obsSize", require_size) != require_size:
                    return None, [], "size"
                continue
            if row.get("type") == "step":
                steps.append(row)
    if header is None or not steps:
        return None, [], "empty"
    return header, steps, None


def iter_episode_records(
    demo_dir: Path,
    *,
    require_version: int = OBS_VERSION,
    require_size: int = OBS_SIZE,
) -> Iterator[Tuple[EpisodeRecord, Optional[str]]]:
    files = sorted(demo_dir.glob("demo-*.jsonl"))
    for path in files:
        header, steps, reason = parse_jsonl_file(
            path, require_version=require_version, require_size=require_size
        )
        if reason or header is None:
            yield (
                EpisodeRecord(
                    path=str(path),
                    won=False,
                    expert="",
                    level=None,
                    obs=np.zeros((0, require_size), dtype=np.float32),
                    act=np.zeros((0,), dtype=np.int64),
                    weights=np.zeros((0,), dtype=np.float32),
                ),
                reason or "empty",
            )
            continue
        obs_list, act_list, w_list = [], [], []
        for st in steps:
            try:
                obs = np.asarray(st["obs"], dtype=np.float32)
                act = int(st["action"])
                w = float(st.get("weight", 1.0))
            except (KeyError, TypeError, ValueError):
                continue
            if obs.shape != (require_size,) or not (0 <= act < ACTION_SIZE):
                continue
            if not np.isfinite(obs).all() or not np.isfinite(w):
                continue
            obs_list.append(obs)
            act_list.append(act)
            w_list.append(w)
        if not obs_list:
            yield (
                EpisodeRecord(
                    path=str(path),
                    won=False,
                    expert=str(header.get("expert") or ""),
                    level=None,
                    obs=np.zeros((0, require_size), dtype=np.float32),
                    act=np.zeros((0,), dtype=np.int64),
                    weights=np.zeros((0,), dtype=np.float32),
                ),
                "empty",
            )
            continue
        yield (
            EpisodeRecord(
                path=str(path),
                won=bool(header.get("won")),
                expert=str(header.get("expert") or ""),
                level=header.get("level"),
                obs=np.stack(obs_list),
                act=np.asarray(act_list, dtype=np.int64),
                weights=np.asarray(w_list, dtype=np.float32),
                headers=header,
                max_progress=float(header.get("maxProgress") or 0.0),
            ),
            None,
        )


def load_bc_samples(demo_dir: Path) -> Tuple[List[Sample], dict]:
    samples: List[Sample] = []
    meta: Dict[str, Any] = {
        "files": 0,
        "episodes": 0,
        "wins": 0,
        "skipped": {},
    }
    for ep, reason in iter_episode_records(demo_dir):
        meta["files"] += 1
        if reason:
            meta["skipped"][reason] = meta["skipped"].get(reason, 0) + 1
            continue
        meta["episodes"] += 1
        if ep.won:
            meta["wins"] += 1
        for i in range(ep.steps):
            samples.append(
                Sample(
                    obs=ep.obs[i],
                    action=int(ep.act[i]),
                    weight=float(ep.weights[i]),
                    won=ep.won,
                    progress=ep.max_progress,
                    partial=bool(ep.headers.get("partial", False)),
                )
            )
    if not samples:
        raise RuntimeError(f"No step samples found under {demo_dir}")
    meta["steps"] = len(samples)
    meta["partial_steps"] = sum(1 for s in samples if s.partial)
    meta["full_steps"] = len(samples) - meta["partial_steps"]
    return samples, meta
