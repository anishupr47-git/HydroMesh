"""SQLite WAL Database & Multi-Tenant Site Repository.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Dam's Permanent Filing Cabinet and Registry.
1. Fast & Unbreakable (WAL Mode): Uses Write-Ahead Logging so multiple readers
   can read instantly without locking each other out.
2. Strict Free Plan Quota: Enforces the rule that free member accounts can register
   strictly 1 hydropower plant.
3. Clean Storage: Keeps users, sessions, sites, and hourly history safely organized.
"""

from __future__ import annotations

import sqlite3
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from hydromesh.auth.sessions import SessionRecord, UserRole
from hydromesh.logging import get_logger
from hydromesh.schemas import Coordinates, HourRecord, Site, SiteSpecInput, SiteSummary

log = get_logger(__name__)

DEFAULT_DB_PATH = Path("data/hydromesh.db")

SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    created_at REAL NOT NULL,
    last_active_at REAL NOT NULL,
    user_agent_hash TEXT NOT NULL,
    csrf_token TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    capacity_mw REAL NOT NULL,
    head_m REAL NOT NULL,
    design_flow_m3s REAL NOT NULL,
    catchment_area_km2 REAL NOT NULL,
    preset TEXT NOT NULL DEFAULT 'monsoon',
    is_seeded INTEGER NOT NULL DEFAULT 0,
    is_public INTEGER NOT NULL DEFAULT 0,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS hour_records (
    site_id TEXT NOT NULL,
    hour_start_utc TEXT NOT NULL,
    discharge_m3s REAL NOT NULL,
    silt_ppm REAL NOT NULL,
    alert_tier TEXT NOT NULL,
    safety_verdict TEXT NOT NULL,
    PRIMARY KEY (site_id, hour_start_utc)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_or_guest_id TEXT PRIMARY KEY,
    selected_site_id TEXT,
    units TEXT DEFAULT 'metric',
    map_lat REAL DEFAULT 28.0,
    map_lon REAL DEFAULT 84.5,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS ws_tickets (
    ticket TEXT PRIMARY KEY,
    principal_id TEXT NOT NULL,
    expires_at REAL NOT NULL
);
"""


class Database:
    """Thread-safe SQLite repository layer with WAL concurrency and quota enforcement."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH) -> None:
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.executescript(SCHEMA_SQL)

    # --- Users -------------------------------------------------------------------------
    def create_user(self, email: str, password_hash: str, role: UserRole = "member") -> dict[str, Any]:
        user_id = f"usr_{uuid4().hex[:12]}"
        now = time.time()
        try:
            with self._get_connection() as conn:
                conn.execute(
                    "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
                    (user_id, email.lower().strip(), password_hash, role, now),
                )
            return {"id": user_id, "email": email.lower().strip(), "role": role, "created_at": now}
        except sqlite3.IntegrityError as exc:
            raise ValueError(f"Email '{email}' is already registered.") from exc

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),)).fetchone()
            return dict(row) if row else None

    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            return dict(row) if row else None

    def change_password(self, user_id: str, new_password_hash: str) -> None:
        with self._get_connection() as conn:
            conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_password_hash, user_id))

    def grant_admin(self, email: str) -> bool:
        with self._get_connection() as conn:
            cur = conn.execute("UPDATE users SET role = 'admin' WHERE email = ?", (email.lower().strip(),))
            return cur.rowcount > 0

    # --- Sessions ----------------------------------------------------------------------
    def create_session(
        self,
        user_id: str,
        token_hash: str,
        role: UserRole,
        ua_hash: str,
        csrf_token: str,
    ) -> SessionRecord:
        session_id = f"ses_{uuid4().hex[:12]}"
        now = time.monotonic()
        with self._get_connection() as conn:
            conn.execute(
                """INSERT INTO sessions 
                   (session_id, user_id, token_hash, role, created_at, last_active_at, user_agent_hash, csrf_token)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (session_id, user_id, token_hash, role, now, now, ua_hash, csrf_token),
            )
        return SessionRecord(
            session_id=session_id,
            user_id=user_id,
            token_hash=token_hash,
            role=role,
            created_at_s=now,
            last_active_at_s=now,
            user_agent_hash=ua_hash,
        )

    def get_session(self, token_hash: str) -> tuple[SessionRecord, str] | None:
        """Fetch session and CSRF token by session token hash."""
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM sessions WHERE token_hash = ?", (token_hash,)).fetchone()
            if not row:
                return None
            rec = SessionRecord(
                session_id=row["session_id"],
                user_id=row["user_id"],
                token_hash=row["token_hash"],
                role=row["role"],
                created_at_s=row["created_at"],
                last_active_at_s=row["last_active_at"],
                user_agent_hash=row["user_agent_hash"],
            )
            return rec, row["csrf_token"]

    def touch_session(self, session_id: str) -> None:
        with self._get_connection() as conn:
            conn.execute("UPDATE sessions SET last_active_at = ? WHERE session_id = ?", (time.monotonic(), session_id))

    def delete_session(self, token_hash: str) -> None:
        with self._get_connection() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))

    def delete_all_user_sessions(self, user_id: str) -> None:
        with self._get_connection() as conn:
            conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))

    def create_site(
        self,
        spec: SiteSpecInput,
        user_id: str | None = None,
        *,
        is_seeded: bool = False,
        site_id: str | None = None,
    ) -> Site:
        """Create a site, strictly enforcing the 1-site quota for free members."""
        with self._get_connection() as conn:
            if user_id and not is_seeded:
                # Check user role and current site count
                user_row = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
                role = user_row["role"] if user_row else "member"

                if role != "admin":
                    count_row = conn.execute("SELECT count(*) as cnt FROM sites WHERE user_id = ?", (user_id,)).fetchone()
                    if count_row and count_row["cnt"] >= 1:
                        raise ValueError("QUOTA_EXCEEDED: Free plan is strictly limited to 1 registered plant.")

            actual_id = site_id or (f"site_{uuid4().hex[:10]}" if not is_seeded else f"seed_{uuid4().hex[:8]}")
            now_dt = datetime.now(UTC)
            conn.execute(
                """INSERT OR REPLACE INTO sites 
                   (id, user_id, name, latitude, longitude, capacity_mw, head_m, 
                    design_flow_m3s, catchment_area_km2, preset, is_seeded, is_public, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    actual_id,
                    user_id,
                    spec.name,
                    spec.coordinates.lat,
                    spec.coordinates.lon,
                    spec.capacity_mw,
                    spec.head_m,
                    spec.design_flow_m3s,
                    spec.catchment_area_km2,
                    spec.preset,
                    1 if is_seeded else 0,
                    1 if spec.is_public else 0,
                    now_dt.timestamp(),
                ),
            )

        return Site(
            id=actual_id,
            user_id=user_id,
            name=spec.name,
            coordinates=spec.coordinates,
            capacity_mw=spec.capacity_mw,
            head_m=spec.head_m,
            design_flow_m3s=spec.design_flow_m3s,
            catchment_area_km2=spec.catchment_area_km2,
            preset=spec.preset,
            is_seeded=is_seeded,
            is_public=spec.is_public,
            created_at=now_dt,
        )

    def get_site(self, site_id: str) -> Site | None:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM sites WHERE id = ?", (site_id,)).fetchone()
            if not row:
                return None
            return Site(
                id=row["id"],
                user_id=row["user_id"],
                name=row["name"],
                coordinates=Coordinates(lat=row["latitude"], lon=row["longitude"]),
                capacity_mw=row["capacity_mw"],
                head_m=row["head_m"],
                design_flow_m3s=row["design_flow_m3s"],
                catchment_area_km2=row["catchment_area_km2"],
                preset=row["preset"],
                is_seeded=bool(row["is_seeded"]),
                is_public=bool(row["is_public"]),
                created_at=datetime.fromtimestamp(row["created_at"], tz=UTC),
            )

    def list_user_sites(self, user_id: str) -> list[Site]:
        with self._get_connection() as conn:
            rows = conn.execute("SELECT * FROM sites WHERE user_id = ?", (user_id,)).fetchall()
            return [
                Site(
                    id=r["id"],
                    user_id=r["user_id"],
                    name=r["name"],
                    coordinates=Coordinates(lat=r["latitude"], lon=r["longitude"]),
                    capacity_mw=r["capacity_mw"],
                    head_m=r["head_m"],
                    design_flow_m3s=r["design_flow_m3s"],
                    catchment_area_km2=r["catchment_area_km2"],
                    preset=r["preset"],
                    is_seeded=bool(r["is_seeded"]),
                    is_public=bool(r["is_public"]),
                    created_at=datetime.fromtimestamp(r["created_at"], tz=UTC),
                )
                for r in rows
            ]

    def list_global_sites(self) -> list[SiteSummary]:
        """List global fleet sites: seeded sites + public user sites with coarsened coordinates."""
        with self._get_connection() as conn:
            rows = conn.execute("SELECT * FROM sites WHERE is_seeded = 1 OR is_public = 1").fetchall()
            summaries: list[SiteSummary] = []
            for r in rows:
                coords = Coordinates(lat=r["latitude"], lon=r["longitude"])
                # Privacy protection: coarsen coordinates for user-owned public sites
                if not r["is_seeded"]:
                    coords = coords.coarsen(0.1)

                summaries.append(
                    SiteSummary(
                        id=r["id"],
                        name=r["name"],
                        coordinates=coords,
                        capacity_mw=r["capacity_mw"],
                        preset=r["preset"],
                        is_seeded=bool(r["is_seeded"]),
                        is_public=bool(r["is_public"]),
                    )
                )
            return summaries

    def delete_site(self, site_id: str, user_id: str | None = None) -> bool:
        with self._get_connection() as conn:
            if user_id:
                cur = conn.execute("DELETE FROM sites WHERE id = ? AND user_id = ?", (site_id, user_id))
            else:
                cur = conn.execute("DELETE FROM sites WHERE id = ?", (site_id,))
            return cur.rowcount > 0

    # --- Hour Records ------------------------------------------------------------------
    def record_hour(self, record: HourRecord) -> None:
        """Insert or replace an hourly simulation record (idempotent execution)."""
        with self._get_connection() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO hour_records 
                   (site_id, hour_start_utc, discharge_m3s, silt_ppm, alert_tier, safety_verdict)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    record.site_id,
                    record.hour_start_utc.isoformat(),
                    record.discharge_m3s,
                    record.silt_ppm,
                    record.alert_tier.value,
                    record.safety_verdict,
                ),
            )

    def get_hour_records(self, site_id: str, limit: int = 24) -> list[dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM hour_records WHERE site_id = ? ORDER BY hour_start_utc DESC LIMIT ?",
                (site_id, limit),
            ).fetchall()
            return [dict(r) for r in rows]

    # --- Preferences -------------------------------------------------------------------
    def set_preferences(self, user_or_guest_id: str, prefs: dict[str, Any]) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO user_preferences 
                   (user_or_guest_id, selected_site_id, units, map_lat, map_lon, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    user_or_guest_id,
                    prefs.get("selected_site_id"),
                    prefs.get("units", "metric"),
                    float(prefs.get("map_lat", 28.0)),
                    float(prefs.get("map_lon", 84.5)),
                    time.time(),
                ),
            )

    def get_preferences(self, user_or_guest_id: str) -> dict[str, Any]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM user_preferences WHERE user_or_guest_id = ?", (user_or_guest_id,)).fetchone()
            if not row:
                return {"user_or_guest_id": user_or_guest_id, "units": "metric", "map_lat": 28.0, "map_lon": 84.5}
            return dict(row)

    # --- WS Tickets --------------------------------------------------------------------
    def create_ws_ticket(self, principal_id: str, valid_s: float = 30.0) -> str:
        ticket = f"wst_{uuid4().hex}"
        expires_at = time.time() + valid_s
        with self._get_connection() as conn:
            conn.execute("INSERT INTO ws_tickets (ticket, principal_id, expires_at) VALUES (?, ?, ?)", (ticket, principal_id, expires_at))
        return ticket

    def consume_ws_ticket(self, ticket: str) -> str | None:
        now = time.time()
        with self._get_connection() as conn:
            row = conn.execute("SELECT principal_id, expires_at FROM ws_tickets WHERE ticket = ?", (ticket,)).fetchone()
            if not row or row["expires_at"] < now:
                return None
            conn.execute("DELETE FROM ws_tickets WHERE ticket = ?", (ticket,))
            return str(row["principal_id"])


# Global database instance
db = Database()
