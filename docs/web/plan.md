# HydroMesh Web Platform Plan & Sitemap

> Architecture, route structure, and milestones for the Next.js frontend.

---

## 1. 5-Route Sitemap

| Route | Purpose | Key Components |
| :--- | :--- | :--- |
| `/` | Hero, 30-second value proposition, problem framing, technology stack | `HeroIllustration`, `FeatureGrid`, `ArchitectureOverview` |
| `/demo` | Real-time digital twin control room dashboard | `LiveStream`, `TwinGauges`, `ForecastChart`, `ScenarioControls`, `OverrideButton` |
| `/safety` | R1–R11 deterministic rule explainer and fail-closed documentation | `RuleMatrixTable`, `FailClosedDiagram`, `DisclaimerBanner` |
| `/evidence` | Baseline evaluation benchmark (Simulated vs Reactive) | `BenchmarkTable`, `WearProgressionChart`, `MethodologyNotes` |
| `/about` | Technical background, Himalayan hydrology context, open-source repository | `AuthorBio`, `CitationBlock`, `GitHubLink` |

---

## 2. Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS + custom CSS design tokens
- **Data Visualization**: Recharts (for telemetry and forecast curves)
- **Network / Streaming**: native WebSocket (`/ws/stream`) + fetch client

---

## 3. Data Flow

```
FastAPI Server (:8000)
  ├── /api/telemetry       ──> Next.js Server Components / SSR
  ├── /api/scenarios/run   ──> Operator action triggers
  └── /ws/stream           ──> LiveStream & TwinGauges (client-side hooks)
```

---

## 4. Development Milestones

- **W00 (Push 8)**: Next.js scaffolding with TypeScript, Tailwind, and stub routes.
- **W01 (T15)**: Implement `LiveStream` connected to FastAPI `/ws/stream`.
- **W02 (T16)**: Build `TwinGauges`, `ForecastChart`, `IncidentCard`, and `ScenarioControls`.
- **W03 (T17)**: Add `OverrideButton` with interactive 600s countdown timer.
- **W04 (T18)**: Build `/evidence` benchmark table.
- **W05 (T19)**: Render animated `HeroIllustration` SVG and finalize styling.
- **W06 (Sprint 4)**: Implement 4-Phase User Journey State Machine (`splash` -> `auth` -> `intro` -> `dashboard`).
- **W07 (Sprint 4)**: Implement 20-Powerhouse Grid with interactive station cards, left-docked inspector panel, and individual plant deep-dive.
- **W08 (Sprint 4)**: Implement `GlobalFooter` with Statutory Safe Harbor disclaimers, essential cookie policies, and operator support placeholders.


