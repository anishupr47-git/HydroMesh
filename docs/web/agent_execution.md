# HydroMesh Frontend Agent Task Cards (W00–W20)

> Parallel execution roadmap for the Next.js frontend accompanying backend task cards T00–T20.

---

| Card | Backend Pair | Scope & Objectives | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **W00** | T00 | Next.js App Router scaffold + Tailwind + CSS tokens | `npm run dev` builds clean; design tokens loaded |
| **W01** | T01 | Layout shell with navbar, footer, and disclaimer banner | Navigation links active across all 5 routes |
| **W02** | T02 | TypeScript type generation matching `schemas.py` | Types match frozen Pydantic contracts |
| **W03** | T03 | WebSocket client setup for Redis Stream proxy | Handles connection, heartbeat, and reconnection |
| **W04** | T04 | Error boundary and fallback UI components | Displays friendly banner on backend API outage |
| **W05** | T05 | Plant twin status widget (seed indicator, tick meter) | Renders simulation tick rate |
| **W06** | T06 | Safety rule inspection drawer on `/safety` | Interactive viewer for R1–R11 rule definitions |
| **W07** | T07 | Triage anomaly pill display in dashboard header | Updates color indicator on severity transitions |
| **W08** | T08 | SOP preview modal with synthetic document viewer | Displays rendered markdown of matched SOPs |
| **W09** | T09 | Dual-axis forecast chart with uncertainty band | 12–24h discharge & silt projection |
| **W10** | T10 | Dispatch action card with rationale breakdown | Highlights proposed vs clamped parameters |
| **W11** | T11 | Supervisor plan step visualizer (stepper timeline) | Displays agent pipeline progress |
| **W12** | T12 | Incident history log with ChromaDB search bar | Search past simulated incident reports |
| **W13** | T13 | End-to-end scenario replay controller | Play/pause/step controls for scenario testing |
| **W14** | T14 | LiveStream component integration with API stream | Real-time events scroll with colored borders |
| **W15** | T15 | Dashboard responsive grid layout on `/demo` | Clean rendering on 1080p and mobile |
| **W16** | T16 | TwinGauges live dials (discharge, silt, MW, wear) | Animated SVG dials with status coloring |
| **W17** | T17 | OverrideButton with active 600s countdown timer | Button aborts pending advisory action |
| **W18** | T18 | Evidence benchmark comparison table on `/evidence` | Interactive table with sorting & export |
| **W19** | T19 | HeroIllustration 14-layer animated SVG on `/` | Responsive 1440x810 scene with keyframe motion |
| **W20** | T20 | Cross-browser testing, SEO metadata, release polish | Lighthouse score > 90 across performance/a11y |
| **W21** | T21 | User Journey 4-Phase State Machine (Splash, Auth, Intro, Dashboard) | Full seamless transition with skip toggle |
| **W22** | T22 | 20-Powerhouse Grid & Left Inspector Panel | Interactive 20-card isometric SCADA view |

