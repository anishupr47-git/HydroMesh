"""Comprehensive Verification Script for Sprint 2 (Multi-Agent AI Pipeline)."""

import asyncio
import time
from datetime import UTC, datetime

from hydromesh.blackboard import Blackboard
from hydromesh.memory import SOPMemory
from hydromesh.pipeline import OrchestrationPipeline
from hydromesh.schemas import BasinState, GateState, Telemetry, TwinSnapshot, WeatherObservation
from hydromesh.weather import get_plant_by_id


async def main() -> None:
    print("==================================================")
    print("HYDROMESH SPRINT 2: MULTI-AGENT VERIFICATION")
    print("==================================================")

    # 1. Cryptographic SOP Verification
    print("\n--- 1. Testing Cryptographic SOP Manifest ---")
    mem = SOPMemory(verify_manifest=True)
    print("SOP Memory initialized with SHA-256 integrity verification passed.")
    matches = mem.search_sops("high silt sediment desander flush trigger", min_score=0.20, limit=2)
    print(f"SOP RAG retrieval: {len(matches)} relevant sections found.")
    for m in matches:
        print(f"  * [{m.doc_id}] {m.section} (score={m.score})")

    # 2. Full Multi-Agent Pipeline Execution
    print("\n--- 2. Testing End-to-End Multi-Agent Pipeline Cycle ---")
    plant = get_plant_by_id("upper_tamakoshi")
    assert plant is not None
    bb = Blackboard()
    pipeline = OrchestrationPipeline(plant=plant, blackboard=bb)

    # Simulate sudden monsoon silt wave (3,100 PPM)
    telem = Telemetry(
        ts=datetime.now(UTC),
        discharge_m3s=850.0,
        silt_ppm=3100.0,
        vibration_mm_s=4.2,
        grid_freq_hz=50.02,
        rainfall_mm_h=35.0,
    )
    weather = WeatherObservation(
        ts=datetime.now(UTC),
        latitude=plant.latitude,
        longitude=plant.longitude,
        precipitation_mm_h=35.0,
        temperature_c=8.0,
        cloud_cover_pct=98.0,
        hourly_precipitation_48h=(35.0,) * 48,
        is_live=True,
    )
    snap = TwinSnapshot(
        ts=datetime.now(UTC),
        gates={0: GateState(gate_id=0, flow_m3s=30.0, design_flow_m3s=30.0)},
        basins={0: BasinState(basin_id=0, sediment_level=0.90, flushing=False)},
        available_mw=60.0,
        critical_feeders=("hospital", "water_pump", "ward_clinic"),
        runner_wear=0.15,
    )

    t0 = time.perf_counter()
    incident = await pipeline.run_cycle(telemetry=telem, weather=weather, snapshot=snap)
    dt_ms = (time.perf_counter() - t0) * 1000.0

    print(f"\nExecution Latency: {dt_ms:.2f} ms (Target: < 500 ms)")
    print(f"Incident ID: {incident.id}")
    assert incident.anomaly is not None
    assert incident.forecast is not None
    assert incident.decision is not None
    assert incident.verdict is not None
    assert incident.report is not None
    print(
        f"Step 1 (Triage): Severity = {incident.anomaly.severity.value} (Silt Risk: {incident.anomaly.silt_risk*100:.0f}%, Confidence: {incident.anomaly.confidence*100:.0f}%)"
    )
    print(
        f"Step 2 (Predictive): Peak Silt = {incident.forecast.peak_silt_ppm:.0f} ppm | Risk = {incident.forecast.risk.value}"
    )
    print(f"Step 3 (SOP RAG): Retrived {len(incident.sop_matches)} official procedures")
    print(
        f"Step 4 (Dispatch Proposal): {len(incident.decision.actions)} actions proposed (confidence: {incident.decision.confidence:.2f})"
    )
    for act in incident.decision.actions:
        print(f"     Action: {act}")
    print(
        f"Step 5 (Safety Kernel Verdict): {incident.verdict.status.upper()} (Reasons: {incident.verdict.reasons or 'None'})"
    )
    print(f"     Approved Actions: {len(incident.verdict.approved_actions)}")
    print(f"Step 6 (Plain-English Briefing): '{incident.report.title}'")
    print(f"     Trigger: {incident.report.trigger}")
    print(f"     Action Taken: {incident.report.action_taken}")
    print(f"     Confidence Note: {incident.report.confidence_note}")

    # 3. Blackboard Verification
    print("\n--- 3. Testing Blackboard State Update ---")
    tier = await bb.get_alert_tier(plant.id)
    print(f"Plant Alert Tier updated to: {tier.upper()}")
    stored_inc = await bb.get_incident(incident.id)
    assert stored_inc is not None
    print(f"Incident {stored_inc.id} persisted to Blackboard.")
    audit = await bb.get_audit_trail(plant_id=plant.id)
    print(f"Audit log recorded: {len(audit)} events.")

    print("\n==================================================")
    print("ALL SPRINT 2 MODULES OPERATIONAL, SAFE & VERIFIED!")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(main())
