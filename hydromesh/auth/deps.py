"""Authentication & Authorization Dependencies (current_principal, require_member).

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Gatekeeper and Security Scanner at the door.
1. Auto-Badge: If you have a logged-in cookie, it recognizes your member badge.
   If not, it politely gives you a temporary Guest ID (`guest_...`).
2. Private Dam Protection (Anti-BOLA): You can only see and control your own registered
   dam. If someone tries to guess other people's plant IDs, our computer says "Site Not Found"
   (uniform 404) so attackers can't even tell if the other plant exists!
3. Free Plan Watchdog: Guarantees free accounts can only ever have 1 plant.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request

from hydromesh.auth.sessions import UserRole, hash_token, mint_guest_id
from hydromesh.db.database import db
from hydromesh.schemas import Site


@dataclass(frozen=True, slots=True)
class Principal:
    user_id: str | None
    email: str | None
    role: UserRole
    guest_id: str | None
    session_id: str | None
    csrf_token: str | None

    @property
    def is_guest(self) -> bool:
        return self.role == "guest"

    @property
    def is_member(self) -> bool:
        return self.role in ("member", "admin")

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


async def current_principal(request: Request) -> Principal:
    """Resolve current principal from session token, falling back to auto-minted guest ID."""
    token = request.cookies.get("__Host-session") or request.cookies.get("session")
    if not token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

    if token:
        token_hash = hash_token(token)
        session_data = db.get_session(token_hash)
        if session_data:
            rec, csrf = session_data
            if not rec.is_expired():
                db.touch_session(rec.session_id)
                user = db.get_user_by_id(rec.user_id)
                email = user["email"] if user else None
                return Principal(
                    user_id=rec.user_id,
                    email=email,
                    role=rec.role,
                    guest_id=None,
                    session_id=rec.session_id,
                    csrf_token=csrf,
                )

    # Fallback to guest
    guest_id = request.cookies.get("__Host-guest_id") or request.cookies.get("guest_id") or mint_guest_id()
    return Principal(
        user_id=None,
        email=None,
        role="guest",
        guest_id=guest_id,
        session_id=None,
        csrf_token=None,
    )


def require_member(principal: Principal = Depends(current_principal)) -> Principal:
    """Enforce member or admin authentication."""
    if principal.is_guest:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to access your registered plant.",
        )
    return principal


def require_admin(principal: Principal = Depends(current_principal)) -> Principal:
    """Enforce admin-only access."""
    if not principal.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden: Administrator privileges required.")
    return principal


def require_site_access(site: Site | None, principal: Principal, *, write: bool = False) -> None:
    """Enforce uniform 404 (not 403) on unauthorized or non-existent sites to mitigate BOLA enumeration."""
    if site is None:
        raise HTTPException(status_code=404, detail="Hydropower plant not found.")

    if principal.is_admin:
        return

    if write:
        # Only the owner can write/modify/delete
        if site.user_id != principal.user_id:
            raise HTTPException(status_code=404, detail="Hydropower plant not found.")
    else:
        # Seeded sites and public sites can be read by anyone
        if site.is_seeded or site.is_public:
            return
        # Private user site: only owner can read
        if site.user_id != principal.user_id:
            raise HTTPException(status_code=404, detail="Hydropower plant not found.")
