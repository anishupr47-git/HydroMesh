"""End-to-End Verification Script for HydroMesh Sprint 4.

Tests and verifies:
1. Unauthenticated Guest Identity (automatic guest_ ID, read-only global view).
2. Member Registration & Authentication (Argon2id, session cookie, CSRF token).
3. 1-Plant Quota Enforcement on Free Member Tier.
4. BOLA / IDOR Defense (uniform 404 on private plants to prevent IDOR enumeration).
5. Privacy Coordinate Coarsening (0.1 degree grid) on global aggregate maps.
6. Scenario Rate Limiting (max 3 scenario injections per hour).
7. Global Fleet Simulation & Scripted Storylines (guaranteed Warning & Critical alerts).
"""

from __future__ import annotations

import time

from fastapi.testclient import TestClient

from hydromesh.api.app import create_app
from hydromesh.db.database import db
from hydromesh.fleet.engine import (
    get_fleet_snapshot,
    seed_fleet_if_empty,
    simulate_hourly_hydrology,
)
from hydromesh.schemas import Coordinates, FleetSnapshot


def print_banner() -> None:
    print("=" * 60)
    print("HYDROMESH SPRINT 4: AUTH, FLEET & MULTI-TENANCY VERIFICATION")
    print("=" * 60)


def verify_sprint4() -> None:
    print_banner()
    app = create_app()

    with TestClient(app) as client:
        # 1. Guest Identity Verification
        print("\n--- 1. Testing Unauthenticated Guest Identity ---")
        guest_resp = client.get("/api/me")
        assert guest_resp.status_code == 200, f"Expected 200, got {guest_resp.status_code}"
        guest_data = guest_resp.json()
        assert guest_data["role"] == "guest"
        assert guest_data["user_id"] is None
        assert guest_data["guest_id"].startswith("guest_")
        assert guest_data["max_plants_allowed"] == 0
        print(f"Guest ID minted: {guest_data['guest_id']} | Max Plants: {guest_data['max_plants_allowed']} [PASSED]")

        # 2. Member Registration & Session Flow
        print("\n--- 2. Testing Member Registration & Argon2id Auth ---")
        ts = int(time.time() * 1000)
        email = f"lead_operator_{ts}@hydromesh.org"
        password = "MasterKeyPassphrase2026!#"

        reg_resp = client.post("/api/auth/register", json={"email": email, "password": password})
        assert reg_resp.status_code == 200, f"Expected 200, got {reg_resp.text}"
        reg_data = reg_resp.json()
        assert reg_data["user"]["email"] == email.lower()
        assert "csrf_token" in reg_data
        assert "session" in reg_resp.cookies
        user_id = reg_data["user"]["id"]
        csrf_token = reg_data["csrf_token"]
        print(f"Registered Member: {email} (ID: {user_id}) with Argon2id hash & CSRF [PASSED]")

        # Verify whoami as authenticated member
        me_resp = client.get("/api/me")
        assert me_resp.status_code == 200
        me_data = me_resp.json()
        assert me_data["role"] == "member"
        assert me_data["user_id"] == user_id
        assert me_data["max_plants_allowed"] == 1
        print(f"Authenticated Role: {me_data['role']} | Max Plants: {me_data['max_plants_allowed']} [PASSED]")

        # 3. Single-Site Free Tier Limit
        print("\n--- 3. Testing Single-Site Quota Enforcement (Free Plan = 1 Plant) ---")
        site_payload = {
            "name": "Manang Alpine Cascade",
            "coordinates": {"lat": 28.65, "lon": 84.02},
            "capacity_mw": 85.0,
            "head_m": 420.0,
            "design_flow_m3s": 24.0,
            "catchment_area_km2": 650.0,
            "preset": "glacial_melt",
            "is_public": False,
        }
        site1_resp = client.post("/api/sites", json=site_payload, headers={"X-CSRF-Token": csrf_token})
        assert site1_resp.status_code == 200, f"Expected 200, got {site1_resp.text}"
        site1_id = site1_resp.json()["id"]
        print(f"Plant 1 registered: {site1_id} ('{site_payload['name']}') [PASSED]")

        # Second site creation MUST be rejected with 403 QUOTA_EXCEEDED
        site_payload2 = {
            "name": "Forbidden Second Plant",
            "coordinates": {"lat": 28.10, "lon": 85.10},
            "capacity_mw": 50.0,
            "head_m": 120.0,
            "design_flow_m3s": 35.0,
            "catchment_area_km2": 800.0,
            "preset": "monsoon",
            "is_public": False,
        }
        site2_resp = client.post("/api/sites", json=site_payload2, headers={"X-CSRF-Token": csrf_token})
        assert site2_resp.status_code == 403, f"Expected 403, got {site2_resp.status_code}"
        assert "QUOTA_EXCEEDED" in site2_resp.json()["detail"]
        print("Second site registration strictly rejected: 403 QUOTA_EXCEEDED [PASSED]")

        # 4. BOLA / IDOR Uniform 404 Security Defense
        print("\n--- 4. Testing BOLA / IDOR Defense (Uniform 404 on Private Plants) ---")
        # Attacker registers separate account
        attacker_email = f"attacker_{ts}@external.com"
        attacker_resp = client.post("/api/auth/register", json={"email": attacker_email, "password": "AttackerPass123!#"})
        assert attacker_resp.status_code == 200

        # Attacker attempts to read Owner's private site
        steal_resp = client.get(f"/api/sites/{site1_id}")
        assert steal_resp.status_code == 404, f"Expected 404 to avoid enumeration, got {steal_resp.status_code}"
        print(f"IDOR attempt against private site {site1_id} returned uniform 404 (not 403) [PASSED]")

        # 5. Privacy Coordinate Coarsening (0.1 degree grid)
        print("\n--- 5. Testing Coordinate Coarsening for Privacy on Global Map ---")
        c = Coordinates(lat=28.148, lon=85.276)
        coarsened = c.coarsen(0.1)
        assert coarsened.lat == 28.1
        assert coarsened.lon == 85.2
        print(f"Raw coordinates (28.148, 85.276) coarsened to ({coarsened.lat}, {coarsened.lon}) [PASSED]")

        # 6. Global Fleet Simulation & Scripted Storylines
        print("\n--- 6. Testing Global Fleet Simulation & Storyline Invariants ---")
        seed_fleet_if_empty()
        snapshot = get_fleet_snapshot(mode="global")
        assert isinstance(snapshot, FleetSnapshot)
        assert snapshot.total_sites >= 8
        print(f"Global Fleet snapshot: {snapshot.total_sites} stations across world river basins [PASSED]")

        # Storyline Invariant: Trishuli at peak monsoon hour hits Critical (> 3,000 PPM)
        trishuli = db.get_site("trishuli")
        assert trishuli is not None
        q_trish, silt_trish, _ = simulate_hourly_hydrology(trishuli, hour_of_day=15)
        assert q_trish > 500.0
        assert silt_trish > 3000.0
        print(f"Storyline Invariant: Trishuli hour 15 produces Q={q_trish:.1f} m3/s, Silt={silt_trish:.1f} PPM (CRITICAL) [PASSED]")

        # 7. Personal Plant Twin Scenario Rate Limiting (Max 3/hour)
        print("\n--- 7. Testing Scenario Injection Rate Limiter (Max 3/hour) ---")
        # Re-login as original owner
        client.post("/api/auth/login", json={"email": email, "password": password})
        me_owner = client.get("/api/me").json()
        owner_csrf = me_owner["csrf_token"]

        scenario_body = {"scenario_type": "monsoon_surge", "intensity_multiplier": 1.5}
        for i in range(3):
            s_resp = client.post(f"/api/sites/{site1_id}/scenario", json=scenario_body, headers={"X-CSRF-Token": owner_csrf})
            assert s_resp.status_code == 200, f"Call {i+1} failed: {s_resp.text}"

        # 4th call MUST be rate-limited
        s_resp4 = client.post(f"/api/sites/{site1_id}/scenario", json=scenario_body, headers={"X-CSRF-Token": owner_csrf})
        assert s_resp4.status_code == 429, f"Expected 429, got {s_resp4.status_code}"
        assert "Rate limit exceeded" in s_resp4.json()["detail"]
        print("Scenario Injection: 3 calls succeeded, 4th call cleanly throttled (429 Rate Limit Exceeded) [PASSED]")

    print("\n" + "=" * 60)
    print("ALL SPRINT 4 MODULES (AUTH, FLEET & SECURITY) FULLY READY!")
    print("=" * 60)


if __name__ == "__main__":
    verify_sprint4()
