"""Sprint 1 Perimeter & Gateway Security Tests.

Covers:
- SEC-01: Restrict CORS Wildcard with Credentials
- SEC-02: Per-Endpoint Auth Rate Limiting on Login, Register & Guest
- SEC-03: RFC 6585 Retry-After Header on 429 Responses
- SEC-04: Per-IP and Global WebSocket Connection Caps
"""

from __future__ import annotations

import os
from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import WebSocketDisconnect
from fastapi.testclient import TestClient

from hydromesh.api.app import (
    _auth_rate_limits,
    _rate_limits,
    create_app,
    get_allowed_origins,
    reset_rate_limits,
)
from hydromesh.api.stream import StreamManager, stream_manager


@pytest.fixture(autouse=True)
def clean_rate_limits() -> Generator[None, None, None]:
    """Ensure rate limit state is pristine before and after each test."""
    reset_rate_limits()
    yield
    reset_rate_limits()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


# ==============================================================================
# SEC-01: CORS Whitelist and Header Restrictions
# ==============================================================================

def test_cors_allowed_origin(client: TestClient) -> None:
    """Allowed origins should receive Access-Control-Allow-Origin and credentials."""
    resp = client.get("/api/me", headers={"Origin": "http://localhost:3000"})
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert resp.headers.get("access-control-allow-credentials") == "true"


def test_cors_allowed_production_origin(client: TestClient) -> None:
    """Production hydromesh.app origin should be accepted."""
    resp = client.get("/api/me", headers={"Origin": "https://hydromesh.app"})
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "https://hydromesh.app"


def test_cors_rejected_malicious_origin(client: TestClient) -> None:
    """Untrusted external origins must NOT receive Access-Control-Allow-Origin."""
    resp = client.get("/api/me", headers={"Origin": "https://malicious.evil.com"})
    assert resp.status_code == 200
    # Starlette CORSMiddleware omits access-control-allow-origin when origin is disallowed
    assert resp.headers.get("access-control-allow-origin") != "https://malicious.evil.com"
    assert resp.headers.get("access-control-allow-origin") != "*"


def test_cors_env_override(monkeypatch: pytest.MonkeyPatch) -> None:
    """Custom HYDROMESH_ALLOWED_ORIGINS environment variable takes effect."""
    monkeypatch.setenv("HYDROMESH_ALLOWED_ORIGINS", "https://staging.hydromesh.internal, https://partner.grid.gov.np")
    origins = get_allowed_origins()
    assert "https://staging.hydromesh.internal" in origins
    assert "https://partner.grid.gov.np" in origins
    assert len(origins) == 2


# ==============================================================================
# SEC-02 & SEC-03: Per-Endpoint Auth Rate Limiting & RFC 6585 Retry-After Header
# ==============================================================================

def test_auth_rate_limiting_login(client: TestClient) -> None:
    """Assert login endpoint enforces 10 attempts per 5 minutes per IP with Retry-After header."""
    reset_rate_limits()

    # 10 attempts allowed
    for _ in range(10):
        resp = client.post("/api/auth/login", json={"email": "operator@test.org", "password": "WrongPassword123!"})
        assert resp.status_code in (400, 401)
        assert resp.status_code != 429

    # 11th attempt must be rejected with 429
    resp_11 = client.post("/api/auth/login", json={"email": "operator@test.org", "password": "WrongPassword123!"})
    assert resp_11.status_code == 429
    assert "Retry-After" in resp_11.headers
    retry_after = int(resp_11.headers["Retry-After"])
    assert retry_after > 0
    data = resp_11.json()
    assert "Rate limit exceeded" in data["detail"]
    assert data["retry_after"] == retry_after


def test_auth_rate_limiting_register(client: TestClient) -> None:
    """Assert register endpoint enforces 5 attempts per 15 minutes with Retry-After."""
    reset_rate_limits()

    # 5 attempts allowed
    for i in range(5):
        resp = client.post(
            "/api/auth/register",
            json={"email": f"new_operator_{i}@test.org", "password": "Weak"},
        )
        assert resp.status_code in (400, 422)  # Fails validation but counts toward attempts
        assert resp.status_code != 429

    # 6th attempt must be rate-limited
    resp_6 = client.post(
        "/api/auth/register",
        json={"email": "new_operator_6@test.org", "password": "Weak"},
    )
    assert resp_6.status_code == 429
    assert "Retry-After" in resp_6.headers
    assert int(resp_6.headers["Retry-After"]) > 0


def test_auth_rate_limiting_guest(client: TestClient) -> None:
    """Assert guest session endpoint enforces 10 attempts per 10 minutes with Retry-After."""
    reset_rate_limits()

    for _ in range(10):
        resp = client.post("/api/auth/guest")
        assert resp.status_code == 200

    # 11th attempt rejected
    resp_11 = client.post("/api/auth/guest")
    assert resp_11.status_code == 429
    assert "Retry-After" in resp_11.headers
    assert int(resp_11.headers["Retry-After"]) > 0


def test_global_rate_limit_retry_after(client: TestClient) -> None:
    """Assert global rate limit response includes RFC 6585 Retry-After header."""
    import time
    reset_rate_limits()

    # Inject 120 current timestamps into global limiter for client IP
    now = time.monotonic()
    _rate_limits["testclient"] = [now] * 120

    resp = client.get("/api/me")
    assert resp.status_code == 429
    assert "Retry-After" in resp.headers
    assert int(resp.headers["Retry-After"]) > 0


# ==============================================================================
# SEC-04: WebSocket Connection Caps
# ==============================================================================

@pytest.mark.asyncio
async def test_stream_manager_per_ip_cap() -> None:
    """Assert StreamManager rejects 11th connection from the same IP with code 1013."""
    mgr = StreamManager()
    await mgr.reset()

    # Create 10 mock WebSocket clients from same IP
    active_sockets: list[MagicMock] = []
    for _ in range(10):
        ws = MagicMock()
        ws.client = MagicMock()
        ws.client.host = "192.168.1.50"
        ws.accept = AsyncMock()
        ws.close = AsyncMock()

        accepted = await mgr.connect(ws)
        assert accepted is True
        active_sockets.append(ws)

    assert mgr.count == 10
    assert mgr.active_connections_for_ip("192.168.1.50") == 10

    # 11th connection from the same IP
    ws_11 = MagicMock()
    ws_11.client = MagicMock()
    ws_11.client.host = "192.168.1.50"
    ws_11.accept = AsyncMock()
    ws_11.close = AsyncMock()

    accepted_11 = await mgr.connect(ws_11)
    assert accepted_11 is False
    ws_11.close.assert_awaited_once_with(code=1013, reason="Per-IP WebSocket connection limit reached")
    assert mgr.count == 10

    # Disconnect one client, then verify a new connection can connect
    await mgr.disconnect(active_sockets[0])
    assert mgr.count == 9
    assert mgr.active_connections_for_ip("192.168.1.50") == 9

    accepted_again = await mgr.connect(ws_11)
    assert accepted_again is True
    assert mgr.count == 10


@pytest.mark.asyncio
async def test_stream_manager_global_cap() -> None:
    """Assert StreamManager rejects connections once global connection cap is reached."""
    mgr = StreamManager()
    await mgr.reset()
    mgr.MAX_CONNECTIONS_TOTAL = 5  # Lower total limit for test

    for i in range(5):
        ws = MagicMock()
        ws.client = MagicMock()
        ws.client.host = f"10.0.0.{i+1}"
        ws.accept = AsyncMock()
        ws.close = AsyncMock()
        accepted = await mgr.connect(ws)
        assert accepted is True

    # 6th connection from a new IP
    ws_overflow = MagicMock()
    ws_overflow.client = MagicMock()
    ws_overflow.client.host = "10.0.0.99"
    ws_overflow.accept = AsyncMock()
    ws_overflow.close = AsyncMock()

    accepted_overflow = await mgr.connect(ws_overflow)
    assert accepted_overflow is False
    ws_overflow.close.assert_awaited_once_with(code=1013, reason="Global WebSocket connection limit reached")
    assert mgr.count == 5


def test_fastapi_websocket_per_ip_rejection(client: TestClient) -> None:
    """Verify live FastAPI /ws/stream endpoint rejects connections exceeding per-IP limit."""
    # Reset stream manager
    import asyncio
    asyncio.run(stream_manager.reset())

    stream_manager.MAX_CONNECTIONS_PER_IP = 3  # Lower for fast test

    try:
        # Establish 3 connections using TestClient
        with client.websocket_connect("/ws/stream") as ws1:
            with client.websocket_connect("/ws/stream") as ws2:
                with client.websocket_connect("/ws/stream") as ws3:
                    # 4th connection must be rejected with 1013
                    with pytest.raises(WebSocketDisconnect) as exc_info:
                        with client.websocket_connect("/ws/stream") as ws4:
                            ws4.receive_text()
                    assert exc_info.value.code == 1013
    finally:
        # Restore standard cap and reset
        stream_manager.MAX_CONNECTIONS_PER_IP = 10
        asyncio.run(stream_manager.reset())
