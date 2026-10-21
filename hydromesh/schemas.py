"""Single source of truth for all HydroMesh data types."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class HydroMeshBaseModel(BaseModel):
    """Base frozen model for all HydroMesh schemas."""

    model_config = ConfigDict(frozen=True, extra="forbid")
