# HydroMesh Frontend Quality Assurance & Acceptance Checklists

> Verification gates for visual fidelity, responsiveness, accessibility, performance, and honesty.

---

## 1. Visual Fidelity Checklist
- [ ] No raw hex codes used directly inside components; all styles reference CSS variables from `docs/web/design.md`.
- [ ] Hero illustration matches the 14-layer vector specification in `docs/web/illustration.md`.
- [ ] Font families correctly loaded: `Inter` for UI typography, `JetBrains Mono` for telemetry and stream data.
- [ ] Status colors align with 3-tier matrix: Green (`#4CAF82`), Yellow (`#D4B94A`), Red (`#E05050`).

---

## 2. Responsive Design Checklist
- [ ] Mobile viewports (375px – 430px): stacked card layouts, readable gauges, hidden complex SVG background or responsive scale.
- [ ] Tablet viewports (768px – 1024px): 2-column dashboard layout.
- [ ] Desktop viewports (1280px – 1920px): full 3-column control room dashboard.

---

## 3. Accessibility (WCAG 2.1 AA) Checklist
- [ ] Contrast ratios between text and background exceed 4.5:1 across all surfaces.
- [ ] Focus indicators visible on all interactive elements (`outline: 2px solid var(--color-cloud-rim)`).
- [ ] ARIA attributes present on all gauges, icon buttons, and animated status pills.
- [ ] `prefers-reduced-motion` media queries disable all ambient SVG loops and particle animations.

---

## 4. Performance Checklist
- [ ] Initial bundle size < 200 KB gzipped.
- [ ] WebSocket event handling buffers updates without frame dropping at 10 Hz event rates.
- [ ] Zero memory leaks over a 15-minute continuous scenario simulation run.

---

## 5. Honesty & Compliance Checklist
- [ ] Prominent disclaimer banner present on `/`, `/demo`, `/safety`, `/evidence`, and `/about`.
- [ ] All metrics labeled as simulated.
- [ ] Advisory nature of dispatch explicitly declared (no claims of direct SCADA actuation).
