"""Dispatch agent proposing operational mitigations."""

from __future__ import annotations

from hydromesh.agents.base import BaseAgent


class DispatchAgent(BaseAgent):
    """Dispatch agent generating proposed actions with rule fallback."""

    def run(self) -> None:
        """Execute dispatch decision generation."""
