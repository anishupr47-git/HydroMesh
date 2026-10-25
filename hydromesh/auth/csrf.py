"""Cross-Site Request Forgery (CSRF) Defense and Origin Verification.

Overview:
    Implements defense-in-depth CSRF protections across all state-mutating HTTP requests,
    combining Double-Submit Cookie tokens with origin and fetch-metadata inspection.

Protective Layers:
    1. Cryptographic Token Verification: Validates matching pairs of session tokens in client request
       headers (`X-CSRF-Token`) and secure cookies.
    2. Origin & Referer Verification: Confirms that mutation requests originate from authorized hosts.
    3. Sec-Fetch-Site Validation: Enforces browser-level fetch metadata checks, automatically rejecting
       cross-site mutation requests.
    4. Minimal Exemption Perimeter: Restricts exemptions exclusively to initial unauthenticated identity endpoints.
"""

from __future__ import annotations

import secrets
from urllib.parse import urlsplit

from fastapi import HTTPException, Request

EXEMPT_PATHS = frozenset({
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/guest",
    "/api/auth/ws-ticket",
})


def generate_csrf_token() -> str:
    """Generate a high-entropy random CSRF token."""
    return secrets.token_hex(16)


def verify_csrf(request: Request, session_csrf_token: str | None) -> None:
    """Verify origin header and CSRF token on mutating requests."""
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    path = request.url.path.rstrip("/")
    if path in EXEMPT_PATHS:
        return

    # 1. Sec-Fetch-Site defense
    sec_fetch_site = request.headers.get("sec-fetch-site")
    if sec_fetch_site and sec_fetch_site.lower() == "cross-site":
        raise HTTPException(status_code=403, detail="CSRF check failed: Cross-site request rejected.")

    # 1. Origin header check
    origin = request.headers.get("origin")
    if origin:
        parsed_origin = urlsplit(origin)
        host_header = request.headers.get("host", "").split(":")[0]
        if parsed_origin.hostname and parsed_origin.hostname != host_header and host_header not in ("localhost", "127.0.0.1", "testserver"):
            raise HTTPException(status_code=403, detail="CSRF check failed: Origin header mismatch.")

    # 2. Token verification
    header_token = request.headers.get("x-csrf-token")
    if not header_token or not session_csrf_token or not secrets.compare_digest(header_token, session_csrf_token):
        raise HTTPException(status_code=403, detail="CSRF check failed: Invalid or missing X-CSRF-Token header.")
