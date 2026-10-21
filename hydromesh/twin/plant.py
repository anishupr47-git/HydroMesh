"""Stylized run-of-river digital twin plant simulator."""

from __future__ import annotations


class PlantTwin:
    """Simulated digital twin plant model."""

    def __init__(self, seed: int = 42) -> None:
        self.seed = seed
