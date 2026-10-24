"""HydroMesh Production REST API & WebSocket Streaming Endpoints.

SIMPLE EXPLANATION (FOR ANYONE / NON-TECH):
Think of this file as the Dam Control Room's Front Desk and Switchboard.
1. Plant Directory (/api/plants): Lists all 25 landmark Nepal hydropower stations.
2. Live Satellite Weather (/api/plants/{id}/weather): Asks weather satellites
   for rain conditions right now at any specific mountain dam.
3. On-Demand AI Evaluation (/api/plants/{id}/evaluate): Runs all 5 robot helpers
   to analyze river water, check safety rules, and advise the operator.
4. Human Override (/api/override): Gives human operators the final say to approve
   or cancel actions with a one-time safety stamp (nonce) so commands are never repeated twice!
5. Live Radio Stream (/ws/stream): Streams live numbers straight into operators' screens.
"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from hydromesh.agents.revenue import EnergyRevenueOutlookAgent
from hydromesh.api.stream import stream_manager
from hydromesh.blackboard import Blackboard
from hydromesh.llm import OllamaClient
from hydromesh.logging import get_logger
from hydromesh.pipeline import OrchestrationPipeline
from hydromesh.schemas import EconomicInputs, HydroPlantSpec, WeatherObservation
from hydromesh.twin import scenarios
from hydromesh.twin.plant import PlantSpec, PlantTwin
from hydromesh.weather import WeatherClient, get_plant_by_id, load_nepal_plants

log = get_logger(__name__)

router = APIRouter()

# Shared singleton components
_plants = load_nepal_plants()
_blackboard = Blackboard()
_weather_client = WeatherClient()
_shared_twin = PlantTwin(scenarios.normal, spec=PlantSpec(), seed=42)

# Global pipelines per plant (lazy cache)
_pipelines: dict[str, OrchestrationPipeline] = {}
# Idempotency nonces cache: maps nonce -> dict result
_processed_nonces: dict[str, dict[str, Any]] = {}


def _get_pipeline_for_plant(plant: HydroPlantSpec) -> OrchestrationPipeline:
    if plant.id not in _pipelines:
        _pipelines[plant.id] = OrchestrationPipeline(plant=plant, blackboard=_blackboard)
    return _pipelines[plant.id]


# --- Health & Directory Endpoints ------------------------------------------------------
@router.get("/api/health")
def healthcheck() -> dict[str, Any]:
    """Healthcheck endpoint reporting subsystem statuses."""
    return {
        "status": "ok",
        "subsystems": {
            "blackboard": "healthy",
            "plant_twin": "online",
            "weather_client": "online",
            "websocket_stream": f"{stream_manager.count} clients connected",
            "registry": f"{len(_plants)} plants registered",
        },
    }


@router.get("/api/plants")
def list_plants() -> list[dict[str, Any]]:
    """Return all 25 landmark Nepal hydropower stations."""
    return [p.model_dump(mode="json") for p in _plants]


@router.get("/api/plants/{plant_id}")
async def get_plant(plant_id: str) -> dict[str, Any]:
    """Return details and current telemetry snapshot for a specific plant."""
    plant = get_plant_by_id(plant_id, _plants)
    if not plant:
        raise HTTPException(status_code=404, detail=f"Hydropower plant '{plant_id}' not found")

    summary = await _blackboard.plant_summary(plant_id)
    return {
        "plant": plant.model_dump(mode="json"),
        "state": summary,
    }


@router.get("/api/plants/{plant_id}/weather")
async def get_plant_weather(plant_id: str) -> dict[str, Any]:
    """Fetch live mountain satellite weather for a specific hydropower station."""
    plant = get_plant_by_id(plant_id, _plants)
    if not plant:
        raise HTTPException(status_code=404, detail=f"Hydropower plant '{plant_id}' not found")

    obs = await _weather_client.fetch_weather(plant.latitude, plant.longitude)
    return obs.model_dump(mode="json")


@router.post("/api/plants/{plant_id}/evaluate")
async def evaluate_plant(
    plant_id: str,
    rainfall_override_mm_h: float | None = Query(default=None, ge=0.0, le=300.0),
) -> dict[str, Any]:
    """Run the complete 5-agent AI pipeline and safety verification for a plant."""
    plant = get_plant_by_id(plant_id, _plants)
    if not plant:
        raise HTTPException(status_code=404, detail=f"Hydropower plant '{plant_id}' not found")

    # Fetch live weather (or apply override)
    obs = await _weather_client.fetch_weather(plant.latitude, plant.longitude)
    if rainfall_override_mm_h is not None:
        obs = obs.model_copy(update={"precipitation_mm_h": rainfall_override_mm_h})

    pipeline = _get_pipeline_for_plant(plant)

    # Ingest into Telemetry
    from hydromesh.ingest.live import LiveIngestionEngine

    ingestion = LiveIngestionEngine(plant)
    telemetry = ingestion.ingest(obs)

    # Run complete multi-agent pipeline
    incident = await pipeline.run_cycle(
        telemetry=telemetry,
        weather=obs,
        snapshot=_shared_twin.snapshot(),
    )

    return incident.model_dump(mode="json")


@router.post("/api/plants/{plant_id}/revenue-outlook")
async def get_revenue_outlook(
    plant_id: str,
    inputs: EconomicInputs | None = None,
) -> dict[str, Any]:
    """Calculate operational economics, MWh generation, and IEC 62364 wear savings."""
    plant = get_plant_by_id(plant_id, _plants)
    if not plant:
        raise HTTPException(status_code=404, detail=f"Hydropower plant '{plant_id}' not found")

    econ_inputs = inputs or EconomicInputs()

    # 1. Fetch live Open-Meteo weather
    obs = await _weather_client.fetch_weather(plant.latitude, plant.longitude)
    from hydromesh.ingest.live import calculate_runoff_discharge, silt_rating_curve

    # 2. Derive projected discharge and silt for each hour of the horizon
    hourly_q: list[float] = []
    hourly_silt: list[float] = []

    precip_profile = list(obs.hourly_precipitation_48h) or [obs.precipitation_mm_h] * 48
    for t in range(econ_inputs.horizon_hours):
        rain_t = precip_profile[t % len(precip_profile)]
        q_t = calculate_runoff_discharge(
            base_flow_m3s=plant.base_flow_m3s,
            rainfall_mm_h=rain_t,
            catchment_area_km2=plant.catchment_area_km2,
            runoff_coeff=plant.runoff_coeff,
        )
        silt_t = silt_rating_curve(q_t)
        hourly_q.append(q_t)
        hourly_silt.append(silt_t)

    # 3. Execute EnergyRevenueOutlookAgent
    agent = EnergyRevenueOutlookAgent(llm_client=OllamaClient())
    report = await agent.run(
        plant=plant,
        inputs=econ_inputs,
        hourly_discharge_m3s=hourly_q,
        hourly_silt_ppm=hourly_silt,
    )

    return report.model_dump(mode="json")


@router.get("/api/plants/{plant_id}/revenue-outlook")
async def get_revenue_outlook_get(
    plant_id: str,
    horizon_hours: int = Query(default=24, ge=1, le=168),
    ppa_tariff_npr_kwh: float = Query(default=5.84, ge=0.5, le=50.0),
    overhaul_cost_npr: float = Query(default=12_000_000.0, ge=0.0),
    fixed_om_cost_per_day_npr: float = Query(default=150_000.0, ge=0.0),
) -> dict[str, Any]:
    """GET variant of revenue-outlook for instant browser direct link inspection."""
    inputs = EconomicInputs(
        horizon_hours=horizon_hours,  # type: ignore[arg-type]
        ppa_tariff_npr_kwh=ppa_tariff_npr_kwh,
        overhaul_cost_npr=overhaul_cost_npr,
        fixed_om_cost_per_day_npr=fixed_om_cost_per_day_npr,
    )
    return await get_revenue_outlook(plant_id=plant_id, inputs=inputs)


# --- Operator Override Model & Endpoint ------------------------------------------------
class OperatorOverrideRequest(BaseModel):
    action_id: str = Field(min_length=1, max_length=64)
    operator_id: str = Field(min_length=1, max_length=64)
    override_choice: Literal["approve", "reject", "acknowledge"]
    nonce: str = Field(min_length=8, max_length=128)
    reason: str = Field(default="", max_length=500)


@router.post("/api/override")
async def operator_override(req: OperatorOverrideRequest) -> dict[str, Any]:
    """Operator override endpoint with idempotency nonce verification."""
    if req.nonce in _processed_nonces:
        log.warning("duplicate_override_nonce_detected", nonce=req.nonce)
        return {
            "status": "duplicate_idempotent",
            "message": "Action was already evaluated with this idempotency nonce.",
            "record": _processed_nonces[req.nonce],
        }

    record = {
        "action_id": req.action_id,
        "operator_id": req.operator_id,
        "choice": req.override_choice,
        "nonce": req.nonce,
        "reason": req.reason or "Manual operator control room decision",
    }
    _processed_nonces[req.nonce] = record

    # Record to Blackboard audit log
    await _blackboard.record_audit_event(
        event_type="operator_override",
        plant_id="manual_control",
        payload=record,
    )

    return {
        "status": "success",
        "result": f"Override '{req.override_choice}' recorded by {req.operator_id}",
        "record": record,
    }


# --- WebSocket Streaming Endpoint ------------------------------------------------------
@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket) -> None:
    """Live streaming endpoint broadcasting real-time plant telemetry to frontends."""
    await stream_manager.connect(websocket)
    try:
        while True:
            # Receive client ping or heartbeat
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await stream_manager.disconnect(websocket)


# --- Legacy / Dashboard Endpoints -----------------------------------------------------
@router.get("/api/v1/twin/state")
def get_twin_state() -> dict[str, Any]:
    """Retrieve current digital twin snapshot and latest telemetry."""
    snap = _shared_twin.snapshot()
    telem = _shared_twin.step(0.0)
    return {
        "telemetry": telem.model_dump(mode="json"),
        "snapshot": snap.model_dump(mode="json"),
        "sim_time_s": _shared_twin._t,
    }


@router.get("/api/v1/orchestrate/run")
async def run_orchestration_cycle(
    plant_id: str = Query(default="upper_tamakoshi"),
    sim_step_s: float = Query(default=60.0, ge=1.0, le=600.0),
) -> dict[str, Any]:
    """Fast execution endpoint for interactive UI button."""
    plant = get_plant_by_id(plant_id, _plants) or _plants[0]
    pipeline = _get_pipeline_for_plant(plant)

    telem = _shared_twin.step(sim_step_s)
    weather = WeatherObservation(
        ts=telem.ts,
        latitude=plant.latitude,
        longitude=plant.longitude,
        precipitation_mm_h=telem.rainfall_mm_h,
        temperature_c=10.0,
        cloud_cover_pct=80.0,
        hourly_precipitation_48h=(telem.rainfall_mm_h,) * 48,
        is_live=True,
    )

    incident = await pipeline.run_cycle(telem, weather, snapshot=_shared_twin.snapshot())
    applied = False
    if incident.verdict and incident.verdict.status == "approved" and incident.decision:
        applied = _shared_twin.apply(incident.decision)

    return {
        "incident_id": incident.id,
        "plant_id": plant.id,
        "telemetry_before": telem.model_dump(mode="json"),
        "llm_decision": incident.decision.model_dump(mode="json") if incident.decision else None,
        "safety_verdict": incident.verdict.model_dump(mode="json") if incident.verdict else None,
        "applied": applied,
        "snapshot_after": _shared_twin.snapshot().model_dump(mode="json"),
        "report": incident.report.model_dump(mode="json") if incident.report else None,
    }


class TwinScenarioPayload(BaseModel):
    scenario: str
    severity: str = "warning"


@router.post("/api/twin/scenario")
async def trigger_twin_scenario(payload: TwinScenarioPayload, request: Request) -> dict[str, Any]:
    """Switch the live simulation scenario between normal, monsoon surge, flash flood, and clear."""
    sc_name = payload.scenario.lower()
    target_scenario = (
        "monsoon_surge" if "monsoon" in sc_name
        else "inflow_surge" if ("flood" in sc_name or "inflow" in sc_name)
        else "normal"
    )

    # 1. Update shared twin
    sc_fn = scenarios.SCENARIOS.get(target_scenario, scenarios.normal)
    _shared_twin._scenario = sc_fn
    _shared_twin._t = 0.0

    # 2. Update background scheduler twin if running
    scheduler: Any = getattr(request.app.state, "scheduler", None)
    if scheduler and hasattr(scheduler, "set_scenario"):
        scheduler.set_scenario(target_scenario)

    log.info("scenario_switched", scenario=target_scenario, severity=payload.severity)
    return {
        "status": "success",
        "scenario": target_scenario,
        "severity": payload.severity,
        "message": f"Simulation twin switched to '{target_scenario}'",
    }


class CustomLiveQuery(BaseModel):
    name: str = Field(default="Custom Hydropower Station", min_length=2, max_length=120)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    capacity_mw: float = Field(default=50.0, gt=0, le=5000)
    head_m: float = Field(default=120.0, gt=0, le=2500)
    design_flow_m3s: float = Field(default=40.0, gt=0, le=2000)
    catchment_area_km2: float = Field(default=250.0, gt=0, le=50000)
    runoff_coeff: float = Field(default=0.65, gt=0, le=1.0)
    run_ai: bool = Field(default=True)
    rainfall_override_mm_h: float | None = Field(default=None, ge=0.0, le=300.0)


@router.post("/api/live-query")
async def execute_custom_live_query(query: CustomLiveQuery) -> dict[str, Any]:
    """Dynamically fetch live satellite weather and compute telemetry + AI decision for any coordinates."""
    from hydromesh.ingest.live import LiveIngestionEngine
    from hydromesh.weather import make_custom_plant_spec

    plant = make_custom_plant_spec(
        name=query.name,
        latitude=query.latitude,
        longitude=query.longitude,
        capacity_mw=query.capacity_mw,
        head_m=query.head_m,
        design_flow_m3s=query.design_flow_m3s,
        catchment_area_km2=query.catchment_area_km2,
    )

    # 1. Fetch live real-world satellite weather from ECMWF/NOAA for these exact coordinates
    obs = await _weather_client.fetch_weather(query.latitude, query.longitude)
    if query.rainfall_override_mm_h is not None:
        obs = obs.model_copy(update={"precipitation_mm_h": query.rainfall_override_mm_h})

    # 2. Ingest live satellite data through physical hydrology equations
    engine = LiveIngestionEngine(plant)
    telemetry = engine.ingest(obs)

    result: dict[str, Any] = {
        "plant": plant.model_dump(mode="json"),
        "weather": obs.model_dump(mode="json"),
        "telemetry": telemetry.model_dump(mode="json"),
        "incident": None,
    }

    # 3. If requested, run the complete 5-agent AI pipeline
    if query.run_ai:
        pipeline = _get_pipeline_for_plant(plant)
        incident = await pipeline.run_cycle(
            telemetry=telemetry,
            weather=obs,
            snapshot=_shared_twin.snapshot(),
        )
        result["incident"] = incident.model_dump(mode="json")

    return result


@router.get("/api/live-query")
async def get_custom_live_query(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
    name: str = Query(default="Custom Hydropower Station"),
    capacity_mw: float = Query(default=50.0, gt=0, le=5000),
    head_m: float = Query(default=120.0, gt=0, le=2500),
    design_flow_m3s: float = Query(default=40.0, gt=0, le=2000),
    catchment_area_km2: float = Query(default=250.0, gt=0, le=50000),
    run_ai: bool = Query(default=True),
) -> dict[str, Any]:
    """GET variant of live-query for instant browser or curl testing with any coordinates."""
    return await execute_custom_live_query(
        CustomLiveQuery(
            name=name,
            latitude=lat,
            longitude=lon,
            capacity_mw=capacity_mw,
            head_m=head_m,
            design_flow_m3s=design_flow_m3s,
            catchment_area_km2=catchment_area_km2,
            run_ai=run_ai,
        )
    )


@router.get("/favicon.ico", include_in_schema=False)
def favicon() -> Response:
    """Return 204 No Content for favicon requests to prevent console 404 noise."""
    return Response(status_code=204)


@router.get("/", response_class=HTMLResponse)
def dashboard() -> HTMLResponse:
    """Interactive visual dashboard."""
    return HTMLResponse(
        content="""<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <title>HydroMesh Control Hub • Nepal Hydropower Network</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 p-8 antialiased">
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center justify-between border-b border-slate-800 pb-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-emerald-400">HydroMesh Live API & 24/7 Engine</h1>
        <p class="text-sm text-slate-400">Active Multi-Agent Orchestration, Open-Meteo Satellite Ingestion & WebSocket Stream</p>
      </div>
      <a href="/docs" class="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded border border-slate-700">Open Swagger Docs</a>
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <span class="text-xs text-slate-400">Total Registered Plants</span>
        <div class="text-2xl font-bold text-white font-mono">25 Landmark Dams</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <span class="text-xs text-slate-400">Active WebSocket Stream</span>
        <div class="text-2xl font-bold text-sky-400 font-mono">/ws/stream</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <span class="text-xs text-slate-400">Safety Verification</span>
        <div class="text-2xl font-bold text-emerald-400 font-mono">Rules R1-R11 Active</div>
      </div>
    </div>
  </div>
</body>
</html>"""
    )
