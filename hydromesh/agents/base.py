"""Abstract base class for all HydroMesh agents."""

from __future__ import annotations

from abc import ABC, abstractmethod


class BaseAgent(ABC):
    """Abstract base agent."""

    @abstractmethod
    def run(self) -> None:
        """Execute agent task."""
