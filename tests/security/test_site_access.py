"""Security test suite for Broken Object Level Authorization (BOLA/IDOR) & Privacy Protection."""

from __future__ import annotations

import time
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from hydromesh.api.app import create_app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app = create_app()
    with TestClient(app) as client:
        yield client


def test_bola_uniform_404_protection(client: TestClient) -> None:
    """Assert unauthorized requests to private sites return uniform 404 (not 403) to prevent IDOR enumeration."""
    # 1. User A registers private site
    email_a = f"owner_a_{int(time.time()*1000)}@hydromesh.org"
    client.post("/api/auth/register", json={"email": email_a, "password": "OwnerSecretPass123!"})

    site_payload = {
        "name": "User A Private Dam",
        "coordinates": {"lat": 28.18, "lon": 85.32},
        "capacity_mw": 60.0,
        "head_m": 130.0,
        "design_flow_m3s": 35.0,
        "catchment_area_km2": 1600.0,
        "preset": "monsoon",
        "is_public": False,
    }
    create_res = client.post("/api/sites", json=site_payload)
    assert create_res.status_code == 200
    site_id_a = create_res.json()["id"]

    # 2. User B logs in
    client.post("/api/auth/logout")
    email_b = f"intruder_b_{int(time.time()*1000)}@hydromesh.org"
    client.post("/api/auth/register", json={"email": email_b, "password": "IntruderPassphrase123!"})

    # User B tries to view User A's private plant -> UNIFORM 404 (Not 403)
    get_res = client.get(f"/api/sites/{site_id_a}")
    assert get_res.status_code == 404

    # User B tries to delete User A's private plant -> UNIFORM 404
    del_res = client.delete(f"/api/sites/{site_id_a}")
    assert del_res.status_code == 404

    # 3. Unauthenticated guest attempts access -> UNIFORM 404
    client.post("/api/auth/logout")
    guest_res = client.get(f"/api/sites/{site_id_a}")
    assert guest_res.status_code == 404


def test_global_fleet_coordinate_coarsening_for_privacy(client: TestClient) -> None:
    """Assert user-owned public plants have their coordinates coarsened on the Global map."""
    email = f"coarsen_user_{int(time.time()*1000)}@hydromesh.org"
    client.post("/api/auth/register", json={"email": email, "password": "CoarsenCoordinatePass123!"})

    # Exact high-precision coordinates: 28.18734, 85.32481
    user_plant = {
        "name": "Coarsened User Plant",
        "coordinates": {"lat": 28.18734, "lon": 85.32481},
        "capacity_mw": 50.0,
        "head_m": 120.0,
        "design_flow_m3s": 30.0,
        "catchment_area_km2": 1100.0,
        "preset": "monsoon",
        "is_public": True,  # User opted to share on global map
    }
    client.post("/api/sites", json=user_plant)

    # Inspect Global fleet snapshot
    fleet_res = client.get("/api/global/fleet")
    assert fleet_res.status_code == 200
    fleet_data = fleet_res.json()

    user_summary = next((s for s in fleet_data["sites"] if s["name"] == "Coarsened User Plant"), None)
    assert user_summary is not None
    # Assert coordinates were coarsened to step 0.1 for privacy (e.g. 28.1, 85.3)
    assert user_summary["coordinates"]["lat"] == 28.1
    assert user_summary["coordinates"]["lon"] == 85.3
