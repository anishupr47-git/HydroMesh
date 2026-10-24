# HydroMesh — Master Project Plan & Build Specification
**Status**: Sprints 1-4 Completed - 100% Core Tests Passing (139/139), 91.8% Coverage - v1.4  
**Root directory**: `c:\Users\user\Documents\HydroMesh`

---

## 0. North Star
HydroMesh is a self-hosted, spatio-temporal deep-learning platform for Himalayan run-of-river hydropower plants. It forecasts suspended sediment (PPM) and river discharge 12–24 h ahead, couples those forecasts to IEC 62364 turbine wear physics, and surfaces automated 3-tier operational alerts — replacing a reactive overhaul cycle that costs up to NPR 80 Lakhs per monsoon season.

### Honesty Guardrails (must appear in every public surface)
- MVP runs against a digital twin (stylized simulator, not engineering-validated).
- All impact numbers are simulated.
- Advisory actions never auto-actuate.

---

## 1. High-Level Architecture
- **Open Telemetry**: GPM IMERG, ERA5-Land, DHM SCADA proxy
- **Tabular Window Pipeline**: Polars, lag features, NTU/PPM proxy
- **Temporal Fusion Transformer**: PyTorch, PINN loss, ONNX export
- **IEC 62364 Erosion Bridge**: $\Delta W$ formula, RUL meter
- **Web Platform**: FastAPI, Redis, Next.js App Router

### MVP Data Flow (Digital Twin Path)
```
PlantTwin (seeded RNG)
  --> Telemetry
  --> Redis Blackboard
  --> Supervisor (proposes RoutingPlan)
  --> Triage (AnomalyVector)
  --> Predict (Forecast)
  --> SOP_RAG (SOPMatch + SimilarIncident)
  --> Dispatch (AgentDecision)
  --> SafetyValidator (SafetyVerdict - pure, deterministic)
  --> Explain (IncidentReport)
  --> WebSocket /ws/stream --> Next.js Dashboard
```

---

## 2. Stack Decision Matrix
| Layer | Choice | Why |
| :--- | :--- | :--- |
| Language | Python 3.11+ | StrEnum, match, PEP 695 |
| API | FastAPI + uvicorn | async-native, OpenAPI auto-gen |
| Validation | pydantic v2 + pydantic-settings | frozen models, discriminated unions |
| Event bus | Redis Stream (asyncio) | ordered, persistent, replay-able |
| LLM | Ollama (`qwen2.5:7b-instruct` default) | self-hosted, JSON-schema constrained |
| Vector memory | ChromaDB + all-MiniLM-L6-v2 | on-prem, no API key |
| Classical ML | scikit-learn GradientBoosting | fast, interpretable triage |
| Frontend | Next.js App Router + TypeScript + Tailwind + Recharts | typed, SSR-ready |
| Quality | ruff, mypy --strict, pytest, hypothesis | strict correctness |
| Ops | docker-compose, Makefile, GitHub Actions | one-command demo |

---

## 3. Schema Contract Summary (`hydromesh/schemas.py`)
All inter-module data uses frozen pydantic v2 models — no raw dicts ever cross module boundaries.
- `Telemetry`: Live sensor snapshot (discharge, silt, vibration, grid_freq, rainfall)
- `Forecast`: Predicted peak discharge + silt + risk horizon (1–24 h)
- `AnomalyVector`: Triage output: per-risk floats + severity enum
- `SOPMatch` / `SimilarIncident`: RAG retrieval results
- `Action`: Discriminated union: `ModulateIntake` | `TriggerFlush` | `ReallocateDispatch`
- `AgentDecision`: Proposed action list + rationale + confidence
- `SafetyVerdict`: `approved` / `rejected` / `needs_human` + clamped actions
- `ExecutionResult`: `pending_override` / `executed` / `overridden` / `skipped`
- `IncidentReport`: Operator-facing summary (LLM or template fallback)
- `RoutingPlan`: Supervisor's step list
- `AgentEvent`: Live stream unit (feeds WebSocket + Redis Stream)
- `TwinSnapshot`: Full plant state for validator context
- `Incident`: Mutable aggregate assembled from blackboard sections

---

## 4. Safety Validator Rules (R1–R11)
Fail-closed, pure, deterministic, no I/O, no LLM.
- **R1**: confidence < 0.80 -> `needs_human`
- **R2**: Unknown gate/basin ID -> `rejected`
- **R3**: Flow reduction > 50% of current -> clamp + note
- **R4**: Target flow < 20% of design -> clamp up + note
- **R5**: Target flow > design flow -> `rejected`
- **R6**: Flush duration outside [5, 90] min -> `rejected`
- **R7**: Basin already flushing / last flush < 60 min -> `rejected`
- **R8**: > 3 actions in last 10 min -> `rejected`
- **R9**: MW target > available MW -> `rejected`
- **R10**: Critical feeders not first in priority list -> `rejected`
- **R11**: Empty action list -> `needs_human`

---

## 5. IEC 62364 Erosion Formula
$$\Delta W = 10^{-9} \cdot K_m \cdot C \cdot (W_{\text{rel}})^{2.5} \cdot K_{\text{hardness}}$$
- $K_m$ (13Cr-4Ni steel): 1.0
- $K_{\text{hardness}}$ (quartz/steel): 2.8
- $x$ (velocity exponent): 2.5
- Critical runner wear limit: 2.5–4.0 mm (Francis)
- Maintenance ticket trigger: 70% of critical limit

### 3-Tier Alert System
- **GREEN**: < 1,200 PPM (Normal generation)
- **YELLOW**: 1,200 – 3,000 PPM (Open desander sluice gates)
- **RED**: > 3,000 PPM (Alert-only; 10-min operator ACK window)

---

## 6. Task Card Schedule (T00 – T20)
- **Week 1: Foundations**: T00 Scaffold, T01 Settings & Logging, T02 Schemas, T03 Blackboard, T04 LLM Client, T05 Digital Twin, T06 Safety Validator
- **Week 2: Agents**: T07 Triage, T08 SOP Corpus & RAG, T09 Predictor, T10 Dispatch, T11 Supervisor, T12 Explain & Memory
- **Week 3: Integration & UI**: T13 Pipeline + Scenario Tests, T14 API & WebSocket, T15 Frontend Scaffold, T16 Dashboard Components, T17 Override UX
- **Week 4: Evidence & Polish**: T18 Baseline Eval, T19 Docs, T20 Release Hygiene

### Sprint Execution Milestones
- [x] **Sprint 1**: Foundations, Frozen Schemas & Pure Deterministic Safety Kernel (R1–R11)
- [x] **Sprint 2**: Multi-Agent Swarm, Vector SOP RAG & Digital Twin Simulator
- [x] **Sprint 3**: FastAPI Engine, WebSockets, Storyline Fleet Engine & Argon2id Auth
- [x] **Sprint 4**: Live Hydrology Ingestion (DHM/IMERG/ERA5) & 25 Official Hydro Stations

