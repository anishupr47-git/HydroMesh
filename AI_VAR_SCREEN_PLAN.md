# HydroMesh: AI "VAR" Decision Review HUD (Multi-Layer Verification Chamber)
> **Design Specification & Architectural Plan**  
> **Status**: Planned UI/UX & Output Engine Overhaul  
> **Concept**: Transform Ollama output from conversational prose/chat into a **high-precision VAR (Video Assistant Referee) Telemetry Chamber** — an industrial HUD featuring geometric wireframe box lines, live mathematical formula execution traces, layer fulfillment checklists, and point-by-point risk diagnostics.

---

## 1. Problem Statement: Why "Chatbot AI" Fails in Mission Control

Traditional LLM chat outputs present three critical flaws for hydropower engineers:
1. **Unverifiable Black Box**: Long paragraphs of prose hide the underlying math, making it impossible to see if formulas were calculated or hallucinated.
2. **Low Information Density**: Control room operators scanning a crisis at 2:00 AM need instant structured metrics, not polite conversational filler ("Certainly! I can help you with that...").
3. **No Execution Traceability**: Operators cannot see the intermediate pipeline layers—whether plausibility filters passed, which SOP was matched, or how the safety kernel clamped values.

### The Solution: The "VAR Screen" Paradigm
Borrowing the exact rigor of **Video Assistant Referee (VAR) in elite sport** and **aerospace flight recorders**:
- **Frozen Timestamp & Telemetry Frame**: Precise inputs locked at the moment of evaluation.
- **Box-Line Layer Fulfillment Matrix**: Visual wireframe boxes tracing each layer of AI reasoning and mathematical processing.
- **Deterministic Math Callouts**: Live mathematical equations displayed with substituted sensor variables.
- **Risk Assessment Verdict**: High-impact categorical risk grading (`CRITICAL` / `ELEVATED` / `NOMINAL`) with explicit pass/fail threshold comparisons.
- **Structured Point-by-Point Data Ledger**: Monospace key-value metrics with zero conversational fluff.

---

## 2. Visual Wireframe: The 5-Zone AI "VAR" Chamber Layout

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ HYDROMESH AI DECISION HUD // VAR INSPECTION CHAMBER v2.4                      [STATUS: FROZEN FRAME] │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE A: MULTI-LAYER PIPELINE WIREFRAME & FULFILLMENT BOXES                                             │
│                                                                                                        │
│  ┌───────────────────────┐       ┌───────────────────────┐       ┌────────────────────────┐            │
│  │ LAYER 01: SENSOR AUDIT│──────▶│ LAYER 02: TRIAGE MATH │──────▶│ LAYER 03: TFT FORECAST │            │
│  │ • Plausibility: [PASS]│       │ • dQ/dt: +18.4% [NORM]│       │ • Peak Q: 894.2 m³/s   │            │
│  │ • Silt: 2,840 PPM     │       │ • Silt Delta: +41.2%  │       │ • Risk Horizon: T+4h   │            │
│  │ • IMERG: 28 mm/h      │       │ • Severity: WARNING   │       │ • PINN Loss: 0.0028    │            │
│  └───────────────────────┘       └───────────────────────┘       └────────────────────────┘            │
│                 │                                                                                      │
│                 ▼                                                                                      │
│  ┌───────────────────────┐       ┌───────────────────────┐       ┌────────────────────────┐            │
│  │ LAYER 04: SOP RAG     │──────▶│ LAYER 05: WEAR PHYSICS│──────▶│ LAYER 06: SAFETY KERNEL│            │
│  │ • SOP: SOP-HYD-04     │       │ • ΔW: 0.084 mm/h      │       │ • R1 Conf >= 0.8: PASS │            │
│  │ • Sim Score: 0.884    │       │ • Critical RUL: 40.1h │       │ • R3 Flow Shock: PASS  │            │
│  │ • Verified: SHA-256   │       │ • Erosion Risk: HIGH  │       │ • Verdict: APPROVED    │            │
│  └───────────────────────┘       └───────────────────────┘       └────────────────────────┘            │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE B: LIVE MATHEMATICAL PROOF & EQUATION SUBSTITUTION TRACE                                          │
│                                                                                                        │
│  [1] IEC 62364 RUNNER ABRASION EQUATION:                                                               │
│      ΔW = 10⁻⁹ × Km × C × (W_rel)^2.5 × K_hardness                                                     │
│      ΔW = 10⁻⁹ × (1.0) × (2,840.0) × (42.5)^2.5 × (2.8)                                                │
│         = 0.08424 mm/h  ──▶  [EXCEEDS NOMINAL BASELINE (0.0021 mm/h) BY +3,911%]                        │
│                                                                                                        │
│  [2] WATER HAMMER TRANSIENT CLAMP (RULE R3):                                                           │
│      ΔQ_proposed = 66.0 m³/s ──▶ 45.0 m³/s  (Drop: -21.0 m³/s = -31.8%)                                │
│      Safety Bound: Max allowable drop = 50.0% (-33.0 m³/s)  ──▶  [-31.8% <= -50.0%] [SAFE / CLAMPED]   │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE C: RISK LEVEL DIAGNOSTIC & THRESHOLD AUDIT                                                        │
│                                                                                                        │
│  ┌────────────────────────┐  THRESHOLD CHECKS:                                                         │
│  │  RISK LEVEL: ELEVATED  │  ├─ Silt Threshold   : 2,840 PPM  vs Limit 1,200 PPM  ──▶ [EXCEEDED +136%] │
│  │  ACTION: DESANDER FLUSH│  ├─ Turbine Vibration: 3.82 mm/s  vs Limit 4.50 mm/s  ──▶ [WARNING BAND]   │
│  │  AUTONOMY: ADVISORY    │  ├─ Ecological Floor : 45.0 m³/s  vs Min 13.2 m³/s    ──▶ [COMPLIANT]      │
│  └────────────────────────┘  └─ Operator Timeout : 600s Auto-ACK Window Active    ──▶ [COUNTDOWN: 588s]│
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE D: POINT-BY-POINT STRUCTURED DATA LEDGER                                                          │
│                                                                                                        │
│  • PLANT IDENTIFIER   : np-marsyangdi-04 (Marsyangdi Hydropower Station, Gandaki Basin)                │
│  • RATED HEAD / MW    : 90.5 m Net Head  |  69.0 MW Installed Capacity                                 │
│  • INTAKE ACTUATION   : Modulate Sluice Gate #0 to 45.0 m³/s (Duration: Indefinite until silt < 1.2k)  │
│  • DESANDER SLUICE    : Open Basin #1 Scour Gate (Flush Duration: 45 min, Flush Flow: 8.5 m³/s)       │
│  • AVOIDED EROSION    : Preserves ~0.063 mm runner thickness per 6-hour monsoon flood crest            │
│  • MONETARY EQUIVALENT: Estimated NPR 6.4 Lakhs overhaul cost mitigation over next 24h                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Zone Specifications

### Zone A: Layer Fulfillment Wireframe Box Trace
The UI renders a sequence of connected, high-contrast monospace boxes with animated border-draw micro-animations. Each box represents an autonomous layer of the HydroMesh pipeline:
* **Layer 1: Sensor Audit & Plausibility Filter**:
  - Validates physical gradients ($\Delta Q / \Delta t \le \text{Plausibility Envelope}$).
  - Cross-references DHM river level with GPM/IMERG satellite rain radar.
* **Layer 2: Triage Anomaly Vector**:
  - Classifies severity: `NORMAL` (<1,200 PPM), `WARNING` (1,200–3,000 PPM), `CRITICAL` (>3,000 PPM).
* **Layer 3: Spatio-Temporal Hydrology Forecast**:
  - Projects hydrograph crest over 1–24h horizon with Physics-Informed Neural Network (PINN) loss score.
* **Layer 4: SOP RAG Verification**:
  - ChromaDB cosine similarity lookup against cryptographically hashed (`MANIFEST.sha256`) plant procedures.
* **Layer 5: IEC 62364 Turbine Abrasion Physics**:
  - Computes exact runner metal loss per hour and time-to-critical maintenance threshold ($3.5\text{ mm}$).
* **Layer 6: Deterministic Safety Kernel Gating**:
  - Rules R1 through R11 evaluated with strict boolean pass/fail indicators.

---

### Zone B: Live Mathematical Proof & Equation Substitution
Rather than text asserting that *"wear is high"*, the VAR HUD prints the mathematical derivation:

```
[EQUATION 1: IEC 62364 TURBINE WEAR DERIVATION]
Formula    : ΔW = 10⁻⁹ · Km · C · (W_rel)^2.5 · K_hardness
Values     : Km = 1.0 (13Cr-4Ni Stainless Steel)
             C = 2,840.0 g/m³ (Quartz sediment concentration)
             W_rel = 42.5 m/s (Relative velocity at runner blade tip)
             K_hardness = 2.8 (Quartz mineral abrasion factor on Mohs scale 7)
Computation: 10⁻⁹ × 1.0 × 2840.0 × 11776.4 × 2.8
Result     : 0.0842 mm/hour [CRITICAL WEAR ACCELERATION]
Baseline   : 0.0021 mm/hour [40.1× Elevation over clear-water baseline]
```

---

### Zone C: Risk Diagnostic & Threshold Matrix
High-visibility categorical status cards designed for rapid human visual triage:
* **Status Pill**:
  - `[NOMINAL - CLEAR WATER]` (Teal border, steady glow)
  - `[ELEVATED - DESANDER FLUSH REQUIRED]` (Amber border, pulsing ring)
  - `[CRITICAL - SHUTDOWN / LOAD SHED ADVISORY]` (Crimson border, high-visibility flash)
* **Threshold Ledger**:
  - Shows `Metric`, `Current Sensor Value`, `Regulatory / Structural Limit`, and `Margin / Percentage Over Limit`.
  - Every threshold has a deterministic status badge: `[OK]`, `[WARNING]`, or `[BREACH]`.

---

### Zone D: Point-by-Point Structured Data Ledger
Zero conversational prose. Structured key-value telemetry pairs:
* **Plant Metadata**: Station ID, Basin, Head, Design Flow, Online Turbines.
* **Prescribed Actuator Modifications**:
  - `Gate ID`: Exact numerical gate index.
  - `Target Flow`: Value in $\text{m}^3/\text{s}$ with delta from current.
  - `Execution Window`: Countdown in seconds.
* **Expected Benefit & Wear Avoided**: Exact millimeters of runner steel saved and simulated financial cost avoidance.

---

## 4. Output Formatting Engine: Structured Schema Architecture

To guarantee the LLM never outputs conversational filler, we implement the **VAR Telemetry Output Protocol**:

### 4.1 Strict Pydantic Schema (`hydromesh/schemas.py`)
```python
class VARLayerStatus(BaseModel):
    layer_id: str
    layer_name: str
    status: Literal["PASS", "WARNING", "BREACH", "SKIPPED"]
    metric_summary: str
    verification_hash: str | None = None

class VAREquationTrace(BaseModel):
    equation_name: str
    formula: str
    substituted_values: str
    result_with_units: str
    baseline_comparison: str
    is_safe: bool

class VARThresholdCheck(BaseModel):
    metric_name: str
    current_value: float
    limit_value: float
    unit: str
    status: Literal["PASS", "WARNING", "BREACH"]
    pct_deviation: float

class VARScreenPayload(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    timestamp_iso: str
    plant_id: str
    plant_name: str
    risk_level: Literal["NOMINAL", "ELEVATED", "CRITICAL"]
    action_type: Literal["CONTINUE_NORMAL", "TRIGGER_FLUSH", "MODULATE_INTAKE", "EMERGENCY_SHUTDOWN"]
    is_advisory: Literal[True] = True
    layers: tuple[VARLayerStatus, ...]
    math_traces: tuple[VAREquationTrace, ...]
    threshold_checks: tuple[VARThresholdCheck, ...]
    ledger_points: tuple[str, ...]
```

### 4.2 System Prompt Transformation (`hydromesh/agents/explain.py`)
The system prompt is stripped of any instruction allowing conversational greeting:
> *"You are an industrial SCADA VAR Telemetry Engine. NEVER write greetings, apologies, or conversational paragraphs. You output ONLY structured VAR inspection data frames containing mathematical traces, layer fulfillment statuses, and point-by-point telemetry audits."*

---

## 5. UI/UX Component Architecture (`web/components/VARScreenHUD.tsx`)

1. **Design Tokens & Aesthetic**:
   - Background: Dark Mountain Lapis (`--color-bg: #2A2C6B`).
   - Frame Borders: Crisp 1px geometric gridlines (`--color-sky-dark: #3E428F`).
   - Accent Neon: Terminal Cyan (`#38BDF8`), Warning Amber (`#F59E0B`), Critical Crimson (`#EF4444`).
   - Typography: 100% Monospace (`JetBrains Mono` or `Courier New`) for mathematical alignment.
2. **Interactive Controls**:
   - **Freeze-Frame Toggle**: Pause live telemetry to inspect mathematical equation steps.
   - **Layer Inspector**: Click any layer box (e.g. `Layer 04: SOP RAG`) to expand the exact vector chunk and cosine score.
   - **Copy Raw VAR Telemetry**: Export as structured JSON/Markdown for station logbooks.

---

## 6. Implementation Roadmap

- [ ] **Phase 1: Math Engine & Schemas**
  - Define `VARScreenPayload` schema in `hydromesh/schemas.py`.
  - Add equation derivation string builder in `hydromesh/twin/plant.py` and `hydromesh/safety.py`.
- [ ] **Phase 2: Agent Output Formatting**
  - Update `ExplainAgent` to serialize decisions into `VARScreenPayload`.
  - Enforce zero-prose fallback if LLM emits non-compliant markdown.
- [ ] **Phase 3: Frontend VAR Chamber HUD**
  - Create `web/components/VARScreenHUD.tsx` with box lines and live math display.
  - Mount beside `PipelineEvaluationCard` on the `/demo` mission control page.
