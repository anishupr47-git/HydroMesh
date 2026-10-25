"""Sprint 2 Core Auth & State Integrity Tests.

Covers:
- SEC-08: Fix session timestamp monotonic clock leak in persistent storage.
- SEC-09: LRU-bounded nonce cache for replay protection.
"""

from __future__ import annotations

import time
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from hydromesh.api.app import create_app
from hydromesh.api.routes import NonceCache, _processed_nonces
from hydromesh.auth.sessions import SessionRecord
from hydromesh.db.database import db


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


# ==============================================================================
# SEC-08: Monotonic Clock Session Persistence Fix Tests
# ==============================================================================

def test_session_persistence_uses_utc_wall_clock() -> None:
    """Assert session created_at and last_active_at are stored as UTC wall-clock epoch timestamps."""
    before = time.time()
    session = db.create_session(
        user_id="usr_test_wall_clock",
        token_hash="hash_token_test_12345",
        role="member",
        ua_hash="ua_hash_test",
        csrf_token="csrf_token_test",
    )
    after = time.time()

    assert before <= session.created_at_s <= after
    assert before <= session.last_active_at_s <= after
    # Wall clock epoch in 2026 is > 1.7e9; monotonic clock is typically < 1e6
    assert session.created_at_s > 1_700_000_000

    # Fetch from SQLite and assert persistence preserved wall-clock timestamp
    persisted = db.get_session("hash_token_test_12345")
    assert persisted is not None
    rec, csrf = persisted
    assert before <= rec.created_at_s <= after
    assert before <= rec.last_active_at_s <= after
    assert csrf == "csrf_token_test"

    # Touch session and verify last_active_at updates to current wall clock
    time.sleep(0.01)
    db.touch_session(session.session_id)
    touched_rec, _ = db.get_session("hash_token_test_12345")  # type: ignore[misc]
    assert touched_rec.last_active_at_s > session.last_active_at_s

    # Clean up
    db.delete_session("hash_token_test_12345")


def test_session_expiration_deterministic_across_simulated_reboot() -> None:
    """Assert session validity behaves deterministically across time progression (simulated host reboot)."""
    base_time = 1_770_000_000.0  # Simulated wall-clock timestamp

    rec = SessionRecord(
        session_id="ses_reboot_test",
        user_id="usr_001",
        token_hash="hash_001",
        role="member",
        created_at_s=base_time,
        last_active_at_s=base_time,
        user_agent_hash="ua_001",
    )

    # 1. Immediately after creation: active
    assert rec.is_expired(now_s=base_time) is False

    # 2. 10 minutes later: active
    assert rec.is_expired(now_s=base_time + 600.0) is False

    # 3. 31 minutes idle: expired by idle timeout (IDLE_TIMEOUT_S = 1800)
    assert rec.is_expired(now_s=base_time + 1801.0) is True

    # 4. If touched periodically, expires after 12h absolute limit (ABSOLUTE_TIMEOUT_S = 43200)
    touched_rec = SessionRecord(
        session_id="ses_reboot_test",
        user_id="usr_001",
        token_hash="hash_001",
        role="member",
        created_at_s=base_time,
        last_active_at_s=base_time + 43100.0,  # Active 100s ago
        user_agent_hash="ua_001",
    )
    # Still under 12 hours: valid
    assert touched_rec.is_expired(now_s=base_time + 43150.0) is False
    # Exceeded 12 hours absolute limit: expired
    assert touched_rec.is_expired(now_s=base_time + 43201.0) is True


# ==============================================================================
# SEC-09: LRU-Bounded Nonce Cache Tests
# ==============================================================================

def test_nonce_cache_lru_bounding() -> None:
    """Assert NonceCache caps size at maxsize and evicts least recently used nonces."""
    cache = NonceCache(maxsize=10, ttl_s=300.0)

    # Insert 10 nonces
    for i in range(10):
        cache.put(f"nonce_{i}", {"index": i})
    assert len(cache) == 10
    assert "nonce_0" in cache

    # Access nonce_0 to make it recently used
    assert cache.get("nonce_0") == {"index": 0}

    # Insert 11th nonce -> should evict nonce_1 (oldest unaccessed)
    cache.put("nonce_10", {"index": 10})
    assert len(cache) == 10
    assert "nonce_0" in cache  # Preserved because accessed
    assert "nonce_1" not in cache  # Evicted
    assert "nonce_10" in cache


def test_nonce_cache_ttl_expiration() -> None:
    """Assert NonceCache evicts nonces older than ttl_s."""
    cache = NonceCache(maxsize=100, ttl_s=0.05)  # 50ms TTL

    cache.put("expiring_nonce", {"status": "ok"})
    assert "expiring_nonce" in cache

    # Wait for TTL to expire (accounting for Windows ~15.6ms clock quantum)
    time.sleep(0.08)
    assert "expiring_nonce" not in cache
    assert cache.get("expiring_nonce") is None
    assert len(cache) == 0


def test_operator_override_replay_idempotency(client: TestClient) -> None:
    """Assert operator override endpoint rejects duplicate nonces with duplicate_idempotent."""
    _processed_nonces.clear()

    nonce = f"unique_nonce_{int(time.time()*1000)}"
    payload = {
        "action_id": "act_flow_gate_open",
        "operator_id": "operator_ramesh",
        "override_choice": "approve",
        "nonce": nonce,
        "reason": "Monsoon floodgate release clearance",
    }

    # 1. First execution succeeds
    resp1 = client.post("/api/override", json=payload)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["status"] == "success"

    # 2. Replay with exact same nonce returns duplicate_idempotent
    resp2 = client.post("/api/override", json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["status"] == "duplicate_idempotent"
    assert "already evaluated" in data2["message"]
    assert data2["record"]["nonce"] == nonce
