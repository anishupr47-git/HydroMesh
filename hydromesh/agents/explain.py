"""Explain agent producing operator-facing incident reports."""

from __future__ import annotations

from hydromesh.agents.base import BaseAgent


class ExplainAgent(BaseAgent):
    """Explain agent writing incident summary reports."""

    def run(self) -> None:
        """Execute report generation."""
