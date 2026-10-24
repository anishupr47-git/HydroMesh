"""Live End-to-End Verification Script for Sprint 3 (FastAPI & Streaming API)."""

import asyncio
from datetime import UTC, datetime

from fastapi.testclient import TestClient

from hydromesh.api.app import create_app
from hydromesh.api.stream import stream_manager
from hydromesh.schemas import AgentEvent


def main() -> None:
    print("==================================================")
    print("HYDROMESH SPRINT 3: API & STREAMING VERIFICATION")
    print("==================================================")

    app = create_app()
    with TestClient(app) as client:
        # 1. Healthcheck & Subsystems
        print("\n--- 1. Testing /api/health ---")
        resp = client.get("/api/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        data = resp.json()
        print(f"Status: {data['status'].upper()}")
        print(f"Subsystems: {data['subsystems']}")

        # 2. Security Armor Headers
        print("\n--- 2. Verifying Security Armor Headers ---")
        assert resp.headers["x-content-type-options"] == "nosniff"
        assert resp.headers["x-frame-options"] == "DENY"
        assert "max-age" in resp.headers["strict-transport-security"]
        print("  * X-Content-Type-Options: nosniff [PASSED]")
        print("  * X-Frame-Options: DENY [PASSED]")
        print("  * Strict-Transport-Security: present [PASSED]")

        # 3. Nepal Hydro Plant Registry Listing
        print("\n--- 3. Testing /api/plants (Registry API) ---")
        p_resp = client.get("/api/plants")
        assert p_resp.status_code == 200
        plants = p_resp.json()
        print(f"Retrieved {len(plants)} Nepal hydropower stations.")
        assert len(plants) >= 20
        first = plants[0]
        print(f"First Station: {first['name']} ({first['capacity_mw']} MW, Basin: {first['river_basin']})")

        # 4. Specific Plant Details & State
        print(f"\n--- 4. Testing /api/plants/{first['id']} ---")
        t_resp = client.get(f"/api/plants/{first['id']}")
        assert t_resp.status_code == 200
        detail = t_resp.json()
        print(f"Plant ID: {detail['plant']['id']}")
        print(f"Design Flow: {detail['plant']['design_flow_m3s']} m3/s")

        # 5. Live Mountain Satellite Weather
        print(f"\n--- 5. Testing /api/plants/{first['id']}/weather ---")
        w_resp = client.get(f"/api/plants/{first['id']}/weather")
        assert w_resp.status_code == 200
        weather = w_resp.json()
        print(f"Satellite Precip: {weather['precipitation_mm_h']:.1f} mm/h")
        print(f"Satellite Temp: {weather['temperature_c']:.1f} C")
        print(f"Hourly 48h Forecast Array Length: {len(weather['hourly_precipitation_48h'])}")

        # 6. On-Demand Full Multi-Agent Evaluation Endpoint
        print(f"\n--- 6. Testing /api/plants/{first['id']}/evaluate ---")
        eval_resp = client.post(f"/api/plants/{first['id']}/evaluate?rainfall_override_mm_h=25.0")
        assert eval_resp.status_code == 200
        eval_data = eval_resp.json()
        print(f"Incident Generated: {eval_data['id']}")
        print(f"Anomaly Severity: {eval_data['anomaly']['severity']}")
        print(f"Safety Verdict: {eval_data['verdict']['status']}")
        print(f"Explanation: {eval_data['report']['title']}")

        # 7. Operator Override with Idempotency Nonce
        print("\n--- 7. Testing /api/override (Human In The Loop) ---")
        override_payload = {
            "action_id": "ACT-771",
            "operator_id": "op_ramesh_karki",
            "override_choice": "approve",
            "nonce": "unique-sec-nonce-98124",
            "reason": "Control room verified basin desander clearance",
        }
        o_resp = client.post("/api/override", json=override_payload)
        assert o_resp.status_code == 200
        assert o_resp.json()["status"] == "success"
        print("First Override Submission: SUCCESS")

        # Duplicate nonce should be idempotent
        dup_resp = client.post("/api/override", json=override_payload)
        assert dup_resp.status_code == 200
        assert dup_resp.json()["status"] == "duplicate_idempotent"
        print("Duplicate Nonce Submission: DUPLICATE_IDEMPOTENT [PASSED]")

        # 8. Digital Twin State & Interactive Orchestration Cycle
        print("\n--- 8. Testing /api/v1/twin/state and /api/v1/orchestrate/run ---")
        twin_state = client.get("/api/v1/twin/state").json()
        print(f"Plant Available MW: {twin_state['snapshot']['available_mw']:.1f} MW")
        step_resp = client.get("/api/v1/orchestrate/run?sim_step_s=60.0")
        assert step_resp.status_code == 200
        step_data = step_resp.json()
        print(f"Twin Stepped 60s: Incident={step_data['incident_id']}, Applied={step_data['applied']}")

        # 9. WebSocket Live Stream Broadcast
        print("\n--- 9. Testing WebSocket Event Broadcast ---")
        test_event = AgentEvent(
            ts=datetime.now(UTC),
            incident_id="INC-TEST-001",
            agent="TriageAgent",
            kind="info",
            message="Satellite observation synced with digital twin",
            payload={"plant_id": first["id"]},
        )
        asyncio.run(
            stream_manager.broadcast({"type": "agent_event", "event": test_event.model_dump(mode="json")})
        )
        print("Broadcasted AgentEvent over stream manager [PASSED]")

        # 10. Rate Limiting Protection (429)
        print("\n--- 10. Testing Middleware Rate Limiter (Max 120 req/min) ---")
        hit_429 = False
        for _ in range(130):
            r = client.get("/api/health")
            if r.status_code == 429:
                hit_429 = True
                print(f"Rate Limiter Triggered 429: {r.json()['detail']}")
                break
        assert hit_429, "Rate limiter did not trigger at 120 requests!"

    print("\n==================================================")
    print("ALL SPRINT 3 API & STREAMING MODULES ARE GOATED!")
    print("==================================================")


if __name__ == "__main__":
    main()
