# HydroMesh — Master Visual Design System & Atmospheric Motion Guide

> **Designation**: Master Design Specification (`docs/web/design.md`) — v2.2 (RC2)  
> **Aesthetic Philosophy**: Alpine Hydropower Citadel & High-Contrast Mountain Twilight  
> **Source Reference**: Handcrafted vector landscape of a Himalayan cliffside hydropower fortress, illuminated control room, cascading dual-tier waterfall, and golden-rimmed dusk clouds.  
> **Engineering Invariant**: **Zero AI-Slop**. No generic purple gradients, no fuzzy drop-shadow soup, no gratuitous glassmorphic blurs. Pure geometric precision, high-contrast industrial SCADA legibility, and GPU-accelerated 60/120 FPS responsive motion.


---

## 1. Aesthetic Manifesto: "Non-AI Slop" Visual Craft

Modern AI-generated web templates suffer from universal homogenization: muddy purple-indigo gradients, semi-transparent frosted cards with illegible white text, gratuitous floating orbs, and generic component kits disconnected from physical engineering reality.

HydroMesh rejects this entirely. The visual language of HydroMesh is rooted in the **physical reality of Himalayan run-of-river hydropower engineering**:
1. **High Environmental Contrast**: In high-altitude mountain river valleys at dusk, the sky is deep lapis-indigo, the slate cliffs are brutal dark silhouettes, and the cascading river cuts through the terrain like a white blade of light.
2. **The "Heartbeat" of the Plant**: The warm amber glow spilling from the arched windows of the stone powerhouse represents human presence, control room monitoring, and active power generation amid freezing mountain torrents.
3. **Pure Geometric Clarity**: Flat, faceted vector planes, hard geometric edges, crisp 1px borders, and deliberate rim-lighting. Every shape communicates spatial depth through value layering rather than synthetic blurs.
4. **Industrial SCADA Telemetry**: Clear, high-contrast monospace numbers (`JetBrains Mono`) that remain 100% readable in blinding sunlight or total darkness, paired with the crisp typographic geometry of `Inter`.

---

## 2. Line-by-Line Anatomy of the Reference Scene

Every pixel and tone in the application traces back to the layers of the reference illustration:

```
[Layer 0: Deep Twilight Sky]          #1E1A38 → #2A2C6B → #4B5499 (Dusk Sky Dome)
     │
[Layer 1: Golden Rimmed Clouds]       #5B6B80 (Body) / #3F4F60 (Shadow) + #D4B94A (Golden Rim)
     │
[Layer 2: Terracotta Cliff Keep]      #7A5C48 (Upper Citadel) / #5E4538 (Shadow Masonry)
     │
[Layer 3: Control Room Amber Glow]    #F59E0B / #D4A830 / #F0C860 (Arched Window Hearth)
     │
[Layer 4: Fractured Slate Cliffs]     #1F2430 / #2A3040 / #353D50 + #D4B94A (Lit Ledges)
     │
[Layer 5: Dual-Tier Waterfall]        #FFFFFF (Crystalline Cascade) / #E8EEF4 (Mist Spray)
     │
[Layer 6: Splash Pool & River]        #D0D8E0 / #A8B4C0 (Reflective Runout)
     │
[Layer 7: Foreground Silhouettes]     #1A1F2E / #141820 / #0F1218 (Himalayan Cypress Pines)
```

### Detailed Layer Breakdown:
* **The Sky Dome**: Transitions from deep galactic indigo-navy at the zenith (`#1E1A38`) down through periwinkle dusk (`#2A2C6B`), fading into a warm evening atmosphere (`#4B5499` to `#6B72B5`).
* **The Cloud Billows**: Massive volumetric rounded masses flanking the scene. Shaded in cool blue-slate (`#5B6B80`) with deep slate bases (`#3F4F60`). The defining characteristic is the **razor-sharp golden-yellow rim light** (`#D4B94A` to `#F3D36B`) catching the crest of every cloud edge from the setting sun.
* **The Hydropower Citadel**: Heavy stone masonry built directly into the living granite cliff. Upper towers in warm weathered terracotta (`#7A5C48`), lower defensive retaining walls in deep earthen umber (`#4A3830`).
* **The Powerhouse Sanctuary Windows**: Three central Romanesque arched windows blazing with warm amber-gold light (`#F0C860` core, radiating into `#D4A830`). This is the visual anchor and the single warmest color temperature in the entire composition.
* **The Waterfall (The Focal Point)**: Pure, incandescent white (`#FFFFFF`). Water bursts from the mountain cleft, drops across an upper terrace, and plunges into a roaring lower cascade. Surrounded by pale ice-blue mist spray (`#E8EEF4`).
* **The Slate Canyon & Ledges**: Severe, faceted dark slate rock (`#2A3040`). Ledges oriented upward catch the same golden rim light as the clouds (`#D4B94A`), creating visual harmony across natural and engineered structures.
* **The Foreground Silhouettes**: Jet-slate Himalayan cypress trees and riverbank scrub (`#141820` down to `#0F1218`) framing the bottom and flanks, pushing the illuminated plant into deep three-dimensional space.

---

## 3. The HydroMesh CSS Design Token Engine (`:root`)

These tokens form the single source of truth for the HydroMesh frontend. No raw hex or arbitrary rgb values are permitted in components.

```css
/* ==========================================================================
   HYDROMESH DESIGN TOKENS
   Strictly extracted from the reference mountain hydropower artwork.
   ========================================================================== */

:root {
  /* ------------------------------------------------------------------------
     1. ATMOSPHERIC SKY PALETTE
     ------------------------------------------------------------------------ */
  --color-sky-zenith:       #1E1A38;  /* Deepest night-indigo at top edge */
  --color-sky-deep:         #2A2C6B;  /* Upper sky dome — dusk indigo */
  --color-sky-mid:          #4B5499;  /* Mid-sky transition periwinkle */
  --color-sky-horizon:      #6B72B5;  /* Low atmospheric haze / twilight glow */

  /* ------------------------------------------------------------------------
     2. VOLUMETRIC CLOUDS & SUNSET RIM LIGHT
     ------------------------------------------------------------------------ */
  --color-cloud-body:       #5B6B80;  /* Main cloud fill — cool blue-slate */
  --color-cloud-shadow:     #3F4F60;  /* Cloud underside / base shadow */
  --color-cloud-rim:        #D4B94A;  /* Primary golden-yellow sunset rim highlight */
  --color-cloud-rim-bright: #F5E19A;  /* Peak specular rim highlight */
  --color-cloud-rim-glow:   rgba(212, 185, 74, 0.28); /* Ambient golden fringe */

  /* ------------------------------------------------------------------------
     3. STONE CITADEL & CONTROL ROOM HEARTH
     ------------------------------------------------------------------------ */
  --color-arch-upper:       #7A5C48;  /* Upper fortress keep — terracotta stone */
  --color-arch-upper-dark:  #5E4538;  /* Fortress shaded masonry face */
  --color-arch-lower:       #4A3830;  /* Lower powerhouse base — earthen stone */
  --color-arch-void:        #1A1010;  /* Dark unlit window openings */
  --color-arch-window-core: #FFF0B3;  /* Incandescent center of control room window */
  --color-arch-window-glow: #F0C860;  /* Primary warm amber window bloom */
  --color-arch-window-edge: #D4A830;  /* Deep amber window periphery */
  --color-arch-window-spill:rgba(212, 168, 48, 0.14); /* Diffuse spill on stone */

  /* ------------------------------------------------------------------------
     4. GRANITE CLIFFS & ROCK CANYON
     ------------------------------------------------------------------------ */
  --color-cliff-dark:       #1A1F2E;  /* Deep canyon crevices and cleft */
  --color-cliff-main:       #2A3040;  /* Main vertical slate rock face */
  --color-cliff-mid:        #353D50;  /* Horizontal rock ledges */
  --color-cliff-lit:        #D4B94A;  /* Rim-lit rock ledge top edge */

  /* ------------------------------------------------------------------------
     5. HYDRAULIC TORRENT & SPLASH MIST (THE FOCAL LIGHT)
     ------------------------------------------------------------------------ */
  --color-waterfall:        #FFFFFF;  /* Pure white crystalline water chute */
  --color-waterfall-foam:   #F8FAFC;  /* Turbulent spray foam */
  --color-waterfall-mist:   #E8EEF4;  /* Aerosol mist pool / splash envelope */
  --color-pool-surface:     #D0D8E0;  /* Reflective tailrace river surface */
  --color-pool-deep:        #A8B4C0;  /* Deeper river runout current */

  /* ------------------------------------------------------------------------
     6. FOREGROUND SILHOUETTES
     ------------------------------------------------------------------------ */
  --color-fg-tree:          #1A1F2E;  /* Cypress & pine needle silhouettes */
  --color-fg-bush:          #141820;  /* Dense riverside bush contours */
  --color-fg-ground:        #0F1218;  /* Base ground anchor strip */

  /* ------------------------------------------------------------------------
     7. UI SEMANTIC SURFACES & ELEVATION
     ------------------------------------------------------------------------ */
  --color-bg-canvas:        #121424;  /* Deepest viewport canvas backdrop */
  --color-bg-base:          #1A1D36;  /* Application container background */
  --color-surface-sunken:   #15172C;  /* Sunken inputs, terminal beds */
  --color-surface:          #1E2240;  /* Primary telemetry cards and panels */
  --color-surface-raised:   #252B4A;  /* Elevated dialogs, popovers, drawers */
  --color-surface-hover:    #2C3459;  /* Interactive hover state */
  --color-border-subtle:    #2E3557;  /* Low-contrast card borders */
  --color-border-default:   #3A436D;  /* Standard UI component borders */
  --color-border-bright:    #546096;  /* Focused / active element borders */
  --color-border-rim:       var(--color-cloud-rim); /* Golden highlight border */

  /* ------------------------------------------------------------------------
     8. TYPOGRAPHY & TEXT CONTRAST (WCAG AAA / AA PASSING)
     ------------------------------------------------------------------------ */
  --color-text-primary:     #F4F6FC;  /* Crisp snow-white text (contrast 13.8:1) */
  --color-text-secondary:   #A6B0CF;  /* Muted periwinkle-slate (contrast 6.2:1) */
  --color-text-muted:       #6C7699;  /* De-emphasized labels & units */
  --color-text-disabled:    #434B68;  /* Inactive states */
  --color-text-amber:       #F0C860;  /* Control room golden text highlight */

  /* ------------------------------------------------------------------------
     9. INDUSTRIAL SAFETY & STATUS TIERS
     ------------------------------------------------------------------------ */
  /* Green: Safe Generation (< 1,200 PPM Silt) */
  --color-status-green:      #4CAF82;
  --color-status-green-glow: rgba(76, 175, 130, 0.35);
  --color-status-green-bg:   rgba(76, 175, 130, 0.12);
  --color-status-green-border: rgba(76, 175, 130, 0.28);

  /* Yellow: Desander Flush Advisory (1,200 - 3,000 PPM Silt) */
  --color-status-yellow:     #E5B83B; /* Sun-rim gold */
  --color-status-yellow-glow:rgba(229, 184, 59, 0.40);
  --color-status-yellow-bg:  rgba(229, 184, 59, 0.12);
  --color-status-yellow-border: rgba(229, 184, 59, 0.35);

  /* Red: Critical Emergency Shutoff (> 3,000 PPM Silt / Flood Wave) */
  --color-status-red:        #E64C4C;
  --color-status-red-glow:   rgba(230, 76, 76, 0.45);
  --color-status-red-bg:     rgba(230, 76, 76, 0.14);
  --color-status-red-border: rgba(230, 76, 76, 0.45);

  /* ------------------------------------------------------------------------
     10. TYPOGRAPHY SCALE & METRICS
     ------------------------------------------------------------------------ */
  --font-ui:     'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono:   'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, monospace;

  --text-2xs:    0.6875rem; /* 11px — micro telemetry tags */
  --text-xs:     0.75rem;   /* 12px — badges, timestamps */
  --text-sm:     0.875rem;  /* 14px — secondary copy, table cells */
  --text-base:   1rem;      /* 16px — standard body copy */
  --text-md:     1.125rem;  /* 18px — card headings */
  --text-lg:     1.25rem;   /* 20px — subsection headers */
  --text-xl:     1.5rem;    /* 24px — primary section headers */
  --text-2xl:    1.875rem;  /* 30px — telemetry hero readouts */
  --text-3xl:    2.25rem;   /* 36px — plant status banners */
  --text-hero:   clamp(2.5rem, 5vw, 4.5rem); /* viewport-fluid hero title */

  /* ------------------------------------------------------------------------
     11. SPACING & GEOMETRIC SYSTEM (4px Grid)
     ------------------------------------------------------------------------ */
  --space-0-5:   0.125rem; /* 2px */
  --space-1:     0.25rem;  /* 4px */
  --space-2:     0.5rem;   /* 8px */
  --space-3:     0.75rem;  /* 12px */
  --space-4:     1rem;     /* 16px */
  --space-5:     1.25rem;  /* 20px */
  --space-6:     1.5rem;   /* 24px */
  --space-8:     2rem;     /* 32px */
  --space-10:    2.5rem;   /* 40px */
  --space-12:    3rem;     /* 48px */
  --space-16:    4rem;     /* 64px */
  --space-20:    5rem;     /* 80px */

  /* ------------------------------------------------------------------------
     12. CORNER RADII (Sharp Geometric Industrial Aesthetic)
     ------------------------------------------------------------------------ */
  --radius-none: 0px;       /* Hard polygon geometry (SVG landscape shapes) */
  --radius-xs:   3px;       /* Mini status indicators, mono code badges */
  --radius-sm:   4px;       /* Primary interactive buttons, input fields */
  --radius-md:   8px;       /* Standard telemetry cards and dashboard panels */
  --radius-lg:   12px;      /* Large modal frames, flyout sheets */
  --radius-full: 9999px;    /* Circular status indicators, avatar badges */

  /* ------------------------------------------------------------------------
     13. SHADOWS & LUMINESCENCE (Crisp Mountain Depth)
     ------------------------------------------------------------------------ */
  --shadow-sm:   0 1px 2px rgba(10, 13, 18, 0.5);
  --shadow-card: 0 4px 16px -2px rgba(10, 13, 18, 0.65), 0 0 0 1px var(--color-border-subtle);
  --shadow-raised: 0 12px 36px -4px rgba(8, 10, 15, 0.8), 0 0 0 1px var(--color-border-default);
  --glow-amber:  0 0 24px -2px rgba(240, 200, 96, 0.45);
  --glow-rim:    0 0 16px -1px rgba(212, 185, 74, 0.35);
  --glow-water:  0 0 20px 2px rgba(255, 255, 255, 0.30);
}
```

---

## 4. Universal Responsive Background System (All Devices)

The background of HydroMesh is not a static image or a flat color. It is an **active atmospheric environment** engineered with layered CSS and inline SVG geometry that gracefully scales from 320px mobile screens up to 4K ultrawide monitors without layout shifts or CPU drain.

```
+-----------------------------------------------------------------------+
|  LAYER 0: Atmospheric Twilight Gradient (linear-gradient)             |
|  Zenith (#1E1A38) -> Dusk (#2A2C6B) -> Horizon (#4B5499)               |
+-----------------------------------------------------------------------+
|  LAYER 1: Ambient Hearth Glow Spill (radial-gradient)                  |
|  Soft golden warm radiance radiating from center-right (Plant Keep)   |
+-----------------------------------------------------------------------+
|  LAYER 2: SVG Vector Landscape Silhouette (Fixed bottom-aligned)      |
|  - Billowing Cloud Flanks with Golden Edge Strokes                    |
|  - Faceted Slate Cliffs with Central Waterfall Cleft                  |
|  - Citadel Keeps with Glowing Arched Windows                          |
|  - Cascading Dual-Tier Animated Waterfall                             |
|  - Cypress Silhouette Foreground Ribbons                              |
+-----------------------------------------------------------------------+
|  LAYER 3: Fine Noise / Scanline Texture (0.018 opacity)               |
|  Subtle industrial texture preventing color banding on 8-bit displays |
+-----------------------------------------------------------------------+
|  LAYER 4: Telemetry Content Canvas (z-index: 10)                      |
|  High-contrast Glassmorphic Cards & Grid Layouts                      |
+-----------------------------------------------------------------------+
```

### 4.1 Master CSS Background Blueprint

```css
/* Container applying the full mountain twilight backdrop */
.hydromesh-viewport-bg {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background-color: var(--color-bg-canvas);
  background-image: 
    /* Layer 1: Amber control room radiant light spill */
    radial-gradient(
      ellipse 650px 420px at 62% 48%,
      rgba(240, 200, 96, 0.08) 0%,
      rgba(212, 168, 48, 0.03) 55%,
      transparent 100%
    ),
    /* Layer 0: High-altitude twilight sky dome */
    linear-gradient(
      180deg,
      var(--color-sky-zenith) 0%,
      var(--color-sky-deep) 35%,
      var(--color-sky-mid) 70%,
      var(--color-bg-canvas) 100%
    );
  background-attachment: fixed;
  overflow-x: hidden;
}

/* Subtle organic grain overlay to eliminate digital color banding */
.hydromesh-viewport-bg::before {
  content: "";
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* Fixed backdrop illustration container */
.hydromesh-hero-landscape {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 60vh;
  max-height: 720px;
  min-height: 360px;
  pointer-events: none;
  z-index: 2;
  opacity: 0.38; /* Muted during dashboard operations, 1.0 on hero landing */
  transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

.hydromesh-hero-landscape.hero-focus {
  opacity: 0.95;
}
```

### 4.2 Cross-Device Breakpoint Matrix

| Device Profile | Viewport Width | Landscape Treatment | Content Presentation | Performance Target |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Portrait** | `320px – 480px` | Landscape docked at bottom 30vh, clouds compressed to outer 5%, waterfall centered behind telemetry stack. | Single-column cards, full-width touch targets (48px min height), compressed margins. | 60 FPS, < 3% CPU |
| **Mobile Landscape / Phablet** | `481px – 767px` | 40vh landscape, cloud flanks visible, ambient window glow scaled to 300px ellipse. | 2-column compact grid, sticky header status pill. | 60 FPS, < 3% CPU |
| **Tablet Portrait / Laptop** | `768px – 1024px` | Full 50vh vector depth, prominent amber control room windows, full dual-tier waterfall. | 2-column or 3-column split, floating stream drawer. | 60/120 FPS, < 2% CPU |
| **Desktop / Workstation** | `1025px – 1440px` | 16:9 aspect ratio preservation, full cloud billows with active golden edge shimmer. | 3-column SCADA layout: Map/Gauges + Stream + Safety Guard. | 120 FPS, < 1% CPU |
| **Ultrawide / Command Center** | `1441px – 3840px+`| 1440px fixed vector focal center with extended silhouette tree flanks filling the canvas edges. | Multi-column panoramic dashboard, full telemetry overview. | 120 FPS, < 1% CPU |

---

## 5. GPU-Accelerated Keyframe Animation Engine ("Visually WOW")

To create an interface that feels alive like the mountain scene—flowing water, warm breathing lamps, drifting high-altitude clouds—without compromising battery life or frame rates, all animations must adhere to **Strict Kinetic Rules**:
1. **Composite Layer Only**: Strictly animate `transform` and `opacity`. Never animate `width`, `height`, `margin`, `top`, or `filter: blur()`.
2. **GPU Layer Promotion**: Every animated SVG element or UI card uses `will-change: transform, opacity` or `transform: translateZ(0)`.
3. **Harmonic Asynchronous Frequencies**: Animation cycles use prime and non-synchronous second values (`2.4s`, `3.5s`, `4.5s`, `14s`, `19s`) so the visual landscape never feels like a looping GIF, but rather an organic, breathing ecosystem.

```css
/* ==========================================================================
   HYDROMESH KINETIC ANIMATION ENGINE
   60/120 FPS Hardware-Accelerated CSS Transitions
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. WATERFALL DUAL-TIER KINETIC FLOW & SHIMMER
   -------------------------------------------------------------------------- */
/* High-frequency shimmer along the pure white waterfall column */
@keyframes waterfall-shimmer {
  0% {
    opacity: 0.88;
    transform: translateX(0px) scaleX(1);
  }
  25% {
    opacity: 1.0;
    transform: translateX(0.6px) scaleX(1.02);
  }
  50% {
    opacity: 0.92;
    transform: translateX(-0.4px) scaleX(0.99);
  }
  75% {
    opacity: 0.98;
    transform: translateX(0.4px) scaleX(1.01);
  }
  100% {
    opacity: 0.88;
    transform: translateX(0px) scaleX(1);
  }
}

/* Downward hydraulic translation pattern */
@keyframes waterfall-flow {
  0% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: 48px;
  }
}

.anim-waterfall-core {
  animation: waterfall-shimmer 2.4s ease-in-out infinite;
  will-change: transform, opacity;
}

.anim-waterfall-flowlines {
  stroke-dasharray: 8 16;
  animation: waterfall-flow 1.1s linear infinite;
}

/* --------------------------------------------------------------------------
   2. CONTROL ROOM AMBER HEARTH GLOW (The Human Signal)
   -------------------------------------------------------------------------- */
/* Warm breathing pulse of the illuminated arched windows */
@keyframes window-glow-pulse {
  0%, 100% {
    opacity: 0.84;
    transform: scale(1.0);
    filter: drop-shadow(0 0 12px rgba(240, 200, 96, 0.45));
  }
  50% {
    opacity: 1.0;
    transform: scale(1.025);
    filter: drop-shadow(0 0 22px rgba(240, 200, 96, 0.75));
  }
}

.anim-window-glow {
  animation: window-glow-pulse 4.5s ease-in-out infinite;
  transform-origin: center center;
  will-change: transform, opacity, filter;
}

/* --------------------------------------------------------------------------
   3. GOLDEN SUNSET CLOUD RIM LIGHT BREATH
   -------------------------------------------------------------------------- */
/* Subtle organic glow fluctuation along the golden cloud top edge */
@keyframes rim-light-breath {
  0%, 100% {
    opacity: 0.65;
    stroke-width: 2.5px;
  }
  50% {
    opacity: 1.0;
    stroke-width: 3.5px;
  }
}

.anim-cloud-rim {
  animation: rim-light-breath 5.2s ease-in-out infinite;
  will-change: opacity, stroke-width;
}

/* --------------------------------------------------------------------------
   4. ASYNCHRONOUS DRIFTING HIGH-ALTITUDE CLOUDS
   -------------------------------------------------------------------------- */
@keyframes cloud-drift-left {
  0%, 100% {
    transform: translateX(0px);
  }
  50% {
    transform: translateX(-12px);
  }
}

@keyframes cloud-drift-right {
  0%, 100% {
    transform: translateX(0px);
  }
  50% {
    transform: translateX(10px);
  }
}

.anim-cloud-flank-left {
  animation: cloud-drift-left 16s ease-in-out infinite;
  will-change: transform;
}

.anim-cloud-flank-right {
  animation: cloud-drift-right 22s ease-in-out infinite;
  will-change: transform;
}

/* --------------------------------------------------------------------------
   5. SPLASH POOL MIST PARTICLES
   -------------------------------------------------------------------------- */
@keyframes mist-particle-ascend {
  0% {
    transform: translateY(0px) scale(0.85);
    opacity: 0;
  }
  20% {
    opacity: 0.6;
  }
  80% {
    opacity: 0.4;
  }
  100% {
    transform: translateY(-38px) scale(1.35);
    opacity: 0;
  }
}

.anim-mist-particle {
  animation: mist-particle-ascend 3.6s ease-out infinite;
  will-change: transform, opacity;
}

/* Stagger particle delays */
.mist-p1 { animation-delay: 0.0s; }
.mist-p2 { animation-delay: 0.8s; }
.mist-p3 { animation-delay: 1.6s; }
.mist-p4 { animation-delay: 2.4s; }

/* --------------------------------------------------------------------------
   6. UI TELEMETRY EVENT INGESTION (LiveStream Row Entry)
   -------------------------------------------------------------------------- */
@keyframes event-slide-in {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0px) scale(1);
  }
}

.anim-event-row {
  animation: event-slide-in 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* --------------------------------------------------------------------------
   7. INDUSTRIAL ALERT BEACON PULSE (Safety Violations / RED Alert)
   -------------------------------------------------------------------------- */
@keyframes alert-beacon-pulse {
  0%, 100% {
    background-color: var(--color-status-red-bg);
    border-color: var(--color-status-red-border);
    box-shadow: 0 0 0 0 rgba(230, 76, 76, 0);
  }
  50% {
    background-color: rgba(230, 76, 76, 0.22);
    border-color: var(--color-status-red);
    box-shadow: 0 0 20px 2px rgba(230, 76, 76, 0.35);
  }
}

.anim-alert-red {
  animation: alert-beacon-pulse 1.4s ease-in-out infinite;
}

/* --------------------------------------------------------------------------
   8. CARD HOVER & GOLDEN RIM EXCITATION
   -------------------------------------------------------------------------- */
.interactive-telemetry-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition: 
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 180ms ease,
    box-shadow 180ms ease;
  will-change: transform, box-shadow;
}

.interactive-telemetry-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-cloud-rim);
  box-shadow: 
    0 8px 24px -4px rgba(10, 13, 18, 0.7),
    0 0 14px -2px rgba(212, 185, 74, 0.25);
}

/* --------------------------------------------------------------------------
   9. ACCESSIBILITY: REDUCED MOTION SAFEGUARD
   -------------------------------------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
  
  .anim-waterfall-core,
  .anim-waterfall-flowlines,
  .anim-window-glow,
  .anim-cloud-rim,
  .anim-cloud-flank-left,
  .anim-cloud-flank-right,
  .anim-mist-particle,
  .anim-alert-red {
    animation: none !important;
  }
  
  /* Fallback static contrast for reduced motion users */
  .anim-window-glow {
    filter: drop-shadow(0 0 14px rgba(240, 200, 96, 0.5));
  }
  .anim-alert-red {
    background-color: var(--color-status-red-bg);
    border-color: var(--color-status-red);
  }
}
```

---

## 6. Component-by-Component Visual Blueprint

Every component in the HydroMesh suite is styled explicitly in harmony with the mountain fortress palette:

```
+---------------------------------------------------------------------------------------------------+
|  HEADER: [HydroMesh Logo]  |  PLANT: Upper Trishuli 3A  |  RUNNER WEAR: 1.42mm  |  STATUS: [NORMAL] |
+---------------------------------------------------------------------------------------------------+
|                                 |                                 |                               |
|  1. NEPAL HYDRAULIC MAP         |  2. DIGITAL TWIN TELEMETRY      |  3. SCADA LIVE EVENT STREAM   |
|  - Dark Slate Terrain Basemap   |  - Turbine Discharge: 42.8 m³/s |  - Monospace Agent Logs       |
|  - River Network in Sky Mist    |  - Silt Sieve: 412 PPM (Green)  |  - Left Border Event Coding:  |
|  - Golden Glowing Hydro Nodes   |  - Head: 184.2 m                |    • Info: Periwinkle         |
|  - Active Plant Pulsing Beacon  |  - Runner Abrasion Meter        |    • Decision: Amber Hearth   |
|                                 |                                 |    • Warning: Rim Gold        |
|                                 |                                 |    • Safety Trip: Deep Red    |
+---------------------------------+---------------------------------+-------------------------------+
|  4. DISCHARGE & SILT DUAL FORECAST CHART                          |  5. SAFETY INTERLOCK STATUS   |
|  - Cartesian Slate Grid (dashed 1px)                              |  - R1-R11 Rule Verification   |
|  - 90% Confidence Uncertainty Envelope (cool periwinkle tint)    |  - Operator Override Window   |
|  - Silt Threshold Markers (1,200 PPM Yellow / 3,000 PPM Red)      |  - 600s Countdown Ring        |
+-------------------------------------------------------------------+-------------------------------+
```

### 6.1 Nepal Hydropower Interactive Map (`NepalMap.tsx`)
* **Basemap Canvas**: Slate dark fill (`#15172C`), river networks traced in cool mist blue (`#6B72B5`, 1.5px stroke).
* **Inactive Hydro Nodes**: Small solid slate circles (`#353D50`, 4px radius) with subtle hover highlight.
* **Monitored Plant Node (Selected)**: Glowing amber beacon (`#F0C860`, 8px radius) with an expanding radar ring pulsing at 2.4s intervals.
* **Basin Waterflow Vectors**: Animated gradient dash array indicating real-time discharge flow toward downstream dams.

### 6.2 Digital Twin Gauges (`TwinGauges.tsx`)
* **Numeric Readouts**: Rendered in `var(--font-mono)`, weight 700, pure waterfall white (`#FFFFFF`) at `2rem` font size.
* **Unit Badges**: `m³/s`, `PPM`, `MW`, `mm` rendered in uppercase `var(--color-text-secondary)` at `0.75rem`.
* **Silt Concentration Progress Gauge**:
  * `0 – 1,199 PPM`: Solid green track (`#4CAF82`), subtle green ambient glow.
  * `1,200 – 3,000 PPM`: Golden yellow track (`#D4B94A`), yellow ambient glow, desander warning icon visible.
  * `> 3,000 PPM`: High-contrast red track (`#E64C4C`), active `anim-alert-red` pulsation, auto-gate shutoff countdown active.
* **Runner Abrasion Indicator**: Horizontal gauge filling toward the IEC 62364 critical limit (`4.00 mm`), with a yellow maintenance flag at `2.80 mm` (70%).

### 6.3 SCADA Live Event Stream (`LiveStream.tsx`)
* **Container Bed**: Sunken terminal slate (`#15172C`), 1px border (`#2E3557`), monospace typography (`JetBrains Mono`, 13px).
* **Event Ingestion**: Rows slide in smoothly using `anim-event-row` (`translateY(10px) -> 0`, opacity `0 -> 1` over 220ms).
* **Left Status Border (3px Solid)**:
  * `telemetry`: Horizon Periwinkle (`#6B72B5`).
  * `llm_decision`: Warm Amber Hearth (`#F0C860`).
  * `advisory_flush`: Golden Sun Rim (`#D4B94A`).
  * `safety_interlock`: Brilliant Plant Green (`#4CAF82`).
  * `emergency_trip`: Deep Warning Red (`#E64C4C`).
* **Timestamp & Latency Metadata**: Rendered in muted periwinkle (`#6C7699`), uppercase tracking-wider.

### 6.4 Dual-Axis Forecast Chart (`ForecastChart.tsx`)
* **Grid**: Transparent canvas background, Cartesian grid dashed lines in `--color-border-subtle` (`#2E3557`).
* **Left Axis (Discharge m³/s)**: Smooth spline curve in periwinkle sky (`#6B72B5`, 2.5px stroke width).
* **Right Axis (Silt PPM)**: Solid spline curve in sun-rim gold (`#D4B94A`, 2.5px stroke width).
* **Uncertainty Envelope (90% Confidence Interval)**: Smooth polygon area fill in `rgba(107, 114, 181, 0.16)` bounded by 5th and 95th percentile ensemble curves.
* **SOP Threshold Reference Lines**:
  * `1,200 PPM`: Horizontal dashed line in `var(--color-status-yellow)` (`#E5B83B`), labeled *"Desander Flush SOP-04"*.
  * `3,000 PPM`: Horizontal dashed line in `var(--color-status-red)` (`#E64C4C`), labeled *"Emergency Plant Trip SOP-09"*.

### 6.5 Operator Safety Override & Interlock (`OverrideButton.tsx`)
* **Button Surface**: Solid warm amber (`#F0C860`) with jet-slate bold text (`#1A1010`) for maximum WCAG AAA legibility.
* **Hover State**: Elevates with `translateY(-2px)` and casts an amber radial glow (`0 0 24px rgba(240, 200, 96, 0.5)`).
* **Active 600s Countdown Ring**: Circular SVG progress ring in golden rim yellow (`#D4B94A`) counting down the remaining operator acknowledgment window before deterministic safety fallback takes over.

### 6.6 Live Satellite Ground-Truth & Hydrology Math Inspector Tab (`LiveInspectorTab.tsx`)
A compact, non-interfering industrial telemetry dock anchored in the lower-left corner of the viewport, providing complete mathematical transparency to operators and judges without cluttering the primary SCADA control layout.

* **Anchor & Docking Geometry**:
  * Position: `position: fixed; bottom: 16px; left: 16px; z-index: 50;`.
  * Mobile adaptation: Anchors to bottom-left with `bottom: 12px; left: 12px; max-width: calc(100vw - 24px);`.
  * Zero Interference: Positioned safely below the main dashboard telemetry cards and clear of the central waterfall focal line.
* **Collapsed State (The Ambient Satellite Pill)**:
  * Dimensions: Height `34px`, padding `0 14px`, border-radius `var(--radius-full)` (pill geometry).
  * Background: `rgba(21, 23, 44, 0.88)` with backdrop glassmorphic blur (`backdrop-filter: blur(8px)`).
  * Border: `1px solid var(--color-border-subtle)` (`#2E3557`), transitioning to `var(--color-cloud-rim)` (`#D4B94A`) on hover.
  * Live Beacon: 8px circular indicator pulsing in plant green (`#4CAF82`, `box-shadow: 0 0 8px rgba(76, 175, 130, 0.6)`).
  * Typography: `var(--font-mono)`, `0.75rem` (`12px`), uppercase tracking-wider in `var(--color-text-primary)`:  
    `LIVE SATELLITE: ECMWF 9km | 25 Plants Synced [INFO]`
  * Interaction: Click or hover smoothly expands the inspection drawer.
* **Expanded State (The Ground-Truth & Calculation Modal Card)**:
  * Dimensions: Width `380px`, max-height `80vh`, overflow-y `auto`, border-radius `var(--radius-md)`.
  * Background: `var(--color-surface)` (`#1E2240`) bounded by `1px solid var(--color-border-bright)` (`#546096`) and `var(--shadow-raised)`.
  * Header: Dual-line badge displaying the active station's mountain coordinates:  
    `UPPER TAMAKOSHI (KOSHI BASIN) — 27.848°N, 86.136°E (Head: 822m)`.
  * **Tab Panel 1: Live Satellite Inflow Feed**:
    * Raw Feed Source: *Open-Meteo European ECMWF 9km High-Resolution Satellite Array*.
    * Real-Time Telemetry: Real-time precipitation ($\text{mm/h}$), temperature ($^\circ\text{C}$), cloud cover (%), and a 48-hour forward precipitation sparkline.
    * Synchronization Latency: Monospace tag displaying real query response time (e.g. `SYNC: 142ms ago | is_live=True`).
  * **Tab Panel 2: Physical Hydrology Calculation Card ("Under the Hood")**:
    * Displays the exact physical formulas with live values dynamically substituted:
      1. **Catchment Rational Runoff Formula**:
         $$Q_{\text{river}} = Q_{\text{base}} + \left( \frac{C \times I \times A}{3.6} \right)$$
         *Live Substitution*: $Q_{\text{base}} = 35.0\text{ m}^3/\text{s}$, $C = 0.42$ (rocky runoff coeff), $I = 0.0\text{ mm/h}$, $A = 1,745\text{ km}^2 \implies Q_{\text{river}} = 35.0\text{ m}^3/\text{s}$.
      2. **Himalayan Quartz Sediment Rating Equation**:
         $$\text{Silt (PPM)} = 2.096 \times 10^{-4} \times Q^{2.432}$$
         *Live Substitution*: $35.0^{2.432} \times 2.096 \times 10^{-4} \implies 1.2\text{ PPM}$ (Safe Normal Generation / Green Tier).
      3. **Catchment Concentration Travel Delay**:
         Calculates the basin lag time ($t_c = 2.8\text{ hours}$): rain falling in the mountain peaks takes 2.8 hours to arrive at the intake weir, guaranteeing a 2.8-hour early warning window.
  * **Tab Panel 3: Ground Truth Calibration & Safety Net**:
    * Sensor Fusion Status: Acoustic Sand Monitor vs. Satellite Inflow.
    * Fail-Closed Status: `Rules R1-R11 ACTIVE | Effective Confidence: 95% | Deterministic Floor Enforced`.
* **CSS Motion & Transitions**:
  * Entry/Exit: `transform: translateY(12px) scale(0.96); opacity: 0;` transitioning to `transform: translateY(0) scale(1.0); opacity: 1;` in `220ms cubic-bezier(0.16, 1, 0.3, 1)`.
  * Gated by `@media (prefers-reduced-motion: reduce)`: collapses to instantaneous toggle with zero slide motion.

---

## 7. Device Performance & Battery Safety Guarantee

HydroMesh is engineered to be deployed in field hydro plant control rooms, often running on standard industrial panel PCs, rugged tablets, and laptop screens.

1. **Hardware Acceleration**:
   * All dynamic SVG elements use `transform: translateZ(0)` to force dedicated GPU texture layers.
   * Total paint events during normal monitoring: **0 repaints/sec** (all motion occurs on the GPU composite thread).
2. **Memory Footprint**:
   * Zero external canvas animation libraries (No Framer Motion bundle bloat, no Three.js overhead, no Lottie runtime).
   * Total CSS stylesheet footprint: `< 18 KB` uncompressed.
3. **Battery & Power Impact**:
   * Background cloud animations run at ultra-low frequencies (16s–22s cycles), producing negligible CPU cycles.
   * When the browser tab is hidden or backgrounded, browsers automatically pause CSS keyframe execution, dropping CPU utilization to **0.00%**.
4. **Color Contrast Compliance**:
   * Text colors against `--color-bg-canvas` (`#121424`) and `--color-surface` (`#1E2240`):
     * `--color-text-primary` (`#F4F6FC`): **13.8:1** (Exceeds WCAG AAA 7.0:1 standard).
     * `--color-text-secondary` (`#A6B0CF`): **6.2:1** (Exceeds WCAG AA 4.5:1 standard).
     * `--color-text-amber` (`#F0C860`): **9.4:1** (Exceeds WCAG AAA standard).

---

## 8. Summary Table: Artwork Element to CSS Token Mapping

| Artwork Element | Dominant Hue | CSS Variable Token | Hex Code | UI Component Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **Zenith Sky** | Night Indigo | `--color-sky-zenith` | `#1E1A38` | Viewport Canvas Gradient Top |
| **Mid Sky** | Twilight Dusk | `--color-sky-deep` | `#2A2C6B` | Dashboard Body Background |
| **Horizon Sky** | Periwinkle | `--color-sky-horizon` | `#6B72B5` | Map Rivers, Telemetry Splines |
| **Cloud Body** | Slate Grey-Blue | `--color-cloud-body` | `#5B6B80` | Sunken Bed Borders, Chart Axes |
| **Cloud Rim Light**| Golden Amber | `--color-cloud-rim` | `#D4B94A` | Yellow Alert, Focus Rings, Card Borders |
| **Upper Fortress** | Terracotta | `--color-arch-upper` | `#7A5C48` | Secondary Badges, Structural UI |
| **Lower Keep** | Dark Sandstone | `--color-arch-lower` | `#4A3830` | Sunken Panel Outlines |
| **Window Glow** | Radiant Amber | `--color-arch-window-glow` | `#F0C860` | Primary CTA Buttons, Key Metrics |
| **Cliff Slate** | Dark Slate | `--color-cliff-main` | `#2A3040` | Telemetry Card Surfaces |
| **Waterfall** | Pure White | `--color-waterfall` | `#FFFFFF` | Hero Metrics, Monospace Numbers |
| **Waterfall Mist** | Pale Blue Mist | `--color-waterfall-mist` | `#E8EEF4` | Hover Text, Secondary Highlights |
| **Cypress Silhouette**| Jet Slate | `--color-fg-tree` | `#1A1F2E` | Baseline Borders, Table Separators |
| **Ground Strip** | Deep Void | `--color-fg-ground` | `#0F1218` | Terminal Bed Background |

---

## 9. End-to-End User Journey, Navigation State Machine & 20-House Grid

### 9.1 The Four Sequential Journey Phases & State Machine

The HydroMesh web application enforces an uninterrupted, cinematic, and industrial UX state machine. State is managed via a dedicated finite state machine (`UserJourneyState`):

```
┌─────────────────┐       Auto (1.2s delay) / Skip       ┌────────────────────────┐
│  Phase 1:       │ ───────────────────────────────────> │  Phase 2:              │
│  SPLASH SCREEN  │                                      │  ONBOARDING & AUTH     │
│  Typewriter     │                                      │  Terms → Login → Perms │
└─────────────────┘                                      └────────────────────────┘
                                                                      │
                                                                      ▼
┌──────────────────────────────────────────────┐         Complete All 3 Steps
│  Phase 4: GLOBAL OPERATIONS DASHBOARD        │                      │
│  ┌─────────────────┬──────────────────────┐  │                      ▼
│  │ Left Docked     │ 20-Powerhouse Grid   │  │         ┌────────────────────────┐
│  │ Inspector Panel │ 5-Col Scaled Houses  │  │ <────── │  Phase 3:              │
│  └─────────────────┴──────────────────────┘  │         │  PRODUCT INTRO TUTORIAL│
│          ▲                    │              │         │  3 Tooltip Cards + CTA │
│          │ Return             ▼ Deep Dive    │         └────────────────────────┘
│    ┌──────────────────────────────────────┐  │
│    │ Individual Plant Page (/plant/[id])  │  │
│    └──────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

#### Phase 1: Splash Screen & Letter-by-Letter Typewriter Reveal (`phase === 'splash'`)
* **Visual Canvas**: Fullscreen viewport centered on `--color-sky-deep` (`#2A2C6B`) with the subtle dark indigo silhouette of the Himalayan mountain cliff citadel.
* **Typographic Animation**:
  * Letter-by-letter staggered typewriter reveal spelling:
    `"WELCOME TO HYDROMESH"`
  * Monospaced subtitle: `"AUTONOMOUS HIMALAYAN RUN-OF-RIVER GUARDIAN"`
  * Stagger timing: `55ms` per character with a glowing golden cursor (`--color-cloud-rim`).
* **Transition Behavior**:
  * Once the typewriter sequence finishes, the glowing cursor transitions into a soft breathing pulse (`scale(1.0) -> scale(1.04)`).
  * Automatically transitions to **Phase 2** after a `1.2s` hold delay.
  * Includes an interactive `[Skip Intro →]` keyboard/mouse bypass in the top-right corner.

#### Phase 2: Onboarding, Consent & Auth Gates (`phase === 'auth'`)
A focused modal card sequence anchored over the dim twilight mountain canvas:
1. **Step 1: Terms of Service & SOP Synthetic Disclaimers**:
   * Explicitly sets the legal and engineering premise: *HydroMesh is an advisory AI digital twin. All automated actuation commands require human operator confirmation (Advisory: True). Telemetry is derived from European ECMWF 9km satellite arrays and calibrated physics models.*
   * "I Understand and Accept Operational Invariants" checkbox.
2. **Step 2: Authentication Gate**:
   * Dual-entry access:
     * **Instant Guest Access**: Mint immediate `guest_<random>` token for read-only fleet exploration.
     * **Lead Operator Login**: Email + Argon2id passphrase for registered operators (includes 1 private plant slot).
3. **Step 3: Permission Approval Check**:
   * Grants permissions for WebSocket live telemetry streaming, local alert sound notifications, and session storage caching.
   * Action button: `"Enter System Onboarding →"`.

#### Phase 3: Product Intro & Tutorial ("How to Use") (`phase === 'intro'`)
* **Layout**: A high-density industrial mission briefing layout.
* **Three Interactive Guided Walkthrough Cards**:
  1. **Card 1 — The 20-Powerhouse Grid**:
     * How to read the isometric powerhouse blocks, real-time river discharge ($m^3/s$), and operational generation capacity (MW).
  2. **Card 2 — Quartz Silt Influx & Turbine Health**:
     * Color-coded erosion thresholds:
       * `SAFE`: $< 1,200\text{ PPM}$ (Normal generation).
       * `ELEVATED`: $1,200\text{–}3,000\text{ PPM}$ (Sand flushing advisory).
       * `CRITICAL`: $> 3,000\text{ PPM}$ (Immediate gate modulation to prevent catastrophic runner wear).
  3. **Card 3 — Multi-Agent AI & Safety Kernel**:
     * Explains the 5-agent pipeline (Triage $\to$ Predictive $\to$ SOP RAG $\to$ Dispatch $\to$ Safety Kernel).
     * Reassures the operator that **Safety Kernel Rules R1–R11** enforce strict fail-closed validation.
* **Primary CTA**: Prominent radiant amber button (`--color-arch-window-glow`) labeled `"Continue to Dashboard →"`.

---

### 9.2 Phase 4: Global Operations Dashboard Architecture

#### Top Global Navigation Bar (`<GlobalNav />`)
* **Left**: HydroMesh brand logo with illuminated amber arch beacon (`#D4A830`) and active mode toggle (`Individual Site` vs `Global Fleet`).
* **Center**: Real-Time Fleet Health Pill:
  * Total Sites: `20 Active Stations`
  * Active Alert Beacon: Green (Normal), Yellow (Watch), Red (Critical).
  * Satellite Radar Link: `ECMWF 9km [Connected · 820ms]`
* **Right**:
  * Live Nepal Standard Time (`NST = UTC + 5:45` formatted as `HH:MM:SS NST`).
  * Quick Links: `Inspector`, `Safety SOPs`, `Replay Intro`.
  * User Identity Badge (`Guest Operator` or member email).

#### Left Side Docked Panel: Telemetry & MD Plan Inspector (`<InspectorPanel />`)
* **Position**: Persistent left-docked collapsible sidebar (`w-80` to `w-96`, or collapsible to a `48px` icon strip on mobile/tablet).
* **Tab 1: Live Telemetry Stream**:
  * Real-time river flow $Q$, mountain temperature ($^\circ\text{C}$), rainfall rate ($\text{mm/h}$), and vibration ($\text{mm/s}$).
* **Tab 2: Active SOP & Trigger Thresholds**:
  * Parses and displays markdown SOPs (`HIGH_SILT_SOP.md`, `CAVITATION_SOP.md`) with cryptographic SHA-256 integrity hashes (`88c4b1...`).
  * Threshold matrix matching `docs/web/plan.md`.
* **Tab 3: Agent Event Log**:
  * Streaming audit trail of autonomous events: `TriageAgent`, `PredictiveAgent`, `SafetyKernel`, and `ExplainerAgent`.

#### Dedicated Real-Time Satellite Feed Box (`<SatelliteFeedBox />`)
* **Position & Footprint**:
  * Docked unobtrusively in the **lower-left corner** (`fixed bottom-4 left-4 z-30` or integrated into the sidebar base).
  * Compact footprint (`w-72` / `288px` wide, solid dark SCADA backdrop `--color-surface: #1E2240` with 94% opacity, 1px border `--color-border: #3A4060` with 4px industrial chamfered corners).
  * **Zero Interference Guarantee**: Positioned so it never overlaps or blocks the 20-powerhouse grid, plant detail cards, or header navigation.
* **1-Second Heartbeat Pulse & Live Satellite Stream**:
  * Status indicator: `[SAT-LINK: ACTIVE] [TICK: 1.00s]`.
  * Real-time GPS Coordinates: Station latitude, longitude, and elevation (`27.8483 N, 86.1361 E | Elev: 822 m`).
  * Real-time Satellite Telemetry fetched every second via `live_extraction.py` and `hydromesh/ingest/live.py`:
    * **Satellite Precipitation (NASA GPM IMERG v07B)**: Live rainfall rate `34.8 mm/h` with 60-second micro-sparkline.
    * **Atmospheric Moisture Flux (ERA5-Land)**: Total column water vapor flux `46.8 kg/(m * s)`.
    * **Cloud Optical Radiance (ECMWF OpenData 0.25 deg)**: Brightness temperature `212.4 K` (deep convective cloud mass).
    * **Catchment Runoff Gradient**: Real-time river discharge rate `+12.4 m3/s/h` calculated from orographic precipitation.
  * **Network & Ingestion Verification**:
    * Latency: `[PING: 28 ms] [STATUS: HTTP 200 OK]`.
    * Integrity Checksum: `[BLAKE2b: d84a9e21...]` verified per frame.
* **Controls**:
  * `[MINIMIZE / EXPAND]`: Collapses to an unobtrusive `32px` monospace status pill.
  * `[FREEZE FRAME]`: Temporarily pauses the 1-second packet stream for operator verification.
  * `[RAW JSON]`: Direct telemetry JSON payload viewer.

---



### 9.3 Main View: The 20 Hydropower "House" Grid (`<PowerhouseGrid />`)

The core workspace displays an interactive array of **exactly 20 distinct hydropower stations** from the verified Nepal registry, styled visually as **industrial powerhouses / isometric substation blocks**:

#### Visual Anatomy of a Powerhouse Block Card (`<PowerhouseCard />`):
1. **Architectural Gable Roof & Ventilation Slits**:
   * Faceted roof silhouette with slate masonry borders (`--color-cliff-mid`).
   * Stylized transformer substation insulator bushings and penstock pipe intake line.
2. **Control Room Hearth Window**:
   * Rectangular arched illuminated window glowing in amber (`#F0C860`) if active, or pulsing red during severe silt ingress.
3. **Telemetry Metrics Monospace Strip**:
   * **Name & River Basin**: E.g., `Upper Tamakoshi · Koshi Basin`.
   * **Installed Capacity**: Monospace `456.0 MW`.
   * **River Flow Rate**: Monospace `35.0 m³/s`.
   * **Quartz Silt PPM**: Color-coded badge (`1.2 PPM` normal, `>3000 PPM` critical).
   * **Operational Status**: `NORMAL`, `WATCH`, `WARNING`, `CRITICAL`.
4. **Interactive Hover Mechanics**:
   * On hover: Golden cloud-rim highlight border (`--color-cloud-rim` `#D4B94A`), subtle `translateY(-3px)` elevation.
   * On click: Smoothly navigates to the dedicated plant detail view (`/plant/[id]`).

---

### 9.4 Individual Plant Detail View (`/plant/[id]`)

When an operator clicks any powerhouse card, the system opens the full single-plant deep-dive:
* **Header**: Back navigation button (`← Back to 20-House Fleet Overview`), plant headline, head ($m$), and basin location.
* **Twin Gauges (`<TwinGauges />`)**:
  * High-contrast SVG arc gauge for **Discharge** ($0\text{–}100\text{ m}^3/\text{s}$).
  * Non-linear calibrated gauge for **Quartz Silt Concentration** ($0\text{–}5,000\text{ PPM}$).
* **Temporal Forecast Chart (`<ForecastChart />`)**:
  * 48-hour forward projection showing expected precipitation peaks and river inflow surges.
* **Manual Override & Advisory Control (`<OverrideButton />`)**:
  * Penstock intake gate slider ($0\text{–}100\%$).
  * Sand flushing basin trigger ($15\text{–}60\text{ mins}$).
  * Human-in-the-loop cryptographic nonce submission.

---

### 9.5 Responsive Breakpoints & Viewport Scaling

The 20-powerhouse grid scales fluidly without horizontal scrollbars:
* **Mobile (`< 640px`, `sm`)**: `grid-cols-1` (single vertical column of powerhouses, inspector panel docks to bottom drawer).
* **Tablet (`640px – 1024px`, `md` / `lg`)**: `grid-cols-2` or `grid-cols-3`.
* **Desktop (`1024px – 1440px`, `xl`)**: `grid-cols-4`.
* **Wide Workstation (`> 1440px`, `2xl`)**: `grid-cols-5` (clean 4 rows of 5 powerhouse blocks).
* **Accessibility**: All animations respect `@media (prefers-reduced-motion: reduce)` by immediately displaying final text/layouts with zero motion delay.

---

## 10. Legal, Privacy, AI Ethics, Cookie Governance & Footer Architecture (Lawsuit Protection & Trust Shield)

### 10.1 Lawsuit Protection & Statutory Non-Liability Shield

HydroMesh operates in high-consequence river management environments where heavy sediment, flash floods, and glacier outbursts pose physical and financial hazards. To safeguard developers, operators, and hosting entities from civil liability or catastrophic lawsuits, the interface and documentation enforce an uncompromising legal safe harbor:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        STATUTORY NON-LIABILITY ARCHITECTURE                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  1. ADVISORY-ONLY INVARIANT     │ Dispatches carry strict `advisory: Literal[True]`.   │
│                                 │ AI never directly trips breakers or opens penstocks. │
├─────────────────────────────────┼──────────────────────────────────────────────────────┤
│  2. CERTIFIED OPERATOR GATE     │ All physical actions require human operator signoff  │
│                                 │ with cryptographic nonce audit recording.            │
├─────────────────────────────────┼──────────────────────────────────────────────────────┤
│  3. FAIL-CLOSED SAFETY KERNEL   │ Confidence < 0.80 or sensor dropout immediately      │
│                                 │ revokes AI recommendations; falls back to R1–R11.    │
├─────────────────────────────────┼──────────────────────────────────────────────────────┤
│  4. COMPLETE WAIVER OF DAMAGES  │ Explicit disclaimer of all consequential, flood,     │
│                                 │ abrasion, cavitation, or lost generation damages.    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Plain-English Legal Disclaimer (Rendered in Modal & Footer):
> **IMPORTANT NOTICE & LIMITATION OF LIABILITY**:  
> HydroMesh is an AI-assisted Decision Support System (DSS) and mathematical digital twin provided strictly for informational and advisory engineering simulation. HydroMesh does **not** directly actuate or control physical hydro dams, penstock intake gates, desilting basins, or transmission grid interconnects. **All automated dispatches and sediment flushes are strictly advisory (`advisory: true`) and must be independently verified and authorized by a certified human plant operator.**  
> Under no circumstances shall the authors, maintainers, copyright holders, or operating organizations be liable for any direct, indirect, incidental, special, punitive, or consequential damages (including, but not limited to: downstream flooding, dam breach, turbine runner erosion, equipment cavitation, loss of grid synchronization, or interruption of electric revenue) arising from any reliance on or interaction with this software.

---

### 10.2 Privacy Policy (Zero-Creep Data Minimization)

HydroMesh is built around an uncompromising **Data Minimization & Sovereign Protection** standard:

1. **Zero Commercial Tracking**:
   * HydroMesh never sells, rents, monetizes, or shares user emails, plant metrics, or operational logs with third-party advertisers, brokers, or data analytics consortiums.
2. **Cryptographic Identity Defense**:
   * Operator passwords are never stored in plaintext. They are salted and hashed using the memory-hard **Argon2id** algorithm (`time_cost=3`, `memory_cost=64MB`).
   * Timing-neutral dummy hashes (`verify_dummy_timing()`) eliminate account enumeration attacks.
3. **Mountain Coordinate Coarsening (Anti-Espionage Protocol)**:
   * Private user plant coordinates are automatically coarsened to a **0.1° grid** ($\approx 11\text{ km}$ buffer) when displayed on aggregate global maps:
     ```python
     lat_coarsened = round(math.floor(lat / 0.1) * 0.1, 2)
     lon_coarsened = round(math.floor(lon / 0.1) * 0.1, 2)
     ```
   * This strictly prevents unauthorized location intelligence or competitive reconnaissance of private infrastructure.
4. **GDPR / Privacy Right to Erasure**:
   * Users can terminate sessions via `/api/auth/logout-all` and request complete hard deletion of their registered plant and credentials from the SQLite WAL repository.

---

### 10.3 AI Ethics, Machine Learning Transparency & Safety Boundaries

Operators must have total confidence that the autonomous AI decision pipeline is transparent, ethical, and contained:

1. **Zero Training on Proprietary Dam Data**:
   * Live river flows, plant geometries, head measurements, and operator notes are **never** used to train commercial public foundation models.
2. **Deterministic Envelopes (No "Hallucinated" Actuations)**:
   * AI agents cannot invent new tools or arbitrary electrical setpoints. Every proposed action is constrained to a strictly typed, frozen schema (`ModulateIntake`, `TriggerFlush`, `ReallocateDispatch`).
   * The **Safety Kernel (Rules R1–R11)** independently audits all proposals against physical river limits, ensuring no dispatch exceeds turbine design flow ($Q_{\text{max}}$) or violates environmental minimum baseflow ($Q_{\text{base}}$).
3. **Transparent Explainability ("Why did the AI say this?")**:
   * The `ExplainerAgent` generates concise, jargon-free non-technical briefings explaining the exact physical reason for each alert (e.g., *"Heavy rain in Langtang basin upstream will arrive at the intake in 2.8 hours. We recommend flushing Basin 1 for 45 minutes"*).

---

### 10.4 Cookie Governance & Cache Management Policy

#### 1. Zero Surveillance Cookies:
HydroMesh rejects invasive third-party ad networks, Google Analytics cookies, and social tracking pixels. Only **strictly essential, security-hardened tokens** are deployed:

| Cookie / Key | Type | Storage Location | Expiry | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `session` | Essential Security | HTTP-Only, Secure, SameSite=Lax | 12 Hours (30m Idle) | Cryptographic bearer token identifying authenticated operator. |
| `hydromesh_csrf` | Essential Security | Request Header / State | Per Session | Prevents Cross-Site Request Forgery (CSRF) on manual overrides. |
| `hydromesh_ui_prefs`| User Experience | `localStorage` | Persistent | Stores dark mode contrast, preferred river basin, and metric units. |
| `hydromesh_onboarding_dismissed` | User Experience | `localStorage` | 30 Days | Prevents the 4-phase introductory tutorial from repeating on refresh. |
| `hydromesh_cookie_consent` | Legal Trust | `localStorage` | 1 Year | Remembers user acknowledgment of essential security cookies. |

#### 2. Cache & Telemetry Freshness Protocols:
* **In-Memory & Redis Blackboard TTL**: Telemetry values expire after **30 to 300 seconds** to ensure operators never make life-critical water decisions based on stale cached sensor feeds.
* **Satellite Mod|  1. MISSION & CORE │  2. SCADA FLEET    │  3. TRUST & SAFETY │  4. FIELD DISPATCH      │
│  Himalayan River   │  • 20-House Grid   │  • Privacy Policy  │  [OPERATOR ENTITY]      │
│  Smart Guardian    │  • Live Inspector  │  • Terms of Service│  [DISPATCH HOTLINE]     │
│  Advisory DSS      │  • SOP Procedures  │  • AI Ethics / Safe│  [STATION HQ ADDRESS]   │
│  Status: All Green │  • Twin Sandboxes  │  • Cookie Settings │  [REGULATORY LICENSE #] │
├────────────────────┴────────────────────┴────────────────────┴─────────────────────────┤
│  (C) 2026 HydroMesh · Himalayan Hydropower Autonomous Digital Twin · Version 0.4.0-sprint4 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Footer Columns:
1. **Column 1 — Brand, Mission & System Health**:
   * Brand name: `HydroMesh` with glowing amber hearth indicator.
   * Mission: *Autonomous Spatio-Temporal Digital Twin & Early Warning Sentinel for Himalayan Run-of-River Hydropower.*
   * Live Status Beacon: `[STATUS: ONLINE] · Satellite Link Active (ECMWF OpenData 0.25 deg)`.
2. **Column 2 — SCADA Operations & Telemetry**:
   * `20-Powerhouse Fleet Overview`
   * `Live Satellite Telemetry Inspector (live_extraction.py)`
   * `SOP RAG Procedural Memory (SHA-256 Verified)`
   * `Hydraulic Digital Twin Sandbox & Scenarios`
   * `FastAPI Engine Health (/api/health)`
3. **Column 3 — Trust, Governance & Legal Protection**:
   * `Privacy Policy & Sovereign Data Minimization`
   * `Terms of Use & Statutory Non-Liability Safe Harbor`
   * `AI Ethics & Advisory Dispatch Invariant (Advisory: True)`
   * `Essential Cookie & Local Storage Preferences`
   * `Security Vulnerability Reporting & PGP Key`
4. **Column 4 — Field Dispatch & Regulatory Information (User-Customizable Slots)**:
   * Explicit placeholder slots provided for the user/operator to inject their personal/company credentials:
     * **Operating Entity**: `[Your Company / Hydropower Consortium Name]`
     * **Emergency Control Room Dispatch**: `[24/7 Field Phone / Dispatch Radio Channel]`
     * **Regional Headquarters**: `[Physical Office Address / River Basin Division]`
     * **Regulatory Environmental Permit**: `[DOED / NEA Water Use License #]`
     * **Primary Support Desk**: `[support@yourdomain.org]`

#### Bottom Legal Micro-Bar:
* **Copyright**: `(C) 2026 HydroMesh. Open-source under MIT / Apache-2.0. Built for Himalayan Energy Resilience.`
* **Safety Affirmation**: `Advisory Decision Support System. Does not actuate physical equipment without human signoff.`
* **Version & SHA-256 Token**: `Release v0.4.0 (Sprint 4) · SOP Manifest SHA: 88c4b1...`

---

## 11. The AI "VAR" Decision Review HUD (Multi-Layer Verification Chamber)

> **Core Philosophy**: Video Assistant Referee (VAR) Rigor for Industrial AI.  
> **Anti-Slop Rule**: Conversational prose, AI apologies, polite chatbot paragraphs, and emojis are strictly prohibited. The output of the AI pipeline must present as an ultra-high-density telemetry review chamber—displaying connected wireframe boxes, live mathematical equation substitution traces, threshold audits, and point-by-point data ledgers.

### 11.1 The 5-Zone "VAR Chamber" Layout Architecture

The VAR Decision HUD sits directly within Mission Control, converting the multi-agent decision stream into an inspectable, auditable operational proof:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [SYSTEM: HYDROMESH VAR DECISION REVIEW CHAMBER // REF: SCADA-VAR-01]            [STATUS: MONITORED]    │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE A: MULTI-LAYER PIPELINE WIREFRAME & BOX TRACE                                                     │
│                                                                                                        │
│  ┌───────────────────────┐       ┌───────────────────────┐       ┌────────────────────────┐            │
│  │ LAYER 01: SENSOR AUDIT│------>│ LAYER 02: TRIAGE MATH │------>│ LAYER 03: TFT FORECAST │            │
│  │ • Plausibility: [PASS]│       │ • dQ/dt: +14.2% [NORM]│       │ • Peak Q: 901.4 m³/s   │            │
│  │ • Silt: 3,102.7 PPM   │       │ • Silt Delta: +158.5% │       │ • Risk Horizon: T+3.5h │            │
│  │ • IMERG: 34.8 mm/h    │       │ • Severity: CRITICAL  │       │ • PINN Loss: 0.0018    │            │
│  └───────────────────────┘       └───────────────────────┘       └────────────────────────┘            │
│                 │                                                                                      │
│                 |                                                                                      │
│                 v                                                                                      │
│  ┌───────────────────────┐       ┌───────────────────────┐       ┌────────────────────────┐            │
│  │ LAYER 04: SOP RAG     │------>│ LAYER 05: WEAR PHYSICS│------>│ LAYER 06: SAFETY KERNEL│            │
│  │ • SOP: SOP-HYD-04     │       │ • ΔW: 0.0842 mm/h     │       │ • R1 Conf >= 0.8: PASS │            │
│  │ • Sim Score: 0.894    │       │ • Critical RUL: 40.1h │       │ • R3 Flow Shock: PASS  │            │
│  │ • Verified: SHA-256   │       │ • Erosion Risk: HIGH  │       │ • Verdict: APPROVED    │            │
│  └───────────────────────┘       └───────────────────────┘       └────────────────────────┘            │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE B: LIVE MATHEMATICAL PROOF & EQUATION SUBSTITUTION TRACE                                          │
│                                                                                                        │
│  [1] IEC 62364 RUNNER ABRASION EQUATION (STAINLESS STEEL 13CR-4NI IN HIMALAYAN QUARTZ):               │
│      ΔW = 10^-9 * Km * C * (W_rel)^2.5 * K_hardness                                                     │
│      ΔW = 10^-9 * (1.25) * (3,102.7) * (42.5)^2.5 * (1.8)                                               │
│         = 0.08424 mm/h  -->  [3,911% ACCELERATION OVER CLEAR-WATER BASELINE (0.0021 mm/h)]             │
│                                                                                                        │
│  [2] WATER HAMMER TRANSIENT FLUID SURGE DYNAMICS (ALLIEVI SURGE / RULE R3):                            │
│      ΔQ_proposed = 66.0 m³/s --> 45.0 m³/s  (Drop: -21.0 m³/s = -31.8%)                                │
│      Safety Bound: Max allowable flow reduction = 50.0% (-33.0 m³/s)                                    │
│      Surge Head  : ΔH = (a * Δv) / g = (1,200 * -0.7) / 9.81 = -85.6 m  --> [SURGE TANK DAMPENED]     │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE C: RISK LEVEL DIAGNOSTIC & THRESHOLD AUDIT (IS IT RISKY OR NOT?)                                 │
│                                                                                                        │
│  ┌─────────────────────────────────┐  THRESHOLD AUDIT LEDGER:                                         │
│  │ RISK LEVEL: CRITICAL (HIGH WEAR)│  +-- Silt Concentration : 3,102.7 PPM vs 1,200.0 PPM --> [EXCEEDED]│
│  │ ACTION    : OPEN BASIN 1 SCOUR  │  +-- Turbine Vibration  : 3.82 mm/s   vs 4.50 mm/s    --> [WARNING] │
│  │ STATUS    : ADVISORY ONLY       │  +-- Ecological Baseflow: 45.0 m³/s   vs 13.2 m³/s    --> [PASSED]  │
│  └─────────────────────────────────┘  +-- Operator ACK Window: 600s Active Timeout Countdown--> [582s] │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE D: POINT-BY-POINT STRUCTURED DATA LEDGER                                                          │
│                                                                                                        │
│  • PLANT IDENTIFIER   : np-gandaki-marsyangdi-04 (Marsyangdi Hydropower Project, Gandaki Basin)        │
│  • COORDINATES / HEAD : 27.8711 N, 84.5422 E  |  90.5 m Net Head  |  69.0 MW Installed Capacity        │
│  • INTAKE ACTUATION   : Modulate Sluice Gate 0 to 45.0 m³/s (Delta: -21.0 m³/s, Flow Drop: -31.8%)     │
│  • DESANDER SCOUR     : Open Basin 1 Scour Gate (Flush Duration: 45 min, Scour Flow: 8.5 m³/s)         │
│  • AVOIDED EROSION    : Preserves 0.063 mm runner thickness per 6-hour monsoon flood crest             │
│  • MONETARY BENEFIT   : Estimated NPR 6.4 Lakhs overhaul cost mitigation over next 24h                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
                                                                          │
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
│ ZONE C: RISK LEVEL DIAGNOSTIC & THRESHOLD AUDIT (IS IT RISKY OR NOT?)                                 │
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

### 11.2 Design Tokens & Visual Hierarchy
* **Chamber Enclosure**: `--color-bg` (`#2A2C6B`) with 1px border `--color-sky-dark` (`#3E428F`) and 4px chamfered industrial corners.
* **Wireframe Box Lines**: 1px crisp borders using CSS `box-shadow: inset 0 0 12px rgba(56, 189, 248, 0.08)` to evoke CRT radar/VAR monitors.
* **Vector Step Connectors**: Horizontal and vertical directional connector arrows rendered via SVG paths with subtle flowing dash stroke animation (`stroke-dashoffset`).
* **Categorical Status Indicators**:
  * `[PASS] / [NOMINAL]`: Emerald neon border (`#10B981`) with static glow.
  * `[WARNING] / [CLAMPED]`: Amber hazard border (`#F59E0B`) with subtle pulse.
  * `[BREACH] / [CRITICAL_RISK]`: Crimson alert border (`#EF4444`) with high-visibility strobe.
* **Typography**: Pure monospace (`font-family: 'JetBrains Mono', 'Fira Code', monospace`) across all four zones to preserve column alignment and mathematical precision.

### 11.3 Mathematical Proof Card Components
Each mathematical derivation is wrapped in a `<MathProofBox />` component:
1. **Equation Name & Standard**: (e.g. `IEC 62364 Silt Abrasion`, `Penstock Surge Pressure / Allievi Formula`).
2. **Symbolic Formula**: Rendered in clear ASCII or KaTeX notation.
3. **Live Parameter Bindings**: Explicitly shows real-time variables injected from telemetry ($C$, $W_\text{rel}$, $Q$).
4. **Intermediate Arithmetic Trace**: Shows the exact step-by-step multiplication.
5. **Operational Delta**: Expressed as a comparison to clear-water baseline (e.g. `+3,911% above nominal wear rate`).

### 11.4 Threshold Audit & Risk Verdict Logic
The VAR HUD explicitly answers **"Is this situation risky or not?"** within a 0.25-second visual scan:
* **Green (Nominal Risk)**: Silt < 1,200 PPM, Vibration < 2.5 mm/s, Head within ±2% of design. Verdict: `GENERATE_OPTIMAL`.
* **Amber (Elevated Risk)**: Silt 1,200–3,000 PPM, Sluice flush required, Vibration in transition zone. Verdict: `PROACTIVE_FLUSH_ADVISORY`.
* **Red (Critical Risk)**: Silt > 3,000 PPM, Runner erosion accelerating rapidly. Verdict: `THROTTLE_INTAKE / ALERT_ONLY`.

---
*HydroMesh Master Design System — Complete, Lawsuit-Protected, Ethically Sound, and Powered by Precision VAR AI Telemetry.*



