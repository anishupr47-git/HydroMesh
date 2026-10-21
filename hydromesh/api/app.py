"""FastAPI application factory for HydroMesh."""

from __future__ import annotations

from fastapi import FastAPI


def create_app() -> FastAPI:
    """Create and configure the HydroMesh FastAPI application."""
    app = FastAPI(
        title="HydroMesh API",
        version="0.1.0",
        description="HydroMesh Digital Twin & Hydropower Plant Operations API",
    )

    @app.get("/health")
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    return app
