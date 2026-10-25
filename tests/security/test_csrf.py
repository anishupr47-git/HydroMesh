"""Comprehensive CSRF (Cross-Site Request Forgery) Defense Test Suite.

Covers:
- SEC-10: Exclusion of /api/v1/orchestrate/run from CSRF exemptions.
- SEC-14: Comprehensive CSRF validation, Origin header checks, Sec-Fetch-Site rules, and token matching.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException, Request

from hydromesh.auth.csrf import EXEMPT_PATHS, generate_csrf_token, verify_csrf


# ==============================================================================
# Token Generation & Exemption List Tests
# ==============================================================================

def test_generate_csrf_token_entropy() -> None:
    """CSRF token should be a high-entropy 32-character hexadecimal string."""
    token1 = generate_csrf_token()
    token2 = generate_csrf_token()
    assert len(token1) == 32
    assert len(token2) == 32
    assert token1 != token2
    int(token1, 16)  # Asserts valid hex


def test_exempt_paths_least_privilege() -> None:
    """Ensure EXEMPT_PATHS contains only strictly required unauthenticated endpoints."""
    assert "/api/v1/orchestrate/run" not in EXEMPT_PATHS
    assert "/api/auth/login" in EXEMPT_PATHS
    assert "/api/auth/register" in EXEMPT_PATHS
    assert "/api/auth/guest" in EXEMPT_PATHS
    assert "/api/auth/ws-ticket" in EXEMPT_PATHS
    assert len(EXEMPT_PATHS) == 4


# ==============================================================================
# Method & Path Bypass Tests
# ==============================================================================

@pytest.mark.parametrize("method", ["GET", "HEAD", "OPTIONS"])
def test_safe_http_methods_bypass_csrf(method: str) -> None:
    """Safe read-only HTTP methods should immediately bypass CSRF checks."""
    req = MagicMock(spec=Request)
    req.method = method
    # Should not raise even with None token
    verify_csrf(req, session_csrf_token=None)


@pytest.mark.parametrize("exempt_path", [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/guest",
    "/api/auth/ws-ticket",
    "/api/auth/login/",
])
def test_exempt_paths_bypass_csrf_on_post(exempt_path: str) -> None:
    """Exempt mutation endpoints must bypass CSRF checks on POST."""
    req = MagicMock(spec=Request)
    req.method = "POST"
    req.url = MagicMock()
    req.url.path = exempt_path
    # Should not raise even without token
    verify_csrf(req, session_csrf_token=None)


# ==============================================================================
# Token Verification Tests
# ==============================================================================

def test_valid_csrf_token_match_passes() -> None:
    """Matching X-CSRF-Token and session token should pass validation."""
    valid_token = generate_csrf_token()
    req = MagicMock(spec=Request)
    req.method = "POST"
    req.url = MagicMock()
    req.url.path = "/api/sites"
    req.headers = {
        "x-csrf-token": valid_token,
        "host": "localhost:8000",
    }

    # Does not raise
    verify_csrf(req, session_csrf_token=valid_token)


def test_missing_csrf_token_header_rejected() -> None:
    """Missing X-CSRF-Token header on non-exempt mutating request raises 403."""
    session_token = generate_csrf_token()
    req = MagicMock(spec=Request)
    req.method = "POST"
    req.url = MagicMock()
    req.url.path = "/api/sites"
    req.headers = {"host": "localhost:8000"}

    with pytest.raises(HTTPException) as exc:
        verify_csrf(req, session_csrf_token=session_token)
    assert exc.value.status_code == 403
    assert "Invalid or missing X-CSRF-Token" in exc.value.detail


def test_missing_session_csrf_token_rejected() -> None:
    """Request with header token but missing session token raises 403."""
    req = MagicMock(spec=Request)
    req.method = "POST"
    req.url = MagicMock()
    req.url.path = "/api/sites"
    req.headers = {
        "x-csrf-token": generate_csrf_token(),
        "host": "localhost:8000",
    }

    with pytest.raises(HTTPException) as exc:
        verify_csrf(req, session_csrf_token=None)
    assert exc.value.status_code == 403


def test_mismatched_csrf_token_rejected() -> None:
    """Tampered or mismatched X-CSRF-Token header raises 403."""
    session_token = generate_csrf_token()
    tampered_token = generate_csrf_token()

    req = MagicMock(spec=Request)
    req.method = "POST"
    req.url = MagicMock()
    req.url.path = "/api/sites"
    req.headers = {
        "x-csrf-token": tampered_token,
        "host": "localhost:8000",
    }

    with pytest.raises(HTTPException) as exc:
        verify_csrf(req, session_csrf_token=session_token)
    assert exc.value.status_code == 403
    assert "Invalid or missing X-CSRF-Token" in exc.value.detail


# ==============================================================================
# Sec-Fetch-Site & Origin Verification Tests
# ==============================================================================

def test_sec_fetch_site_cross_site_rejected() -> None:
    """Sec-Fetch-Site: cross-site requests must be rejected unconditionally."""
    token = generate_csrf_token()
    req = MagicMock(spec=Request)
    req.method = "POST"
    req.url = MagicMock()
    req.url.path = "/api/sites"
    req.headers = {
        "sec-fetch-site": "cross-site",
        "x-csrf-token": token,
        "host": "hydromesh.app",
    }

    with pytest.raises(HTTPException) as exc:
        verify_csrf(req, session_csrf_token=token)
    assert exc.value.status_code == 403
    assert "Cross-site request rejected" in exc.value.detail


def test_origin_header_mismatch_rejected() -> None:
    """Origin host mismatching the Host header in production must be rejected."""
    token = generate_csrf_token()
    req = MagicMock(spec=Request)
    req.method = "POST"
    req.url = MagicMock()
    req.url.path = "/api/override"
    req.headers = {
        "origin": "https://malicious.evil.com",
        "host": "api.hydromesh.app:443",
        "x-csrf-token": token,
    }

    with pytest.raises(HTTPException) as exc:
        verify_csrf(req, session_csrf_token=token)
    assert exc.value.status_code == 403
    assert "Origin header mismatch" in exc.value.detail


def test_origin_header_matching_passes() -> None:
    """Origin host matching the Host header passes validation."""
    token = generate_csrf_token()
    req = MagicMock(spec=Request)
    req.method = "POST"
    req.url = MagicMock()
    req.url.path = "/api/override"
    req.headers = {
        "origin": "https://hydromesh.app",
        "host": "hydromesh.app",
        "x-csrf-token": token,
    }

    # Should not raise
    verify_csrf(req, session_csrf_token=token)


def test_orchestrate_run_post_requires_csrf() -> None:
    """POST /api/v1/orchestrate/run must require CSRF validation (not exempt)."""
    req = MagicMock(spec=Request)
    req.method = "POST"
    req.url = MagicMock()
    req.url.path = "/api/v1/orchestrate/run"
    req.headers = {"host": "localhost:8000"}

    with pytest.raises(HTTPException) as exc:
        verify_csrf(req, session_csrf_token=None)
    assert exc.value.status_code == 403
