# HydroMesh Sprint 5: Energy Revenue Outlook Agent
> **Master Execution Plan & Technical Specification**  
> **Status**: Planned (Sprint 5)  
> **Core Objective**: Implement an operational economics intelligence agent that answers:  
> *"Given the hydrology forecast and silt risk, what happens to this plant's revenue and maintenance cost over the next 24 hours to 7 days?"*  
> **Positioning**: Sits directly adjacent to the **🧠 Multi-Agent AI Pipeline Evaluation (Marsyangdi Hydropower Station)** in Mission Control to demonstrate the coupling of physical deep-learning forecasting with operational economics.

---

## 1. Executive Summary & North Star

While Sprints 1–4 solved the **physical safety and multi-agent dispatch** challenge of Himalayan run-of-river plants, plant managers and grid dispatchers make decisions based on **economic trade-offs**:
* *Should we throttle intake during a 2,500 PPM silt pulse and forfeit NPR 4.5 Lakhs in spot generation, or keep running and incur NPR 12 Lakhs in accelerated quartz runner abrasion?*

The **Energy Revenue Outlook Agent** (`EnergyRevenueOutlookAgent`) bridges physics-informed hydrology to operational balance sheets:
1. **Deterministic Financial Math First**: All MWh projections, revenue calculations, curtailed energy costs, and IEC 62364 wear savings are calculated by pure, unit-tested deterministic formulas.
2. **LLM as the Economic Explainer**: The open-weight LLM never calculates financial figures; it receives pre-computed deterministic financial metrics and generates crisp, executive-grade natural language explanations.
3. **Strict Air-Gap**: The financial agent runs in an isolated read-only thread. It has **zero actuation capability**, cannot call gate functions, and cannot influence the deterministic safety kernel (Rules R1–R11).

---

## 2. System Architecture & Placement

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MISSION CONTROL COCKPIT (DUAL HORIZON)                          │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ 🧠 PHYSICAL AGENT PIPELINE               │ 💰 ENERGY REVENUE OUTLOOK AGENT             │
│ (Operational & Safety Kernel)            │ (Economic & Balance Sheet Intelligence)     │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ • Telemetry Ingestion (DHM / IMERG)      │ • User PPA Tariff (e.g. NPR 4.80/8.40/kWh)   │
│ • Triage Agent (AnomalyVector)           │ • Fixed & Variable O&M Rates                │
│ • Supervisor Agent (RoutingPlan)         │ • Deterministic Revenue Engine (MWh / Risk) │
│ • Predictive Agent (Peak Q / Silt PPM)   │ • Avoided Runner Wear Savings (IEC 62364)   │
│ • SOP RAG (ChromaDB + all-MiniLM-L6-v2)  │ • Outlook Classification: Favorable/Adverse │
│ • Dispatch Agent (Modulate / Flush)      │ • Top Economic Drivers Ranking              │
│ • Deterministic Safety Kernel (R1-R11)   │ • LLM Executive Economic Narrative          │
│ • Actuation: Plant Twin & Monitored Gates│ • Advisory Stance: Accumulate / Hold / Hedge│
│                                          │   [SIMULATED - EDUCATIONAL - NO TRADING]    │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 3. Deterministic Mathematical Formulation

All numbers are computed by `hydromesh/economics/math.py` before any LLM prompt is assembled.

### 3.1 Hydrological Power Output ($P_t$) & Expected Generation ($E_\text{total}$)
For each hour $t \in [1, H]$ where horizon $H \in \{24, 72, 168\}$:
$$P_t = \min\left(\eta \cdot \rho \cdot g \cdot Q_{\text{eff}, t} \cdot H_{\text{net}} \cdot 10^{-6},\; P_{\text{rated}}\right) \quad [\text{MW}]$$
$$E_{\text{expected}} = \sum_{t=1}^{H} P_t \cdot \Delta t \quad [\text{MWh}]$$
* $Q_{\text{eff}, t} = \max(0, Q_t - Q_{\text{flush}} - Q_{\text{bypass}})$: Effective generation discharge.
* $\eta = 0.89$: Water-to-wire combined turbine-generator efficiency.
* $\rho = 1000\text{ kg/m}^3, g = 9.81\text{ m/s}^2, H_{\text{net}} = \text{Design Head [m]}$.

### 3.2 Baseline Revenue & Revenue at Risk ($R_{\text{risk}}$)
$$R_{\text{baseline}} = \sum_{t=1}^{H} \min\left(P_{\text{rated}}, \eta \rho g Q_t H_{\text{net}} \cdot 10^{-6}\right) \cdot \text{Tariff} \quad [\text{NPR or USD}]$$
$$R_{\text{realized}} = \sum_{t=1}^{H} P_t \cdot \text{Tariff}$$
$$R_{\text{risk}} = R_{\text{baseline}} - R_{\text{realized}}$$
*When river silt exceeds the critical threshold ($> 3,000\text{ PPM}$) or desander gates are flushed, lost generation during curtailment constitutes **Revenue at Risk**.*

### 3.3 Avoided Turbine Wear Cost ($C_{\text{avoided}}$)
Coupled directly to the IEC 62364 erosion model:
$$\Delta W_t = 10^{-9} \cdot K_m \cdot C_t \cdot (W_{\text{rel}})^{2.5} \cdot K_{\text{hardness}} \quad [\text{mm/h}]$$
$$\text{Wear}_{\text{unmitigated}} = \sum_{t=1}^{H} \Delta W_t(C_t, Q_t)$$
$$\text{Wear}_{\text{mitigated}} = \sum_{t=1}^{H} \Delta W_t(C_{\text{filtered}, t}, Q_{\text{eff}, t})$$
$$C_{\text{avoided}} = \left(\frac{\text{Wear}_{\text{unmitigated}} - \text{Wear}_{\text{mitigated}}}{W_{\text{critical}}}\right) \times C_{\text{overhaul}}$$
* $W_{\text{critical}} = 3.5\text{ mm}$ (Maximum runner erosion depth before emergency replacement).
* $C_{\text{overhaul}} = \text{NPR } 8,000,000$ (Standard Francis runner hard-facing and refurbishment cost).

### 3.4 Net Economic Margin & Outlook Scoring
$$\text{Net Margin} = R_{\text{realized}} + C_{\text{avoided}} - R_{\text{baseline}}$$
The categorical outlook is determined deterministically:
$$\text{Outlook} = \begin{cases} 
\text{FAVORABLE} & \text{if } R_{\text{risk}} < 0.05 \cdot R_{\text{baseline}} \text{ and } \text{Wear} < 0.01\text{ mm} \\ 
\text{ADVERSE} & \text{if } R_{\text{risk}} > 0.25 \cdot R_{\text{baseline}} \text{ or Silt} > 3,000\text{ PPM} \\ 
\text{NEUTRAL} & \text{otherwise} 
\end{cases}$$

---

## 4. Guardrail Invariants (Non-Negotiable)

| Invariant | Implementation Mechanism | Failure Behavior |
| :--- | :--- | :--- |
| **G1: Deterministic Numbers Rule** | Numbers computed in Python; LLM only formats & explains. | Any discrepancy between LLM text and math triggers fallback to standard template. |
| **G2: Air-Gapped Control Loop** | Economic agent lives in separate module `hydromesh/economics/`; imports zero actuators. | Architectural barrier: has no access to `PlantTwin.apply()` or `SafetyValidator`. |
| **G3: Strictly Advisory (No Trades)** | Output tagged `advisory: Literal[True]`. Zero API hooks to external brokers or trading desks. | Read-only reporting. |
| **G4: Prominent Disclaimer** | Enforced by Pydantic schema validation: `disclaimer: Literal[...]`. | Output rejected if disclaimer string is missing or modified. |

> **Statutory Disclaimer Invariant**:  
> *"SIMULATED SCENARIO FOR OPERATIONAL & EDUCATIONAL PLANNING ONLY. DOES NOT CONSTITUTE FINANCIAL, INVESTMENT, COMMODITY, OR LEGAL ADVICE. PROJECTIONS ARE DERIVED FROM STYLIZED HYDROLOGICAL SIMULATIONS."*

---

## 5. Frozen Schema Specifications (`hydromesh/schemas.py`)

```python
class EconomicOutlook(StrEnum):
    FAVORABLE = "favorable"
    NEUTRAL = "neutral"
    ADVERSE = "adverse"

class IllustrativeStance(StrEnum):
    INVEST = "accumulate_generation"
    HOLD = "maintain_baseload"
    HEDGE = "preserve_capital_protect_equipment"

class EconomicInputs(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    horizon_hours: Literal[24, 72, 168] = 24
    ppa_tariff_npr_kwh: float = Field(ge=0.5, le=50.0, default=4.80)
    overhaul_cost_npr: float = Field(ge=100_000.0, le=50_000_000.0, default=8_000_000.0)
    fixed_om_cost_per_day_npr: float = Field(ge=0.0, default=50_000.0)

class DeterministicFinancialMetrics(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    expected_energy_mwh: float = Field(ge=0.0)
    baseline_revenue_npr: float = Field(ge=0.0)
    realized_revenue_npr: float = Field(ge=0.0)
    revenue_at_risk_npr: float = Field(ge=0.0)
    avoided_wear_cost_npr: float = Field(ge=0.0)
    net_economic_benefit_npr: float
    erosion_depth_mitigated_mm: float = Field(ge=0.0)
    outlook: EconomicOutlook
    confidence: float = Field(ge=0.0, le=1.0)
    top_drivers: tuple[str, ...] = Field(max_length=5)

class RevenueOutlookReport(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    metrics: DeterministicFinancialMetrics
    executive_summary: str = Field(max_length=1000)
    illustrative_stance: IllustrativeStance
    disclaimer: str = Field(default=MANDATORY_FINANCIAL_DISCLAIMER)
    generated_at: datetime
```

---

## 6. UI Implementation: Side-by-Side Mission Control Cockpit

Located in `web/components/RevenueOutlookCard.tsx` positioned directly beside `PipelineEvaluationCard.tsx`:

1. **Top Metric Strip**:
   - `Expected Generation`: Large monospace MWh readout with 24h trend sparkline.
   - `Revenue at Risk`: Highlighted in amber `--color-sand-amber` with breakdown of lost generation vs desander flushing.
   - `Avoided Wear Cost`: Highlighted in emerald `--color-foam-white` with runner life extension percentage.
2. **Economic Outlook Badge**:
   - `[FAVORABLE]` (Teal pulse) | `[NEUTRAL]` (Indigo border) | `[ADVERSE]` (Crimson alert glow).
   - Confidence bar (e.g. `94% Confidence`).
3. **Top Drivers Breakdown List**:
   - Ranked 1–3 cards: e.g., *"1. High quartz sediment spike (2,840 PPM) forcing 2-basin flushing"*, *"2. Peak river discharge (880 m³/s) operating at 100% capacity"*.
4. **Interactive Tariff Sliders**:
   - Operator can adjust PPA Tariff (NPR/kWh) and Overhaul Cost dynamically to recalculate metrics instantly.
5. **LLM Executive Briefing Box**:
   - Clear, non-technical plain English summary synthesized by `qwen2.5` from the deterministic math.
6. **Prominent Legal Disclaimer Banner**:
   - Permanent 11px uppercase monospace disclaimer with lock icon.

---

## 7. Phased Implementation Milestones (Sprint 5)

### Phase 1: Pure Deterministic Economics Engine (`hydromesh/economics/`)
- [ ] **T21**: Implement `hydromesh/economics/math.py` with 100% pure, deterministic equations for MWh, PPA billing, and IEC 62364 wear dollarization.
- [ ] **T22**: Add `DeterministicFinancialMetrics` and `EconomicInputs` to `hydromesh/schemas.py`.

### Phase 2: Agent Orchestration & LLM Prompting
- [ ] **T23**: Implement `EnergyRevenueOutlookAgent` in `hydromesh/agents/revenue.py` with zero hallucination constraints (numeric verification gate).
- [ ] **T24**: Expose FastAPI endpoint `POST /api/plants/{site_id}/revenue-outlook` with rate limiting and cache TTL.

### Phase 3: Frontend Cockpit Integration
- [ ] **T25**: Build `RevenueOutlookCard.tsx` in `web/components/` and dock beside `PipelineEvaluationCard` on `/demo`.
- [ ] **T26**: Add interactive scenario comparison mode (Compare "Normal Operation" vs "Proactive Flushing" P&L).

---

## 8. Verification & Test Plan

1. **Unit Testing (`tests/unit/test_economics.py`)**:
   - Test 1: Zero discharge produces zero MWh and zero revenue.
   - Test 2: Extreme silt ($> 3,000\text{ PPM}$) calculates positive avoided wear savings when gates are throttled.
   - Test 3: Clamped tariff and overhaul bounds strictly reject negative inputs.
2. **Security & Air-Gap Testing (`tests/security/test_revenue_airgap.py`)**:
   - Verify `EnergyRevenueOutlookAgent` cannot import or access actuator modules.
   - Verify LLM prompt contains zero sensitive API keys or telemetry secrets.
   - Verify `test_llm_numeric_consistency`: asserts that every digit in the LLM text output matches the deterministic math engine.
3. **Coverage Guarantee**: Maintain >90% test coverage with zero lint or typing errors (`mypy --strict`).
