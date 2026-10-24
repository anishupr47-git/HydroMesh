"""Authentication, Registration, and Session Management API Routes.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Member Registration & Login Desk.
1. Instant Sign-Up: Register in seconds with just your email and password.
2. Safe Badges: Issues security session tokens and anti-forgery (CSRF) tokens.
3. Safe Logout: Completely wipes your active sessions whenever you log out.
4. Preference Memory: Remembers your favorite map view whether you are a guest or member.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from hydromesh.auth.crypto import hash_password, validate_password_strength, verify_dummy_timing, verify_password
from hydromesh.auth.csrf import generate_csrf_token
from hydromesh.auth.deps import Principal, current_principal, require_member
from hydromesh.auth.sessions import generate_opaque_token, hash_token, hash_user_agent
from hydromesh.db.database import db
from hydromesh.logging import get_logger

log = get_logger(__name__)

auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

EmailType = Annotated[str, Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=254)]


class RegisterRequest(BaseModel):
    email: EmailType
    password: str = Field(min_length=12, max_length=128)


class LoginRequest(BaseModel):
    email: EmailType
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=12, max_length=128)


def _set_session_cookie(response: Response, raw_token: str) -> None:
    # Use standard cookie name with secure parameters
    response.set_cookie(
        key="session",
        value=raw_token,
        httponly=True,
        samesite="lax",
        max_age=43200,  # 12 hours
        path="/",
    )


@auth_router.post("/register")
def register(req: RegisterRequest, response: Response, request: Request) -> dict[str, Any]:
    """Register a new member account and issue an authenticated session."""
    try:
        validate_password_strength(req.password)
        pw_hash = hash_password(req.password)
        user = db.create_user(req.email, pw_hash, role="member")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    raw_token = generate_opaque_token()
    token_h = hash_token(raw_token)
    csrf = generate_csrf_token()
    ua_hash = hash_user_agent(request.headers.get("user-agent", ""))

    db.create_session(
        user_id=user["id"],
        token_hash=token_h,
        role="member",
        ua_hash=ua_hash,
        csrf_token=csrf,
    )
    _set_session_cookie(response, raw_token)

    return {
        "status": "success",
        "user": {"id": user["id"], "email": user["email"], "role": user["role"]},
        "csrf_token": csrf,
    }


@auth_router.post("/login")
def login(req: LoginRequest, response: Response, request: Request) -> dict[str, Any]:
    """Authenticate member or admin with timing-equalized account enumeration defense."""
    user = db.get_user_by_email(req.email)
    if not user:
        # Timing-neutral dummy probe
        verify_dummy_timing()
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    raw_token = generate_opaque_token()
    token_h = hash_token(raw_token)
    csrf = generate_csrf_token()
    ua_hash = hash_user_agent(request.headers.get("user-agent", ""))

    db.create_session(
        user_id=user["id"],
        token_hash=token_h,
        role=user["role"],
        ua_hash=ua_hash,
        csrf_token=csrf,
    )
    _set_session_cookie(response, raw_token)

    return {
        "status": "success",
        "user": {"id": user["id"], "email": user["email"], "role": user["role"]},
        "csrf_token": csrf,
    }


@auth_router.post("/logout")
def logout(request: Request, response: Response, principal: Principal = Depends(current_principal)) -> dict[str, str]:
    """Terminate the active session."""
    token = request.cookies.get("session")
    if token:
        db.delete_session(hash_token(token))
    response.delete_cookie("session", path="/")
    return {"status": "success", "message": "Logged out successfully."}


@auth_router.post("/logout-all")
def logout_all(response: Response, principal: Principal = Depends(require_member)) -> dict[str, str]:
    """Terminate all active sessions for the current user."""
    if principal.user_id:
        db.delete_all_user_sessions(principal.user_id)
    response.delete_cookie("session", path="/")
    return {"status": "success", "message": "All sessions terminated."}


me_router = APIRouter(prefix="/api", tags=["Identity"])


@me_router.get("/me")
@auth_router.get("/me")
def get_me(principal: Principal = Depends(current_principal)) -> dict[str, Any]:
    """Return identity and account tier details for the current user or guest."""
    prefs = db.get_preferences(principal.user_id or principal.guest_id or "default")
    return {
        "role": principal.role,
        "user_id": principal.user_id,
        "email": principal.email,
        "guest_id": principal.guest_id,
        "csrf_token": principal.csrf_token,
        "preferences": prefs,
        "tier": "free_member" if principal.is_member else "guest",
        "max_plants_allowed": 1 if principal.is_member else 0,
    }


@me_router.put("/me/preferences")
@auth_router.put("/me/preferences")
def update_preferences(
    prefs: dict[str, Any],
    principal: Principal = Depends(current_principal),
) -> dict[str, Any]:
    """Persist user or guest UI preferences (selected plant, units, map center)."""
    identity = principal.user_id or principal.guest_id or "default"
    db.set_preferences(identity, prefs)
    return {"status": "success", "preferences": db.get_preferences(identity)}


@auth_router.post("/ws-ticket")
def mint_ws_ticket(principal: Principal = Depends(current_principal)) -> dict[str, Any]:
    """Issue a 30-second single-use ticket for authenticated WebSocket connections."""
    identity = principal.user_id or principal.guest_id or "guest_anonymous"
    ticket = db.create_ws_ticket(identity, valid_s=30.0)
    return {"ticket": ticket, "expires_in_s": 30}


@auth_router.post("/password/change")
def change_password(
    req: ChangePasswordRequest,
    principal: Principal = Depends(require_member),
) -> dict[str, str]:
    """Change member account password."""
    user = db.get_user_by_id(principal.user_id or "")
    if not user or not verify_password(req.old_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    validate_password_strength(req.new_password)
    new_hash = hash_password(req.new_password)
    db.change_password(user["id"], new_hash)
    return {"status": "success", "message": "Password changed successfully."}
