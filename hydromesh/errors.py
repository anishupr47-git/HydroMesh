"""Typed exceptions. Catch these; never a bare `Exception`."""

from __future__ import annotations


class HydroMeshError(Exception):
    """Base class for every expected, recoverable failure."""


class LLMError(HydroMeshError):
    """Any LLM failure that the caller recovers from with a deterministic fallback."""


class LLMUnavailable(LLMError):
    """Backend unreachable, timed out, or the circuit breaker is open."""


class LLMOutputError(LLMError):
    """Backend answered, but never with schema-valid JSON."""


class BlackboardError(HydroMeshError):
    """Raised when blackboard state is missing, corrupted, or inaccessible."""
