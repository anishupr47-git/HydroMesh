"""Unit tests for Thread-Safe Blackboard State Store."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import pytest

from hydromesh.blackboard import Blackboard
from hydromesh.schemas import Severity, Telemetry


@pytest.fixture
def sample_telemetry() -> Telemetry:
    return Telemetry(
        ts=datetime.now(UTC),
        discharge_m3s=65.0,
        silt_ppm=420.0,
        vibration_mm_s=1.35,
        grid_freq_hz=50.02,
        rainfall_mm_h=2.5,
    )


@pytest.mark.asyncio
async def test_blackboard_telemetry_lifecycle(sample_telemetry: Telemetry) -> None:
    """Assert telemetry write, latest read, and history retrieval."""
    bb = Blackboard(max_history=10)

    # Empty initially
    assert await bb.get_telemetry("upper_tamakoshi") is None
    assert await bb.get_telemetry_history("upper_tamakoshi") == ()

    # Update telemetry
    await bb.update_telemetry("upper_tamakoshi", sample_telemetry)
    latest = await bb.get_telemetry("upper_tamakoshi")
    assert latest == sample_telemetry

    history = await bb.get_telemetry_history("upper_tamakoshi")
    assert len(history) == 1
    assert history[0] == sample_telemetry


@pytest.mark.asyncio
async def test_blackboard_ring_buffer_capacity(sample_telemetry: Telemetry) -> None:
    """Assert history maintains max_history bounds."""
    bb = Blackboard(max_history=3)

    for i in range(7):
        t = sample_telemetry.model_copy(update={"discharge_m3s": 50.0 + i})
        await bb.update_telemetry("upper_tamakoshi", t)

    hist = await bb.get_telemetry_history("upper_tamakoshi")
    assert len(hist) == 3
    # Kept the 3 most recent: 54, 55, 56
    assert hist[0].discharge_m3s == 54.0
    assert hist[1].discharge_m3s == 55.0
    assert hist[2].discharge_m3s == 56.0


@pytest.mark.asyncio
async def test_blackboard_alert_tiers() -> None:
    """Assert alert tiers set and default correctly."""
    bb = Blackboard()

    assert await bb.get_alert_tier("kali_gandaki_a") == "normal"
    await bb.set_alert_tier("kali_gandaki_a", Severity.WARNING)
    assert await bb.get_alert_tier("kali_gandaki_a") == "warning"

    await bb.set_alert_tier("kali_gandaki_a", "critical")
    assert await bb.get_alert_tier("kali_gandaki_a") == "critical"


@pytest.mark.asyncio
async def test_blackboard_audit_trail() -> None:
    """Assert audit events record and filter cleanly."""
    bb = Blackboard()

    await bb.record_audit_event("gate_adjusted", "upper_tamakoshi", {"gate_id": 0, "flow": 28.0})
    await bb.record_audit_event("flush_started", "kali_gandaki_a", {"basin_id": 1, "duration": 30})

    all_logs = await bb.get_audit_trail()
    assert len(all_logs) == 2

    tamakoshi_logs = await bb.get_audit_trail(plant_id="upper_tamakoshi")
    assert len(tamakoshi_logs) == 1
    assert tamakoshi_logs[0]["event_type"] == "gate_adjusted"


@pytest.mark.asyncio
async def test_blackboard_concurrent_stress(sample_telemetry: Telemetry) -> None:
    """Assert thread-safety under 50 simultaneous concurrent writers."""
    bb = Blackboard(max_history=100)

    async def worker(worker_id: int) -> None:
        t = sample_telemetry.model_copy(update={"discharge_m3s": 10.0 + worker_id})
        await bb.update_telemetry("stress_plant", t)
        await bb.record_audit_event("worker_tick", "stress_plant", {"id": worker_id})

    tasks = [worker(i) for i in range(50)]
    await asyncio.gather(*tasks)

    hist = await bb.get_telemetry_history("stress_plant", limit=100)
    assert len(hist) == 50

    logs = await bb.get_audit_trail("stress_plant", limit=100)
    assert len(logs) == 50


@pytest.mark.asyncio
async def test_blackboard_incidents_and_summary(sample_telemetry: Telemetry) -> None:
    """Assert incident recording, lookup, listing, and plant summary."""
    from hydromesh.schemas import Incident

    bb = Blackboard()
    now = datetime.now(UTC)
    inc = Incident(id="INC-2026-001", opened_at=now, telemetry=sample_telemetry)

    await bb.record_incident(inc)
    fetched = await bb.get_incident("INC-2026-001")
    assert fetched is not None
    assert fetched.id == "INC-2026-001"

    missing = await bb.get_incident("INC-NONEXISTENT")
    assert missing is None

    inc_list = await bb.list_incidents()
    assert len(inc_list) == 1
    assert inc_list[0].id == "INC-2026-001"

    # Test plant summary
    await bb.update_telemetry("upper_tamakoshi", sample_telemetry)
    await bb.set_alert_tier("upper_tamakoshi", Severity.WATCH)
    summary = await bb.plant_summary("upper_tamakoshi")
    assert summary["plant_id"] == "upper_tamakoshi"
    assert summary["alert_tier"] == "watch"
    assert summary["history_points"] == 1
    assert summary["latest_telemetry"] is not None
