# HydroMesh 3-Minute Walkthrough & Demonstration Guide

> **Notice**: HydroMesh operates against a digital twin hydrological simulator. All figures and operational alerts are simulated demonstrations.

---

## Prerequisites

- Docker Desktop running (for Redis)
- Ollama running locally (`ollama serve` on port 11434 with `qwen2.5:7b-instruct` pulled)
- Python 3.11+ environment activated

---

## Step 1: Start Services

```bash
# Terminal 1: Seed data and start FastAPI & Redis
make demo

# Terminal 2: Start Next.js frontend
cd web
npm run dev
```

Open your browser to `http://localhost:3000/demo`.

---

## Step 2: Trigger the Monsoon Surge Scenario

1. In the **Scenario Controls** panel, select `monsoon_surge`.
2. Click **Inject Scenario**.
3. Observe live discharge rising from $45\,\text{m}^3/\text{s}$ to $185\,\text{m}^3/\text{s}$ and sediment PPM climbing past $1,200\,\text{PPM}$.

---

## Step 3: Watch the Live Stream & 3-Tier Alert Transition

1. **YELLOW Alert (1,200 - 3,000 PPM)**:
   - Triage flags silt anomaly vector.
   - SOP RAG agent pulls `SOP-HY-001` (High Silt Response).
   - Dispatch proposes `TriggerFlush(basin_id="basin_1", duration_min=45)`.
   - Safety Validator verifies rules R1–R11 (`approved`).
2. **RED Alert (> 3,000 PPM)**:
   - Silt exceeds critical wear ceiling.
   - IEC 62364 erosion velocity climbs exponentially.
   - System enters **Alert-Only mode** with active 10-minute operator ACK countdown.

---

## Step 4: Test Operator Override

1. During an active 10-minute advisory countdown, click **Override / Abort Action**.
2. Verify that the pending advisory state transitions immediately to `overridden`.
3. Confirm that no digital twin valve mutation occurs.

---

## Step 5: LLM-Down Resiliency Demonstration

1. Temporarily pause Ollama:
   ```bash
   # Kill Ollama process or configure invalid host in .env
   ```
2. Inject `monsoon_surge` again.
3. Observe the system log:
   - Ollama client raises `LLMOutputError` after retries.
   - Supervisor falls back to hardcoded default routing plan.
   - Dispatch executes `rule_based_decision()` fallback.
   - Safety Validator evaluates and protects the digital twin without interruption.

---

## Step 6: Live Satellite Ground-Truth Extraction

Run the live European ECMWF satellite telemetry inspector directly from your terminal:

```bash
# Real-time satellite conditions for Upper Tamakoshi (456 MW):
python live_extraction.py

# Continuous live stream with 3-second delta detection:
python live_extraction.py --plant upper_tamakoshi --stream

# Scan all 25 landmark Nepal hydropower stations concurrently:
python live_extraction.py --all
```

Observe real-time mountain temperature gradients (glacier stations at ~1.6°C vs valleys at 22.6°C) and live physical runoff calculations ($Q_{\text{calc}}$ and quartz silt PPM).

---

## Expected Output & Live Stream Artifacts

All dispatches and alert logs are continuously streamed over WebSockets and verifiable via `scripts/verify_sprint3.py` and `scripts/verify_sprint4.py`.

