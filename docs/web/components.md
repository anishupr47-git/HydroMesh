# HydroMesh Web Component Specification

> Props, states, and visual requirements for key dashboard and marketing components.

---

## 1. LiveStream (`web/components/LiveStream.tsx`)
- **Role**: Displays incoming `AgentEvent` objects from the WebSocket stream `/ws/stream`.
- **Props**:
  - `events: AgentEvent[]`
  - `maxItems?: number` (default: 50)
- **Visuals**:
  - Monospace font (`var(--font-mono)`), text size `var(--text-sm)`.
  - Left border indicator colored by event kind:
    - `info`: Periwinkle (`#6B72B5`)
    - `decision`: Amber (`#D4A830`)
    - `warning`: Yellow (`#D4B94A`)
    - `action`: Green (`#4CAF82`)
  - New rows animate with `agent-event-in` (180ms ease-out).

---

## 2. TwinGauges (`web/components/TwinGauges.tsx`)
- **Role**: Real-time dials/bars for plant telemetry and digital twin state.
- **Props**:
  - `dischargeM3s: number`
  - `siltPpm: number`
  - `generationMw: number`
  - `runnerWearMm: number`
- **Visuals**:
  - Bold monospace numbers in pure white (`#FFFFFF`).
  - Progress tracks using `--color-surface-raised` background.
  - Silt gauge dynamically transitions color: Green (< 1,200), Yellow (1,200–3,000), Red (> 3,000).

---

## 3. ForecastChart (`web/components/ForecastChart.tsx`)
- **Role**: Renders 12–24h discharge and silt forecasts using Recharts.
- **Props**:
  - `historical: Telemetry[]`
  - `forecast: Forecast`
- **Visuals**:
  - Line/Area chart with dual y-axes (Discharge on left, PPM on right).
  - Shaded 90% confidence uncertainty band.
  - Threshold reference lines at 1,200 PPM (Yellow) and 3,000 PPM (Red).

---

## 4. IncidentCard (`web/components/IncidentCard.tsx`)
- **Role**: Summarizes an active or resolved incident report.
- **Props**:
  - `incident: IncidentReport`
- **Visuals**:
  - Card container with `var(--color-surface)` and 1px border.
  - Badges for status, severity, and rule evaluation status.
  - Hover elevation with `card-hover`.

---

## 5. ScenarioControls (`web/components/ScenarioControls.tsx`)
- **Role**: Allows the operator to inject synthetic digital twin scenarios.
- **Props**:
  - `onSelectScenario: (name: string) => Promise<void>`
  - `isSimulating: boolean`
- **Scenarios**:
  - `monsoon_surge` (rapid discharge & sediment spike)
  - `desander_clog` (reduced desander transit efficiency)
  - `grid_curtailment` (sudden load rejection)
  - `combined` (surge + basin maintenance)

---

## 6. OverrideButton (`web/components/OverrideButton.tsx`)
- **Role**: Emergency operator override button with active 600s countdown.
- **Props**:
  - `expiresAt: string` (ISO timestamp)
  - `onOverride: () => void`
  - `disabled?: boolean`
- **Visuals**:
  - Prominent amber button with pulsing countdown timer.
  - Clicking triggers immediate override mutation before expiration.

---

## 7. InspectorPanel (`web/components/InspectorPanel.tsx`)
- **Role**: Left-docked telemetry & SOP markdown inspector panel.
- **Features**:
  - Real-time sensor feed (Discharge, Silt, Temperature, Vibration).
  - Active SOP status with SHA-256 cryptographic verification token.
  - Multi-agent live decision event stream with expandable rationales.

---

## 8. PowerhouseCard (`web/components/PowerhouseCard.tsx`)
- **Role**: Stylized industrial powerhouse block representing 1 of 20 Nepal hydro stations.
- **Visuals**:
  - Gable roof silhouette, intake penstock line, glowing control room window.
  - Monospace metrics: Capacity (MW), River Discharge (m³/s), Silt Level (PPM).
  - Hover glow with `--color-cloud-rim` and click navigation to plant detail view.

---

## 9. GlobalFooter (`web/components/GlobalFooter.tsx`)
- **Role**: Responsive 4-column legal, operational, and non-liability footer.
- **Visuals**:
  - Subdued background `--color-bg` with 1px border `--color-sky-dark`.
  - Column 1: System Status & Deterministic Safety Invariant badge (`advisory: Literal[True]`).
  - Column 2: Legal Safeguards & Statutory Non-Liability Safe Harbor links.
  - Column 3: Emergency Dispatch Hotline & Station Control Room customizable slots.
  - Column 4: Privacy & Zero-Surveillance Cookie TTL policy indicators.

---

## 10. VARScreenHUD (`web/components/VARScreenHUD.tsx`)
- **Role**: Industrial AI Decision Verification Chamber displaying multi-layer wireframe box traces and live mathematical derivations.
- **Visuals**:
  - 4-Zone SCADA grid: Layer Fulfillment Boxes, Live Math Proofs, Risk Diagnostic Matrix, and Point-by-Point Data Ledger.
  - Flowing vector box lines with animated dash strokes connecting Layers 1 through 6.
  - High-visibility risk pills (`[NOMINAL]`, `[ELEVATED]`, `[CRITICAL_RISK]`).
  - 100% monospace typography (`JetBrains Mono`) with KaTeX/ASCII equation substitution traces.

---

## 11. SatelliteFeedBox (`web/components/SatelliteFeedBox.tsx`)
- **Role**: Unobtrusive lower-left corner real-time satellite telemetry widget fetched each second.
- **Visuals**:
  - Solid dark SCADA container with 94% opacity (`--color-surface`, `w-72`, fixed `bottom-4 left-4 z-30`).
  - 1 Hz blinking monospace status beacon: `[SAT-LINK: ACTIVE] [TICK: 1.00s]`.
  - Real-time Upper Tamakoshi GPS coordinates (`27.8483 N, 86.1361 E | Elev: 822 m`), NASA GPM IMERG rain rate (34.8 mm/h), ERA5-Land moisture flux (46.8 kg/m*s), and ECMWF 0.25 deg optical radiance (212.4 K).
  - Telemetry ingestion latency: `[PING: 28 ms] [STATUS: HTTP 200 OK]` with rolling BLAKE2b verification token.
  - Collapse toggle to shrink into an unobtrusive 32px status badge.





