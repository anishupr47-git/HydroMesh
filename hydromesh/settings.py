"""HydroMesh runtime settings and configuration."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings placeholder for HydroMesh."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = "development"
    debug: bool = False
    mock_mode: bool = False

    ollama_host: str = "http://localhost:11434"
    llm_model: str = "qwen2.5:7b-instruct"
    llm_temperature: float = 0.0
    llm_timeout_s: int = 30
    llm_max_retries: int = 2

    redis_url: str = "redis://localhost:6379/0"
    chroma_path: str = ".chroma"
    chroma_persist_dir: str = ".chroma"

    twin_seed: int = 42
    predict_every_n_ticks: int = 6
    override_window_s: int = 600

    auto_confidence_threshold: float = 0.80
    max_flow_reduction_pct: float = 0.50
    min_baseload_pct: float = 0.20
    max_actions_per_10min: int = 3
    flush_cooldown_mins: int = 60

    rating_curve_a: float = 0.45
    rating_curve_b: float = 1.8

    severity_watch: float = 0.35
    severity_warning: float = 0.60
    severity_critical: float = 0.85
