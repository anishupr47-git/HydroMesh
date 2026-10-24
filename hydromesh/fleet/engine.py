"""Global Fleet Hourly Simulation & Scripted Storyline Engine.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Master Simulator for all 8 Global Demonstration Dams.
1. Planetary Diversity: Runs Himalayan monsoon dams, Alpine glacier melt stations,
   and tropical river cascades simultaneously.
2. Autonomous Background: Every hour, it advances river physics, calculates sand levels,
   and lets the multi-agent AI protect each plant.
3. Read-Only Global Showcase: Visitors can observe live traffic light warnings and
   safety checks from anywhere in the world without being able to disrupt the physical plants!
"""

from __future__ import annotations

import json
import math
from datetime import UTC, datetime
from pathlib import Path

from hydromesh.db.database import db
from hydromesh.ingest.live import silt_rating_curve
from hydromesh.logging import get_logger
from hydromesh.pipeline import OrchestrationPipeline
from hydromesh.schemas import (
    Coordinates,
    FleetSnapshot,
    HourRecord,
    HydroPlantSpec,
    Mode,
    Severity,
    Site,
    SiteSpecInput,
    SiteSummary,
    Telemetry,
    WeatherObservation,
)

log = get_logger(__name__)

FLEET_SEED_PATH = Path("data/fleet_seed.json")


def seed_fleet_if_empty() -> None:
    """Seed the database with landmark synthetic global stations if missing."""
    if not FLEET_SEED_PATH.is_file():
        log.warning("fleet_seed_missing", path=str(FLEET_SEED_PATH))
        return

    raw = json.loads(FLEET_SEED_PATH.read_text(encoding="utf-8"))
    seeded_count = 0
    for item in raw:
        site_id = item.get("id")
        if site_id and db.get_site(site_id):
            continue
        spec = SiteSpecInput(
            name=item["name"],
            coordinates=Coordinates(lat=item["latitude"], lon=item["longitude"]),
            capacity_mw=item["capacity_mw"],
            head_m=item["head_m"],
            design_flow_m3s=item["design_flow_m3s"],
            catchment_area_km2=item["catchment_area_km2"],
            preset=item.get("preset", "monsoon"),
            is_public=True,
        )
        db.create_site(spec, user_id=None, is_seeded=True, site_id=site_id)
        seeded_count += 1
    if seeded_count > 0:
        log.info("fleet_seeded_successfully", count=seeded_count)


def simulate_hourly_hydrology(site: Site, hour_of_day: int) -> tuple[float, float, float]:
    """Calculate synthetic discharge, silt PPM, and rainfall for a site based on preset and hour.

    Storyline Invariants:
    - Guaranteed >= 2 sites hit Watch/Warning daily.
    - Guaranteed 1 site hits Critical (Trishuli Chasm during monsoon surge).
    """
    preset = site.preset
    base_flow = site.design_flow_m3s * 0.70

    if preset == "monsoon":
        # Diurnal monsoon flood wave peaking in afternoon (14:00 - 18:00)
        diurnal = max(0.0, math.sin(math.pi * (hour_of_day - 6) / 14.0))
        if site.id.startswith("trishuli") or "trishuli" in site.name.lower():
            # Scripted critical storyline: silt exceeds 3,000 PPM
            rain = 55.0 * diurnal
            discharge = base_flow + 950.0 * diurnal
        else:
            # Scripted warning storyline: silt between 1,200 and 2,500 PPM
            rain = 25.0 * diurnal
            discharge = base_flow + 450.0 * diurnal
    elif preset == "glacial_melt":
        # Alpine/Andean diurnal melt peaking with solar radiation (12:00 - 16:00)
        diurnal = max(0.0, math.sin(math.pi * (hour_of_day - 8) / 10.0))
        rain = 5.0 * diurnal
        discharge = base_flow + 20.0 * diurnal
    else:  # rain_fed
        diurnal = max(0.0, math.sin(math.pi * hour_of_day / 24.0))
        rain = 15.0 * diurnal
        discharge = base_flow + 80.0 * diurnal

    silt_ppm = silt_rating_curve(discharge)
    return discharge, silt_ppm, rain


async def advance_hour(site: Site, hour_start_utc: datetime) -> HourRecord:
    """Step a fleet site through one full hour, invoking AI pipeline with AI Cost Shield."""
    hour_of_day = hour_start_utc.hour
    discharge, silt_ppm, rain = simulate_hourly_hydrology(site, hour_of_day)

    telemetry = Telemetry(
        ts=hour_start_utc,
        discharge_m3s=round(discharge, 2),
        silt_ppm=round(silt_ppm, 1),
        vibration_mm_s=round(1.2 + (silt_ppm / 3000.0) * 2.5, 2),
        grid_freq_hz=50.0,
        rainfall_mm_h=round(rain, 2),
    )

    # 4-Layer AI Cost Shield:
    # If Silt < 1,200 PPM, use fast deterministic classification with zero LLM calls
    if silt_ppm < 1200.0:
        alert_tier = Severity.NORMAL
        verdict = "approved"
    else:
        # High sediment: invoke multi-agent pipeline
        plant_spec = HydroPlantSpec(
            id=site.id,
            name=site.name,
            capacity_mw=site.capacity_mw,
            river_basin="Global",
            latitude=site.coordinates.lat,
            longitude=site.coordinates.lon,
            design_flow_m3s=site.design_flow_m3s,
            head_m=site.head_m,
            catchment_area_km2=site.catchment_area_km2,
        )
        pipeline = OrchestrationPipeline(plant=plant_spec)
        weather = WeatherObservation(
            ts=hour_start_utc,
            latitude=site.coordinates.lat,
            longitude=site.coordinates.lon,
            precipitation_mm_h=rain,
            temperature_c=10.0,
            cloud_cover_pct=80.0,
            hourly_precipitation_48h=(rain,) * 48,
            is_live=False,
        )
        incident = await pipeline.run_cycle(telemetry, weather)
        alert_tier = incident.anomaly.severity if incident.anomaly else Severity.WARNING
        verdict = incident.verdict.status if incident.verdict else "approved"

    record = HourRecord(
        site_id=site.id,
        hour_start_utc=hour_start_utc,
        discharge_m3s=round(discharge, 2),
        silt_ppm=round(silt_ppm, 1),
        alert_tier=alert_tier,
        safety_verdict=verdict,
    )

    db.record_hour(record)
    return record


def get_fleet_snapshot(mode: Mode = "global") -> FleetSnapshot:
    """Gather live summary of the entire global fleet."""
    seed_fleet_if_empty()
    summaries = db.list_global_sites()

    active_warnings = 0
    active_critical = 0
    enriched: list[SiteSummary] = []

    now_dt = datetime.now(UTC)
    current_hour = now_dt.hour

    for s in summaries:
        site_obj = db.get_site(s.id)
        if not site_obj:
            enriched.append(s)
            continue

        q, silt, _ = simulate_hourly_hydrology(site_obj, current_hour)
        if silt > 3000.0:
            tier = Severity.CRITICAL
            active_critical += 1
        elif silt >= 1200.0:
            tier = Severity.WARNING
            active_warnings += 1
        elif silt >= 800.0:
            tier = Severity.WATCH
        else:
            tier = Severity.NORMAL

        enriched.append(
            s.model_copy(
                update={
                    "alert_tier": tier,
                    "current_silt_ppm": round(silt, 1),
                    "current_discharge_m3s": round(q, 1),
                }
            )
        )

    return FleetSnapshot(
        timestamp=now_dt,
        mode=mode,
        total_sites=len(enriched),
        active_warnings=active_warnings,
        active_critical=active_critical,
        sites=tuple(enriched),
    )
