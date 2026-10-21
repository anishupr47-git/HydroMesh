"""Predictive agent calculating discharge and sediment forecasts."""

from __future__ import annotations

from hydromesh.agents.base import BaseAgent


class PredictiveAgent(BaseAgent):
    """Predictive agent applying rating curve and trend forecasting."""

    def run(self) -> None:
        """Execute predictive forecasting."""
