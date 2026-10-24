"""Unit tests for Hydrological Runoff Coupling and Live Ingestion."""

from __future__ import annotations

import math
from datetime import UTC, datetime

import pytest

from hydromesh.ingest.live import LiveIngestionEngine, calculate_runoff_discharge, silt_rating_curve
from hydromesh.schemas import HydroPlantSpec, Telemetry, WeatherObservation
from hydromesh.weather import get_plant_by_id


@pytest.fixture
def tamakoshi_spec() -> HydroPlantSpec:
    plant = get_plant_by_id("upper_tamakoshi")
    assert plant is not None
    return plant


def test_silt_rating_curve_benchmarks() -> None:
    """Assert quartz rating curve matches known physical calibration benchmarks."""
    # 0 flow has 0 sediment
    assert silt_rating_curve(0.0) == 0.0

    # ~340 m3/s produces ~300 PPM
    silt_340 = silt_rating_curve(340.0)
    assert 295.0 <= silt_340 <= 305.0

    # ~900 m3/s produces ~3200 PPM
    silt_900 = silt_rating_curve(900.0)
    assert 3150.0 <= silt_900 <= 3250.0


def test_calculate_runoff_discharge() -> None:
    """Assert rational runoff formula calculates discharge monotonically."""
    base_flow = 35.0
    area = 1745.0

    # Zero rainfall returns base flow
    q_zero = calculate_runoff_discharge(base_flow, 0.0, area)
    assert q_zero == base_flow

    # Positive rainfall increases discharge
    q_light = calculate_runoff_discharge(base_flow, 5.0, area, runoff_coeff=0.4, attenuation_factor=0.2)
    q_heavy = calculate_runoff_discharge(base_flow, 25.0, area, runoff_coeff=0.4, attenuation_factor=0.2)
    assert q_heavy > q_light > q_zero


def test_live_ingestion_engine_telemetry(tamakoshi_spec: HydroPlantSpec) -> None:
    """Assert LiveIngestionEngine produces valid frozen Telemetry instances."""
    engine = LiveIngestionEngine(tamakoshi_spec)

    obs = WeatherObservation(
        ts=datetime.now(UTC),
        latitude=tamakoshi_spec.latitude,
        longitude=tamakoshi_spec.longitude,
        precipitation_mm_h=15.0,
        temperature_c=10.0,
        cloud_cover_pct=80.0,
        hourly_precipitation_48h=(15.0,) * 48,
        is_live=True,
    )

    telem = engine.ingest(obs)
    assert isinstance(telem, Telemetry)
    assert telem.discharge_m3s > tamakoshi_spec.base_flow_m3s
    assert telem.silt_ppm > 0
    assert telem.vibration_mm_s >= 1.2
    assert telem.grid_freq_hz == 50.0
    assert telem.rainfall_mm_h == 15.0


def test_live_ingestion_rate_clamping(tamakoshi_spec: HydroPlantSpec) -> None:
    """Assert rate-of-change smoothing limits unphysical discharge spikes."""
    engine = LiveIngestionEngine(tamakoshi_spec, max_discharge_rate_m3s_per_s=5.0)

    obs_dry = WeatherObservation(
        ts=datetime.now(UTC),
        latitude=tamakoshi_spec.latitude,
        longitude=tamakoshi_spec.longitude,
        precipitation_mm_h=0.0,
        temperature_c=12.0,
        cloud_cover_pct=10.0,
        hourly_precipitation_48h=(0.0,) * 48,
        is_live=True,
    )
    t1 = engine.ingest(obs_dry, now_monotonic_s=100.0)

    # Sudden extreme flash deluge: 100 mm/h after only 1 second
    obs_flash = WeatherObservation(
        ts=datetime.now(UTC),
        latitude=tamakoshi_spec.latitude,
        longitude=tamakoshi_spec.longitude,
        precipitation_mm_h=100.0,
        temperature_c=12.0,
        cloud_cover_pct=100.0,
        hourly_precipitation_48h=(100.0,) * 48,
        is_live=True,
    )
    t2 = engine.ingest(obs_flash, now_monotonic_s=101.0)  # dt = 1.0s

    # Delta should be clamped to max_rate * dt = 5.0 m3/s
    assert math.isclose(t2.discharge_m3s - t1.discharge_m3s, 5.0, abs_tol=0.1)
