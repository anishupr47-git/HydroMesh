"""Abstract Base Agent Framework for HydroMesh Autonomous Intelligence.

Overview:
    Defines the standard architectural contract for all specialized AI agents.
    Each agent acts as a dedicated operational domain expert—such as sediment forecasting,
    hydraulic gate modulation, or financial analysis—operating with explicit roles and boundaries.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseAgent(ABC):
    """Abstract base agent providing common identity and execution contract."""

    def __init__(self, name: str, role: str) -> None:
        self.name = name
        self.role = role

    @abstractmethod
    async def run(self, *args: Any, **kwargs: Any) -> Any:
        """Execute agent analysis task asynchronously."""
