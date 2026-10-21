"""SOP retrieval agent using vector similarity search."""

from __future__ import annotations

from hydromesh.agents.base import BaseAgent


class SopRagAgent(BaseAgent):
    """SOP RAG retrieval agent."""

    def run(self) -> None:
        """Execute SOP retrieval."""
