"""Skeleton tests verifying package import and initial factory."""

from __future__ import annotations

import hydromesh
from hydromesh.api.app import create_app
from hydromesh.settings import Settings


def test_package_import() -> None:
    assert hydromesh.__version__ == "0.1.0"


def test_settings_instantiation() -> None:
    settings = Settings()
    assert settings.llm_model == "qwen2.5:7b-instruct"


def test_create_app() -> None:
    app = create_app()
    assert app.title == "HydroMesh API"
