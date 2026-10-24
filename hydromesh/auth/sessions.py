"""Session Lifecycle, Opaque Tokens, & Guest Identity Minting.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Visitor Badge Machine and Wristband Dispenser.
1. Instant Guest Wristband: When you visit the site without an account, you get
   a unique, anonymous Guest Badge (e.g. `guest_3f9b2a...`). You can look at the whole
   world map of dams right away without filling out any forms!
2. Member Badge (256-Bit Key): When you log in, you receive an unguessable 256-bit
   security token. Only the hashed fingerprint is saved in the database.
3. Auto-Lock: If you step away from your desk for 30 minutes (idle timeout) or
   after 12 hours (absolute timeout), the badge expires to keep your plant safe.
"""

from __future__ import annotations

import hashlib
import secrets
import time
from dataclasses import dataclass
from typing import Literal

from hydromesh.logging import get_logger

log = get_logger(__name__)

IDLE_TIMEOUT_S = 1800.0  # 30 minutes
ABSOLUTE_TIMEOUT_S = 43200.0  # 12 hours

UserRole = Literal["guest", "member", "admin"]


def mint_guest_id() -> str:
    """Auto-mint a random 16-hex unique guest identifier."""
    return f"guest_{secrets.token_hex(8)}"


def generate_opaque_token() -> str:
    """Generate a high-entropy 256-bit URL-safe session token."""
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    """Compute SHA-256 digest of token for safe storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def hash_user_agent(ua_string: str) -> str:
    """Compute fingerprint of user-agent string."""
    return hashlib.sha256(ua_string.encode("utf-8")).hexdigest()[:16]


@dataclass(frozen=True, slots=True)
class SessionRecord:
    session_id: str
    user_id: str
    token_hash: str
    role: UserRole
    created_at_s: float
    last_active_at_s: float
    user_agent_hash: str

    def is_expired(self, now_s: float | None = None) -> bool:
        """Check if session exceeded idle timeout (30m) or absolute timeout (12h)."""
        now = now_s if now_s is not None else time.monotonic()
        if now - self.last_active_at_s > IDLE_TIMEOUT_S:
            return True
        return now - self.created_at_s > ABSOLUTE_TIMEOUT_S
