"""Abstract Base Agent for all HydroMesh Multi-Agent Brains.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Job Description for all our robot helpers in the control room.
Every robot helper has a name, a specialized job, and a clear set of instructions
to follow when analyzing river conditions.
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
