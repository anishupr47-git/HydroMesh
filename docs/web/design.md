# HydroMesh Design Tokens & Design System

> Design system extracted from the reference illustration (dusk cliffside fortress + waterfall).
> Every colour, spacing, and motion value is a CSS token. No raw hex values in components.

---

## 1. Design Reference — Visual Language

| Element | Description |
| :--- | :--- |
| **Sky** | Deep indigo at top, bleeding into periwinkle mid-sky — no cloud blending, hard layer edges. |
| **Clouds** | Large, round, billowing — blue-grey body with a warm golden-yellow rim light on top edges. |
| **Fortress** | Two-tier: upper cliff building (terracotta brown, arched windows), lower building (darker, one room warmly lit). |
| **Glowing Room**| Amber-yellow fill through arched windows — the single warmth source in the entire scene. |
| **Cliff / Rock** | Very dark slate — forms the cleft the waterfall falls through. |
| **Waterfall** | Pure white, two tiers, cascading into a pale grey-white splash pool. The single brightest element = focal point. |
| **Foreground** | Near-black cypress silhouettes and rounded bush shapes — pure negative silhouette. |
| **Pool / River** | Light grey-white at base, reflective. |

**Style Vocabulary**: Flat, geometric, layered depth — hard polygon edges. Every shape reads at thumbnail size.

---

## 2. CSS Design Tokens (`:root`)

```css
/* === HydroMesh Design Tokens === */
/* Placed in web/app/globals.css — never use raw hex in components */
:root {
  /* Sky */
  --color-sky-deep:        #2A2C6B;   /* top of sky — deep indigo-navy */
  --color-sky-mid:         #4B5499;   /* mid sky — periwinkle */
  --color-sky-horizon:     #6B72B5;   /* sky near horizon — lighter periwinkle */

  /* Clouds */
  --color-cloud-body:      #5B6B80;   /* main cloud fill — blue-grey */
  --color-cloud-shadow:    #3F4F60;   /* underside of cloud — deeper */
  --color-cloud-rim:       #D4B94A;   /* golden-yellow rim light — top edge highlight */
  --color-cloud-rim-soft:  #C9A93A;   /* secondary rim / falloff */

  /* Architecture */
  --color-arch-upper:      #7A5C48;   /* upper fortress — warm terracotta brown */
  --color-arch-upper-dark: #5E4538;   /* shadow face of upper fortress */
  --color-arch-lower:      #4A3830;   /* lower building body — darker, shadowed */
  --color-arch-window-glow:#D4A830;   /* glowing amber window fill */
  --color-arch-window-edge:#F0C860;   /* window glow bloom edge */
  --color-arch-arch-void:  #1A1010;   /* dark inside of arched openings */

  /* Cliff / Rock */
  --color-cliff-main:      #2A3040;   /* main cliff face — dark slate */
  --color-cliff-mid:       #353D50;   /* mid-lit cliff ledge */
  --color-cliff-lit:       #D4B94A;   /* rim-lit cliff edge */

  /* Waterfall — The Focal Point */
  --color-waterfall:       #FFFFFF;   /* waterfall body — pure white */
  --color-waterfall-mist:  #E8EEF4;   /* mist / spray at base — near white, cool blue */
  --color-pool:            #D0D8E0;   /* splash pool — light grey-white */
  --color-pool-deep:       #A8B4C0;   /* deeper pool areas */

  /* Foreground */
  --color-fg-tree:         #1A1F2E;   /* cypress silhouettes — near black navy */
  --color-fg-bush:         #141820;   /* rounded bush silhouettes — darkest */
  --color-fg-ground:       #0F1218;   /* ground strip at very bottom */

  /* UI Semantic */
  --color-bg:              var(--color-sky-deep);
  --color-surface:         #1E2240;   /* cards, panels */
  --color-surface-raised:  #252B4A;   /* elevated surface */
  --color-border:          #3A4060;   /* subtle borders */
  --color-border-glow:     var(--color-cloud-rim);
  --color-text-primary:    #E8EAF6;   /* near white, cool tint */
  --color-text-secondary:  #9FA8C2;   /* muted periwinkle-grey */
  --color-text-dim:        #5B6480;   /* placeholder / disabled */

  /* Alert Status */
  --color-green:           #4CAF82;   /* GREEN alert */
  --color-yellow:          var(--color-cloud-rim);     /* #D4B94A — YELLOW alert */
  --color-red:             #E05050;   /* RED alert */
  --color-green-bg:        rgba(76,175,130,0.12);
  --color-yellow-bg:       rgba(212,185,74,0.12);
  --color-red-bg:          rgba(224,80,80,0.12);

  /* Accent */
  --color-accent:          var(--color-arch-window-glow); /* #D4A830 — warm amber */
  --color-accent-hover:    var(--color-arch-window-edge); /* #F0C860 */
  --color-accent-muted:    rgba(212,168,48,0.15);

  /* Highlights */
  --color-highlight:       var(--color-waterfall);
  --color-highlight-muted: var(--color-waterfall-mist);
}
```

---

## 3. Typography & Scale

```css
:root {
  --font-ui:    'Inter', system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', monospace;

  --text-xs:    0.75rem;   /* 12px */
  --text-sm:    0.875rem;  /* 14px */
  --text-base:  1rem;      /* 16px */
  --text-lg:    1.125rem;  /* 18px */
  --text-xl:    1.25rem;   /* 20px */
  --text-2xl:   1.5rem;    /* 24px */
  --text-3xl:   1.875rem;  /* 30px */
  --text-4xl:   2.25rem;   /* 36px */
  --text-hero:  clamp(2.5rem, 6vw, 5rem);
}
```

---

## 4. Spacing System

```css
:root {
  --space-1:  0.25rem;  /* 4px */
  --space-2:  0.5rem;   /* 8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-5:  1.25rem;  /* 20px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
}
```

---

## 5. Named Keyframe Animations

| Animation Name | Target | Keyframe Description |
| :--- | :--- | :--- |
| `waterfall-shimmer` | SVG waterfall path | opacity pulses 0.85–1.0–0.85, translateX 1px, 2.4s ease-in-out infinite |
| `waterfall-flow` | Waterfall pattern | SVG pattern translateY 0–24px, 1.2s linear infinite |
| `mist-pulse` | Splash pool ellipse | scale 1.0–1.04–1.0, opacity 0.7–1.0–0.7, 3s ease-in-out infinite |
| `cloud-drift` | Cloud layers | translateX 0–8px–0, 12s ease-in-out infinite |
| `window-glow` | Building window fill | opacity 0.85–1.0–0.85 + radial pulse, 4s ease-in-out infinite |
| `rim-light-pulse` | Cloud top stroke | opacity 0.6–1.0–0.6, 3.5s ease-in-out infinite |
| `agent-event-in` | LiveStream rows | translateY 8px->0 + opacity 0->1, 180ms ease-out |
| `alert-flash` | RED status bar | background pulses between `--color-red-bg` and 0.22 opacity, 1s infinite |
| `gauge-fill` | Gauge bars | width/height transition 600ms cubic-bezier(0.34, 1.56, 0.64, 1) |
| `card-hover` | IncidentCard | translateY -3px + box shadow elevation, 150ms ease-out |

---

## 6. Accessibility & Motion Gating

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
- Contrast meets WCAG 2.1 AA across dark palette.
- High-visibility keyboard focus rings: `outline: 2px solid var(--color-cloud-rim)`.
