"""Unit and integration tests for Global Fleet Simulation, Hydrology Presets, and Storylines."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from hydromesh.db.database import db
from hydromesh.fleet.engine import (
    advance_hour,
    get_fleet_snapshot,
    seed_fleet_if_empty,
    simulate_hourly_hydrology,
)
from hydromesh.schemas import Coordinates, FleetSnapshot, HourRecord, Site


@pytest.fixture
def seeded_site() -> Site:
    seed_fleet_if_empty()
    site = db.get_site("trishuli")
    assert site is not None
    return site


def test_seed_fleet_idempotency() -> None:
    """Assert seed_fleet_if_empty creates the 8 synthetic global sites idempotently."""
    seed_fleet_if_empty()
    sites = db.list_global_sites()
    assert len(sites) >= 8

    # Second invocation is a no-op
    seed_fleet_if_empty()
    assert len(db.list_global_sites()) == len(sites)


def test_storyline_hydrology_presets(seeded_site: Site) -> None:
    """Assert scripted storylines guarantee warning and critical alerts."""
    # 1. Trishuli Chasm at peak monsoon hour (15:00 UTC) produces critical sediment (> 3000 PPM)
    q_trishuli, silt_trishuli, _ = simulate_hourly_hydrology(seeded_site, hour_of_day=15)
    assert q_trishuli > 500.0
    assert silt_trishuli > 3000.0  # Guaranteed Critical storyline

    # 2. Glacial melt station (Alpine/Andean)
    alpine_site = Site(
        id="alpine_test",
        name="Alpine Test Station",
        coordinates=Coordinates(lat=46.5, lon=8.0),
        capacity_mw=100.0,
        head_m=500.0,
        design_flow_m3s=30.0,
        catchment_area_km2=600.0,
        preset="glacial_melt",
        is_seeded=True,
        created_at=datetime.now(UTC),
    )
    q_alpine, silt_alpine, _ = simulate_hourly_hydrology(alpine_site, hour_of_day=14)
    assert q_alpine > alpine_site.design_flow_m3s * 0.70
    assert silt_alpine > 0.0


@pytest.mark.asyncio
async def test_advance_hour_execution_and_idempotency(seeded_site: Site) -> None:
    """Assert advance_hour steps simulation and handles duplicate hours idempotently."""
    hour_t = datetime(2026, 10, 24, 14, 0, tzinfo=UTC)

    # 1. First execution
    rec1 = await advance_hour(seeded_site, hour_t)
    assert isinstance(rec1, HourRecord)
    assert rec1.site_id == seeded_site.id
    assert rec1.silt_ppm > 0

    # 2. Duplicate hour execution replaces record cleanly (idempotent unique constraint)
    rec2 = await advance_hour(seeded_site, hour_t)
    assert rec2.site_id == rec1.site_id

    records = db.get_hour_records(seeded_site.id)
    assert len([r for r in records if r["hour_start_utc"] == hour_t.isoformat()]) == 1


def test_get_fleet_snapshot() -> None:
    """Assert get_fleet_snapshot aggregates global fleet with active warning/critical counts."""
    snapshot = get_fleet_snapshot(mode="global")
    assert isinstance(snapshot, FleetSnapshot)
    assert snapshot.mode == "global"
    assert snapshot.total_sites >= 8
    assert len(snapshot.sites) == snapshot.total_sites
