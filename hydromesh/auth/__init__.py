"""HydroMesh Authentication & Authorization Module."""

from __future__ import annotations

from typing import Any

__all__ = [
    "Principal",
    "current_principal",
    "require_admin",
    "require_member",
    "require_site_access",
]


def __getattr__(name: str) -> Any:
    if name in __all__:
        import hydromesh.auth.deps as deps

        return getattr(deps, name)
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
