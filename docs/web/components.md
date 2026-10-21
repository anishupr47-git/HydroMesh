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
