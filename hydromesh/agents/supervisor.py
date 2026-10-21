"""Supervisor agent responsible for dynamic pipeline routing."""

from __future__ import annotations

from hydromesh.agents.base import BaseAgent


class SupervisorAgent(BaseAgent):
    """Supervisor agent proposing RoutingPlan with deterministic fallback."""

    def run(self) -> None:
        """Execute supervisor routing logic."""
