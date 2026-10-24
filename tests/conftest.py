"""Pytest configuration and base fixtures."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import fakeredis.aioredis
import httpx
import pytest
from fastapi import FastAPI

from hydromesh.api.app import create_app
from hydromesh.settings import Settings


@pytest.fixture
def test_settings(tmp_path: Any) -> Settings:
    """Provide isolated test settings with deterministic parameters."""
    return Settings(
        env="test",
        debug=True,
        mock_mode=True,
        redis_url="redis://localhost:6379/15",
        chroma_persist_dir=str(tmp_path / "chroma_test"),
        llm_model="qwen2.5:7b-instruct",
        llm_temperature=0.0,
    )


@pytest.fixture
def app() -> FastAPI:
    """Instantiate a fresh FastAPI app for integration testing."""
    return create_app()


@pytest.fixture
async def async_client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    """Yield an async HTTP test client bound to the FastAPI ASGI app."""
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


@pytest.fixture
async def fake_redis() -> AsyncIterator[fakeredis.aioredis.FakeRedis]:
    """Provide an in-memory asynchronous Redis client for Blackboard testing."""
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    try:
        yield client
    finally:
        await client.flushall()
        await client.aclose()
