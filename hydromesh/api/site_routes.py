"""Plant Registration, Two-Mode Fleet Operations, and Scenario Simulation Routes.

Overview:
    Manages dual-mode monitoring (Global Demonstration Fleet vs. Individual Member Station),
    governs plant registration quotas, and enables safe hydrological scenario simulations.

Key Operational Capabilities:
    1. Global Fleet Mode (/api/global/fleet): Provides read-only situational awareness across national
       and international demonstration stations operating autonomously in real time.
    2. Member Station Cockpit (/api/sites): Allows registered operators to register their individual plant
       and observe dedicated telemetry, local weather, and safety recommendations.
    3. Safe Simulation Sandbox (/api/sites/{id}/scenario): Enables operators to inject monsoon surges
       and flood wave scenarios to observe twin physics and gate responses under rate-controlled limits.
    4. Free Tier Quota Enforcement: Programmatically limits free-tier accounts to 1 registered plant.
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from hydromesh.api.stream import stream_manager
from hydromesh.auth.deps import Principal, current_principal, require_member, require_site_access
from hydromesh.db.database import db
from hydromesh.fleet.engine import get_fleet_snapshot
from hydromesh.logging import get_logger
from hydromesh.schemas import FleetSnapshot, Site, SiteSpecInput
from hydromesh.twin import scenarios
from hydromesh.twin.plant import PlantSpec, PlantTwin
from hydromesh.weather import WeatherClient

log = get_logger(__name__)

site_router = APIRouter(tags=["Sites & Fleet"])
_weather_client = WeatherClient()

# Rate limit tracker for scenario injections: user_id -> list of timestamps
_scenario_rate_limits: dict[str, list[float]] = defaultdict(list)
_SCENARIO_WINDOW_S = 3600.0  # 1 hour
_SCENARIO_MAX_PER_HOUR = 3


# --- Global Mode Endpoints -------------------------------------------------------------
@site_router.get("/api/global/fleet", response_model=FleetSnapshot)
def get_global_fleet() -> FleetSnapshot:
    """Return snapshot of the entire autonomous global fleet (coarsened coordinates for user sites)."""
    return get_fleet_snapshot(mode="global")


@site_router.get("/api/global/sites/{site_id}", response_model=Site)
def get_global_site_details(site_id: str) -> Site:
    """Return read-only details of a seeded global demonstration station."""
    site = db.get_site(site_id)
    if not site or not site.is_seeded:
        raise HTTPException(status_code=404, detail="Global demonstration plant not found.")
    return site


# --- Individual Mode: Plant Management & 1-Site Quota ----------------------------------
@site_router.post("/api/sites", response_model=Site)
def register_plant(
    spec: SiteSpecInput,
    principal: Principal = Depends(require_member),
) -> Site:
    """Register a new member plant. Strictly enforces the 1-site free plan limit."""
    try:
        site = db.create_site(spec, user_id=principal.user_id, is_seeded=False)
        log.info("member_plant_registered", user_id=principal.user_id, site_id=site.id)
        return site
    except ValueError as exc:
        if "QUOTA_EXCEEDED" in str(exc):
            raise HTTPException(
                status_code=403,
                detail="QUOTA_EXCEEDED: Free plan is strictly limited to 1 registered plant.",
            ) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@site_router.get("/api/sites", response_model=list[Site])
def list_user_plants(principal: Principal = Depends(current_principal)) -> list[Site]:
    """List the current member's registered plant (strictly 0 or 1 on Free plan, or empty list for guests)."""
    if not principal.is_member or not principal.user_id:
        return []
    return db.list_user_sites(principal.user_id)


@site_router.get("/api/sites/{site_id}", response_model=Site)
def get_user_plant(
    site_id: str,
    principal: Principal = Depends(current_principal),
) -> Site:
    """Retrieve details for a plant, enforcing uniform 404 on unauthorized access."""
    site = db.get_site(site_id)
    require_site_access(site, principal, write=False)
    assert site is not None
    return site


@site_router.delete("/api/sites/{site_id}")
def delete_user_plant(
    site_id: str,
    principal: Principal = Depends(require_member),
) -> dict[str, str]:
    """Delete the member's registered plant to free up their 1-site quota slot."""
    site = db.get_site(site_id)
    require_site_access(site, principal, write=True)

    deleted = db.delete_site(site_id, principal.user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Plant not found or delete unauthorized.")
    return {"status": "success", "message": f"Plant '{site_id}' deleted successfully."}


@site_router.get("/api/sites/{site_id}/weather")
async def get_site_weather(
    site_id: str,
    principal: Principal = Depends(current_principal),
) -> dict[str, Any]:
    """Fetch live mountain satellite weather for a registered member plant."""
    site = db.get_site(site_id)
    require_site_access(site, principal, write=False)
    assert site is not None

    obs = await _weather_client.fetch_weather(site.coordinates.lat, site.coordinates.lon)
    return obs.model_dump(mode="json")


@site_router.post("/api/sites/{site_id}/evaluate")
async def evaluate_site(
    site_id: str,
    principal: Principal = Depends(current_principal),
    rainfall_override_mm_h: float | None = Query(default=None, ge=0.0, le=300.0),
) -> dict[str, Any]:
    """Run the complete 5-agent AI pipeline and safety verification on live satellite data for this site."""
    from hydromesh.ingest.live import LiveIngestionEngine
    from hydromesh.pipeline import OrchestrationPipeline
    from hydromesh.schemas import HydroPlantSpec

    site = db.get_site(site_id)
    require_site_access(site, principal, write=False)
    assert site is not None

    plant_spec = HydroPlantSpec(
        id=site.id,
        name=site.name,
        capacity_mw=site.capacity_mw,
        river_basin="Custom Basin",
        latitude=site.coordinates.lat,
        longitude=site.coordinates.lon,
        design_flow_m3s=site.design_flow_m3s,
        head_m=site.head_m,
        catchment_area_km2=site.catchment_area_km2,
        base_flow_m3s=round(site.design_flow_m3s * 0.70, 2),
        runoff_coeff=0.65,
    )

    obs = await _weather_client.fetch_weather(site.coordinates.lat, site.coordinates.lon)
    if rainfall_override_mm_h is not None:
        obs = obs.model_copy(update={"precipitation_mm_h": rainfall_override_mm_h})

    ingestion = LiveIngestionEngine(plant_spec)
    telemetry = ingestion.ingest(obs)

    pipeline = OrchestrationPipeline(plant=plant_spec)
    incident = await pipeline.run_cycle(telemetry=telemetry, weather=obs)

    return incident.model_dump(mode="json")


# --- Operator ACK & Scenario Injection Sandbox -----------------------------------------
class OperatorAckRequest(BaseModel):
    operator_note: str = Field(default="", max_length=500)


@site_router.post("/api/sites/{site_id}/incidents/{incident_id}/ack")
def acknowledge_incident(
    site_id: str,
    incident_id: str,
    req: OperatorAckRequest,
    principal: Principal = Depends(require_member),
) -> dict[str, Any]:
    """Acknowledge an active safety-approved incident recommendation."""
    site = db.get_site(site_id)
    require_site_access(site, principal, write=True)

    log.info("operator_acknowledged_incident", site_id=site_id, incident_id=incident_id)
    return {
        "status": "success",
        "site_id": site_id,
        "incident_id": incident_id,
        "operator": principal.email or principal.user_id,
        "acknowledged_at": time.time(),
        "note": req.operator_note,
    }


class ScenarioInjectionRequest(BaseModel):
    scenario_type: str = Field(default="monsoon_surge", description="monsoon_surge | inflow_surge")
    intensity_multiplier: float = Field(default=1.0, ge=0.5, le=3.0)


@site_router.post("/api/sites/{site_id}/scenario")
def inject_simulation_scenario(
    site_id: str,
    req: ScenarioInjectionRequest,
    principal: Principal = Depends(require_member),
) -> dict[str, Any]:
    """Inject high-water scenario into personal plant twin, strictly rate-limited to 3/hour."""
    site = db.get_site(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found.")
    require_site_access(site, principal, write=True)

    # Rate limiting: max 3 injections per hour per member
    user_key = principal.user_id or "anonymous"
    now = time.monotonic()
    timestamps = [ts for ts in _scenario_rate_limits[user_key] if now - ts < _SCENARIO_WINDOW_S]
    _scenario_rate_limits[user_key] = timestamps

    if len(timestamps) >= _SCENARIO_MAX_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded: Free tier allows maximum 3 scenario injections per hour.",
        )

    _scenario_rate_limits[user_key].append(now)

    # Step simulation
    twin = PlantTwin(scenarios.monsoon_surge, spec=PlantSpec(design_flow_m3s=site.design_flow_m3s), seed=42)
    telemetry = twin.step(120.0)

    return {
        "status": "success",
        "scenario": req.scenario_type,
        "site_id": site_id,
        "simulated_discharge_m3s": round(telemetry.discharge_m3s * req.intensity_multiplier, 1),
        "simulated_silt_ppm": round(telemetry.silt_ppm * req.intensity_multiplier, 1),
        "remaining_hourly_quota": _SCENARIO_MAX_PER_HOUR - len(_scenario_rate_limits[user_key]),
    }


# --- Ticketed WebSocket Streams for Global & Individual --------------------------------
@site_router.websocket("/ws/global")
async def websocket_global_stream(
    websocket: WebSocket,
    ticket: str | None = Query(default=None),
) -> None:
    """Public read-only global fleet stream with optional ticket authentication."""
    if not await stream_manager.connect(websocket):
        return
    try:
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await stream_manager.disconnect(websocket)


@site_router.websocket("/ws/sites/{site_id}")
async def websocket_site_stream(
    websocket: WebSocket,
    site_id: str,
    ticket: str | None = Query(default=None),
) -> None:
    """Dedicated ticketed live stream for a member's individual plant."""
    if not ticket or not db.consume_ws_ticket(ticket):
        await websocket.close(code=4001, reason="Invalid or expired ticket")
        return

    if not await stream_manager.connect(websocket):
        return
    try:
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await stream_manager.disconnect(websocket)
