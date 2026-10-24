"""Cross-Site Request Forgery (CSRF) Defense & Origin Verification.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Anti-Counterfeit Stamp on all control room orders.
1. Origin Verification: When an action request arrives, it checks that the message
   actually came directly from our website and not a sneaky third-party link.
2. Anti-Counterfeit Stamp: It verifies a double-check token for all changes
   (like registering a plant or toggling a switch) so other tabs in your browser
   can never spoof orders.
"""

from __future__ import annotations

import secrets
from urllib.parse import urlsplit

from fastapi import HTTPException, Request

EXEMPT_PATHS = frozenset({
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/ws-ticket",
    "/api/v1/orchestrate/run",
})


def generate_csrf_token() -> str:
    """Generate a high-entropy random CSRF token."""
    return secrets.token_hex(16)


def verify_csrf(request: Request, session_csrf_token: str | None) -> None:
    """Verify origin header and CSRF token on mutating requests."""
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    path = request.url.path
    if path in EXEMPT_PATHS:
        return

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
