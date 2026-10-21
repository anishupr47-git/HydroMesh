"""Pre-configured hydrological scenarios for digital twin testing."""

from __future__ import annotations


class ScenarioGenerator:
    """Generates synthetic telemetry scenarios (e.g. monsoon surge)."""

    def __init__(self, seed: int = 42) -> None:
        self.seed = seed
