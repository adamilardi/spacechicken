"""Python mirror of rl/contract.json (JSON is the source of truth)."""

from __future__ import annotations

import json
from pathlib import Path

_CONTRACT = json.loads(Path(__file__).with_name("contract.json").read_text())

OBS_VERSION: int = int(_CONTRACT["obsVersion"])
OBS_SIZE: int = int(_CONTRACT["obsSize"])
ACTION_SIZE: int = int(_CONTRACT["actionSize"])
ACTIONS: tuple = tuple(_CONTRACT["actions"])
FEATURES: tuple = tuple(_CONTRACT["features"])
