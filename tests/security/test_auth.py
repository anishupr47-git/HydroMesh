"""Security test suite for Authentication, Argon2id, Session Lifecycle, and Timing Neutrality."""

from __future__ import annotations

import time
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from hydromesh.api.app import create_app
from hydromesh.auth.crypto import (
    hash_password,
    validate_password_strength,
    verify_dummy_timing,
    verify_password,
)
from hydromesh.db.database import db


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as client:
        yield client


def test_password_policy_and_argon2() -> None:
    """Assert password length, common password dictionary, and Argon2id verification."""
    # Too short (< 12 chars)
    with pytest.raises(ValueError, match="at least 12 characters"):
        validate_password_strength("short_pass")

    # Common password dictionary
    with pytest.raises(ValueError, match="too common"):
        validate_password_strength("password123456")

    # Valid strong passphrase
    valid_pw = "HimalayanGlacierSafe2026!"
    validate_password_strength(valid_pw)

    pw_hash = hash_password(valid_pw)
    assert verify_password(valid_pw, pw_hash) is True
    assert verify_password("wrong_password_1234!", pw_hash) is False


def test_timing_neutral_dummy_verification() -> None:
    """Assert verify_dummy_timing executes without exceptions."""
    verify_dummy_timing()


def test_auth_registration_and_login_flow(client: TestClient) -> None:
    """Assert full registration, login, session cookie, and logout flow."""
    email = f"operator_{int(time.time()*1000)}@hydromesh.org"
    password = "StrongPassphrase2026!#"

    # 1. Registration
    reg_resp = client.post("/api/auth/register", json={"email": email, "password": password})
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert reg_data["user"]["email"] == email.lower()
    assert "csrf_token" in reg_data
    assert "session" in reg_resp.cookies

    # 2. Get Me (Authenticated)
    me_resp = client.get("/api/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["role"] == "member"
    assert me_resp.json()["max_plants_allowed"] == 1

    # 3. Logout
    logout_resp = client.post("/api/auth/logout")
    assert logout_resp.status_code == 200

    # 4. Login
    login_resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login_resp.status_code == 200
    assert "session" in login_resp.cookies

    # 5. Invalid password login fails
    bad_login = client.post("/api/auth/login", json={"email": email, "password": "WrongPassword123!"})
    assert bad_login.status_code == 401

    # 6. Unknown email login fails (timing equalized)
    unknown_login = client.post("/api/auth/login", json={"email": "non_existent_user@hydromesh.org", "password": password})
    assert unknown_login.status_code == 401


def test_unauthenticated_guest_identity(client: TestClient) -> None:
    """Assert unauthenticated visitors automatically receive a unique Guest ID."""
    resp = client.get("/api/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "guest"
    assert data["user_id"] is None
    assert data["guest_id"].startswith("guest_")
    assert data["max_plants_allowed"] == 0


def test_ws_ticket_minting(client: TestClient) -> None:
    """Assert /api/auth/ws-ticket issues 30-second single-use ticket."""
    resp = client.post("/api/auth/ws-ticket")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ticket"].startswith("wst_")
    assert data["expires_in_s"] == 30

    # Assert ticket is single-use and consumed
    principal_id = db.consume_ws_ticket(data["ticket"])
    assert principal_id is not None

    # Second consumption fails
    assert db.consume_ws_ticket(data["ticket"]) is None
