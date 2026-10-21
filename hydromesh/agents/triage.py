"""Triage agent using classical scikit-learn GradientBoosting."""

from __future__ import annotations

from hydromesh.agents.base import BaseAgent


class TriageAgent(BaseAgent):
    """Triage agent for fast anomaly vector computation."""

    def run(self) -> None:
        """Execute triage evaluation."""
