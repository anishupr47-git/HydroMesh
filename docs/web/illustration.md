# HydroMesh Hero Illustration Specification (SVG)

> Technical specification for the original 14-layer hero vector illustration recreating the Himalayan dusk fortress & waterfall composition.

---

## 1. Canvas Setup

```xml
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1440 810"
  preserveAspectRatio="xMidYMid slice"
  role="img"
  aria-label="Flat-vector illustration of a Himalayan fortress with a waterfall at dusk"
>
  <defs>
    <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#2A2C6B" />
      <stop offset="45%"  stop-color="#3D4590" />
      <stop offset="100%" stop-color="#6B72B5" />
    </linearGradient>
    <radialGradient id="window-glow-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#F0C860" stop-opacity="1" />
      <stop offset="60%"  stop-color="#D4A830" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#D4A830" stop-opacity="0" />
    </radialGradient>
    <pattern id="waterfall-pattern" width="100" height="24" patternUnits="userSpaceOnUse">
      <line x1="0" y1="6" x2="100" y2="6" stroke="#FFFFFF" stroke-width="2" opacity="0.7"/>
      <line x1="0" y1="18" x2="100" y2="18" stroke="#FFFFFF" stroke-width="1.5" opacity="0.9"/>
    </pattern>
  </defs>
  <!-- Layers 0 through 14 -->
</svg>
```

---

## 2. Layer-by-Layer Architecture

### L0: Sky Background
- `<rect width="1440" height="810" fill="url(#sky-grad)" />`

### L1: Distant Mountains
- Color `#353870`, opacity 0.4. Low polygon silhouette across viewport, peak height $\approx y=420$.

### L2 & L3: Left & Right Clouds
- Body fill: `#5B6B80`. Underside: `#3F4F60`.
- Golden rim light top stroke: `#D4B94A`, stroke width 4.
- Left cluster: $x=0\dots600, y=0\dots320$. Right cluster: $x=900\dots1440, y=0\dots280$.

### L4: Cliff / Rock Mass
- Color: `#2A3040` (main face), `#353D50` (mid-lit ledges).
- Trapezoidal mass ($x=300\dots1100$ top, tapering to $x=580\dots860$ base).
- Central waterfall cleft notch $\approx 80\text{px}$ wide.

### L5: Upper Fortress (Terracotta)
- Body: `#7A5C48`, shadow `#5E4538`, voids `#1A1010`.
- Main keep ($x=350\dots750, y=100\dots260$), twin flanking towers, arched openings, crenellations.

### L6: Lower Building (Glowing Amber Room)
- Body: `#4A3830`, windows `#D4A830` with `#F0C860` bloom.
- Main block $x=680\dots900, y=270\dots440$, 3 arched amber windows with soft radial ambient spill.

### L7: Rim-Lit Cliff Edges
- Path along cliff ledges with `stroke="#D4B94A" stroke-width="2"`.

### L8 & L9: Waterfall (Tier 1 & Tier 2)
- Pure white `#FFFFFF`.
- Tier 1: $x=690\dots760, y=200\dots390$.
- Tier 2: $x=670\dots790, y=390\dots580$ (widening trapezoid cascade with turbulent zigzag edges).

### L10: Splash Pool & Mist Circles
- Body `#D0D8E0`, deep edges `#A8B4C0`. Ellipse at $x=580\dots870, y=590\dots650$.
- Floating mist circles with staggered `mist-pulse` animations.

### L11 & L12: Cypress Trees (Left & Right)
- Color: `#1A1F2E` (near-black navy silhouettes).
- Left: 5–7 tall cypress shapes ($x=0\dots280, y=680\dots720$).
- Right: 4–5 cypress shapes ($x=1160\dots1440$).

### L13: Foreground Ground Strip & Bushes
- Ground strip `#0F1218` ($y=760\dots810$), rounded bushes `#141820`.

### L14: Mist Particles
- Small white circles ($r=3\dots8\text{px}$), rising with `mist-float` keyframes.

---

## 3. Next.js Component Integration

```tsx
// web/components/HeroIllustration.tsx
export function HeroIllustration() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* 1440x810 SVG canvas rendered inline for direct CSS class animation access */}
    </div>
  );
}
```

---

## 4. Asset & Licensing Note
The reference composition is a study; the output SVG is an original artwork created from vector primitives. Shipped code contains zero third-party binary images.
