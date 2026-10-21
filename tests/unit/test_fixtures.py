"""Unit tests verifying conftest fixtures operate correctly."""

from __future__ import annotations

import fakeredis.aioredis
import httpx

from hydromesh.settings import Settings


def test_test_settings_fixture(test_settings: Settings) -> None:
    assert test_settings.env == "test"
    assert test_settings.debug is True
    assert test_settings.mock_mode is True


async def test_fake_redis_fixture(fake_redis: fakeredis.aioredis.FakeRedis) -> None:
    await fake_redis.set("hydromesh:test", "active")
    val = await fake_redis.get("hydromesh:test")
    assert val == "active"


async def test_async_client_fixture(async_client: httpx.AsyncClient) -> None:
    response = await async_client.get("/docs")
    assert response.status_code == 200
