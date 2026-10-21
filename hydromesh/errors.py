"""Custom exception hierarchy for HydroMesh."""

from __future__ import annotations


class HydroMeshError(Exception):
    """Base exception for all HydroMesh errors."""


class LLMOutputError(HydroMeshError):
    """Raised when an LLM produces output violating expected schema or constraints."""


class SafetyViolation(HydroMeshError):
    """Raised when a proposed action violates deterministic safety invariants."""


class BlackboardError(HydroMeshError):
    """Raised when blackboard state is missing, corrupted, or inaccessible."""
