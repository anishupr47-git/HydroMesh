# HydroMesh Hero Illustration Specification (SVG)

> Technical specification and complete 14-layer vector asset for the Himalayan dusk fortress & waterfall hero composition.
> Every layer uses tokens from `docs/web/design.md`. Shipped as pure SVG vector code with zero raster dependencies.

---

## 1. Full 14-Layer SVG Production Code

```xml
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1440 810"
  preserveAspectRatio="xMidYMid slice"
  role="img"
  aria-label="Flat-vector illustration of a Himalayan fortress with a waterfall at dusk"
  class="w-full h-full select-none"
>
  <defs>
    <!-- Gradients -->
    <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#2A2C6B" />
      <stop offset="45%"  stop-color="#3D4590" />
      <stop offset="100%" stop-color="#6B72B5" />
    </linearGradient>

    <linearGradient id="cliff-face-grad" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%"   stop-color="#353D50" />
      <stop offset="40%"  stop-color="#2A3040" />
      <stop offset="100%" stop-color="#1E2330" />
    </linearGradient>

    <linearGradient id="waterfall-sheer-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="85%"  stop-color="#FFFFFF" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#E8EEF4" stop-opacity="0.9" />
    </linearGradient>

    <radialGradient id="window-glow-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#F0C860" stop-opacity="1" />
      <stop offset="55%"  stop-color="#D4A830" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#D4A830" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="mist-radial-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.85" />
      <stop offset="50%"  stop-color="#E8EEF4" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#D0D8E0" stop-opacity="0" />
    </radialGradient>

    <!-- Waterfall Flow Pattern -->
    <pattern id="waterfall-pattern" width="60" height="24" patternUnits="userSpaceOnUse">
      <line x1="10" y1="2" x2="10" y2="14" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
      <line x1="30" y1="8" x2="30" y2="22" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
      <line x1="50" y1="4" x2="50" y2="18" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" opacity="0.6"/>
    </pattern>

    <!-- Filters -->
    <filter id="window-bloom" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- ========================================== -->
  <!-- LAYER 0: Sky Background                    -->
  <!-- ========================================== -->
  <g id="layer-0-sky">
    <rect width="1440" height="810" fill="url(#sky-grad)" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 1: Distant Himalayan Mountain Ridges -->
  <!-- ========================================== -->
  <g id="layer-1-distant-mountains" opacity="0.45">
    <polygon points="0,480 110,430 220,455 360,390 480,440 620,380 780,450 920,370 1060,435 1200,385 1330,425 1440,395 1440,550 0,550" fill="#353870" />
    <polygon points="0,520 180,470 340,500 520,430 700,490 880,430 1040,490 1220,440 1440,485 1440,600 0,600" fill="#2D3060" opacity="0.6" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 2: Left Cloud Cluster               -->
  <!-- ========================================== -->
  <g id="layer-2-clouds-left" class="animate-cloud-drift">
    <!-- Cloud Shadows -->
    <path d="M -40,240 Q 60,190 180,210 Q 300,180 410,230 Q 510,210 590,260 L 590,320 L -40,320 Z" fill="#3F4F60" />
    <!-- Cloud Body -->
    <path d="M -40,220 Q 40,140 150,165 Q 260,110 380,145 Q 490,130 570,220 Q 520,290 390,285 Q 240,300 90,280 Z" fill="#5B6B80" />
    <!-- Cloud Golden Rim Light -->
    <path d="M -20,215 Q 40,136 150,161 Q 260,106 380,141 Q 490,126 565,215" fill="none" stroke="#D4B94A" stroke-width="4.5" stroke-linecap="round" class="animate-rim-light-pulse" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 3: Right Cloud Cluster              -->
  <!-- ========================================== -->
  <g id="layer-3-clouds-right" class="animate-cloud-drift">
    <!-- Cloud Shadows -->
    <path d="M 880,240 Q 980,180 1100,205 Q 1230,165 1350,210 Q 1420,195 1480,230 L 1480,310 L 880,310 Z" fill="#3F4F60" />
    <!-- Cloud Body -->
    <path d="M 900,225 Q 990,140 1120,160 Q 1240,115 1360,150 Q 1430,140 1480,195 Q 1460,270 1330,275 Q 1180,285 1020,270 Z" fill="#5B6B80" />
    <!-- Cloud Golden Rim Light -->
    <path d="M 905,220 Q 990,136 1120,156 Q 1240,111 1360,146 Q 1430,136 1475,190" fill="none" stroke="#D4B94A" stroke-width="4" stroke-linecap="round" class="animate-rim-light-pulse" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 4: Cliff / Rock Mass                -->
  <!-- ========================================== -->
  <g id="layer-4-cliff-mass">
    <!-- Main Western Cliff Face -->
    <polygon points="280,210 685,210 685,390 660,590 560,650 320,650 240,490 260,330" fill="url(#cliff-face-grad)" />
    <!-- Main Eastern Cliff Face -->
    <polygon points="765,210 1160,210 1180,350 1120,520 890,650 780,650 760,590 765,390" fill="url(#cliff-face-grad)" />
    <!-- Mid-lit Cliff Ledges & Facets -->
    <polygon points="280,210 460,210 420,290 270,300" fill="#353D50" />
    <polygon points="460,210 685,210 670,270 420,290" fill="#3E475C" />
    <polygon points="765,210 960,210 930,280 770,265" fill="#3E475C" />
    <polygon points="960,210 1160,210 1140,300 930,280" fill="#353D50" />
    <!-- Lower Gorge Ravine Sides -->
    <polygon points="630,390 685,390 665,590 610,570" fill="#222735" />
    <polygon points="765,390 820,390 840,570 785,590" fill="#1C212D" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 5: Upper Fortress (Terracotta)      -->
  <!-- ========================================== -->
  <g id="layer-5-upper-fortress">
    <!-- Fortress Shadows and Base Plinth -->
    <rect x="360" y="200" width="370" height="15" fill="#5E4538" />
    <!-- Central Keep Body -->
    <polygon points="420,95 640,95 650,200 410,200" fill="#7A5C48" />
    <!-- Central Keep Shadow Face -->
    <polygon points="610,95 640,95 650,200 620,200" fill="#5E4538" />
    <!-- Left Flanking Tower -->
    <polygon points="360,120 420,120 425,200 355,200" fill="#6E5240" />
    <!-- Right Flanking Bastion -->
    <polygon points="640,110 720,110 725,200 635,200" fill="#7A5C48" />
    <!-- Battlements / Crenellations -->
    <path d="M 420,95 L 420,85 L 440,85 L 440,95 L 460,95 L 460,85 L 480,85 L 480,95 L 500,95 L 500,85 L 520,85 L 520,95 L 540,95 L 540,85 L 560,85 L 560,95 L 580,95 L 580,85 L 600,85 L 600,95 L 620,95 L 620,85 L 640,85 L 640,95 Z" fill="#7A5C48" />
    <path d="M 360,120 L 360,110 L 380,110 L 380,120 L 400,120 L 400,110 L 420,110 L 420,120 Z" fill="#6E5240" />
    <path d="M 640,110 L 640,100 L 660,100 L 660,110 L 680,110 L 680,100 L 700,100 L 700,110 L 720,110 Z" fill="#6E5240" />
    <!-- Arched Windows (Dark Voids) -->
    <path d="M 450,140 A 10,10 0 0,1 470,140 L 470,165 L 450,165 Z" fill="#1A1010" />
    <path d="M 490,135 A 12,12 0 0,1 514,135 L 514,165 L 490,165 Z" fill="#1A1010" />
    <path d="M 535,135 A 12,12 0 0,1 559,135 L 559,165 L 535,165 Z" fill="#1A1010" />
    <path d="M 580,140 A 10,10 0 0,1 600,140 L 600,165 L 580,165 Z" fill="#1A1010" />
    <path d="M 375,145 A 8,8 0 0,1 395,145 L 395,170 L 375,170 Z" fill="#1A1010" />
    <path d="M 665,140 A 10,10 0 0,1 685,140 L 685,168 L 665,168 Z" fill="#1A1010" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 6: Lower Building (Amber Room)      -->
  <!-- ========================================== -->
  <g id="layer-6-lower-building">
    <!-- Lower Body Solid -->
    <polygon points="700,280 890,280 910,430 685,430" fill="#4A3830" />
    <!-- Lower Body Shadow Side -->
    <polygon points="850,280 890,280 910,430 870,430" fill="#3B2C26" />
    <polygon points="700,280 890,280 885,295 705,295" fill="#58433A" />
    
    <!-- Glowing Amber Windows with Radial Bloom -->
    <!-- Window 1 -->
    <g class="animate-window-glow">
      <circle cx="735" cy="355" r="42" fill="url(#window-glow-grad)" filter="url(#window-bloom)" opacity="0.85" />
      <path d="M 723,340 A 12,12 0 0,1 747,340 L 747,370 L 723,370 Z" fill="#F0C860" />
      <path d="M 726,342 A 9,9 0 0,1 744,342 L 744,368 L 726,368 Z" fill="#FFFFFF" opacity="0.75" />
    </g>
    <!-- Window 2 -->
    <g class="animate-window-glow" style="animation-delay: 0.6s;">
      <circle cx="785" cy="352" r="46" fill="url(#window-glow-grad)" filter="url(#window-bloom)" opacity="0.9" />
      <path d="M 772,335 A 13,13 0 0,1 798,335 L 798,370 L 772,370 Z" fill="#F0C860" />
      <path d="M 775,338 A 10,10 0 0,1 795,338 L 795,368 L 775,368 Z" fill="#FFFFFF" opacity="0.85" />
    </g>
    <!-- Window 3 -->
    <g class="animate-window-glow" style="animation-delay: 1.2s;">
      <circle cx="835" cy="355" r="42" fill="url(#window-glow-grad)" filter="url(#window-bloom)" opacity="0.85" />
      <path d="M 823,340 A 12,12 0 0,1 847,340 L 847,370 L 823,370 Z" fill="#F0C860" />
      <path d="M 826,342 A 9,9 0 0,1 844,342 L 844,368 L 826,368 Z" fill="#FFFFFF" opacity="0.75" />
    </g>
  </g>

  <!-- ========================================== -->
  <!-- LAYER 7: Rim-Lit Cliff Edges              -->
  <!-- ========================================== -->
  <g id="layer-7-cliff-rim-light">
    <polyline points="280,210 460,210 685,210" fill="none" stroke="#D4B94A" stroke-width="2.5" stroke-linejoin="round" />
    <polyline points="765,210 960,210 1160,210" fill="none" stroke="#D4B94A" stroke-width="2.5" stroke-linejoin="round" />
    <polyline points="420,290 670,270" fill="none" stroke="#D4B94A" stroke-width="1.8" opacity="0.7" />
    <polyline points="770,265 930,280" fill="none" stroke="#D4B94A" stroke-width="1.8" opacity="0.7" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 8: Waterfall Tier 1 (Upper Cascade)  -->
  <!-- ========================================== -->
  <g id="layer-8-waterfall-tier1">
    <!-- Back Spray Mist -->
    <polygon points="680,205 770,205 765,395 675,395" fill="#E8EEF4" opacity="0.5" />
    <!-- Main White Column -->
    <polygon points="688,208 762,208 755,390 685,390" fill="url(#waterfall-sheer-grad)" class="animate-waterfall-shimmer" />
    <!-- Flow Texture Overlay -->
    <polygon points="692,208 758,208 752,390 688,390" fill="url(#waterfall-pattern)" opacity="0.8" class="animate-waterfall-flow" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 9: Waterfall Tier 2 (Lower Cascade)  -->
  <!-- ========================================== -->
  <g id="layer-9-waterfall-tier2">
    <!-- Middle Shelf Mist Burst -->
    <ellipse cx="725" cy="390" rx="55" ry="16" fill="url(#mist-radial-grad)" class="animate-mist-pulse" />
    <!-- Widening Turbulent Cascade -->
    <polygon points="682,390 768,390 802,585 648,585" fill="url(#waterfall-sheer-grad)" class="animate-waterfall-shimmer" />
    <!-- Dynamic Stepped Zigzag Flumes -->
    <path d="M 688,390 L 678,440 L 690,470 L 666,525 L 676,555 L 648,585 L 802,585 L 778,550 L 788,520 L 766,465 L 776,435 L 764,390 Z" fill="#FFFFFF" opacity="0.95" />
    <polygon points="675,395 775,395 810,585 640,585" fill="url(#waterfall-pattern)" opacity="0.9" class="animate-waterfall-flow" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 10: Splash Pool & Mist Circles      -->
  <!-- ========================================== -->
  <g id="layer-10-splash-pool">
    <!-- Outer Deep Splash Basin -->
    <ellipse cx="725" cy="620" rx="170" ry="45" fill="#A8B4C0" opacity="0.75" />
    <!-- Reflective Main Pool -->
    <ellipse cx="725" cy="615" rx="145" ry="34" fill="#D0D8E0" />
    <!-- Core Pure White Impact Foam -->
    <ellipse cx="725" cy="600" rx="90" ry="20" fill="#FFFFFF" opacity="0.95" class="animate-mist-pulse" />
    <!-- Expanding Water Ripples -->
    <ellipse cx="725" cy="618" rx="120" ry="26" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.6" class="animate-mist-pulse" style="animation-delay: 0.8s;" />
    <ellipse cx="725" cy="625" rx="155" ry="32" fill="none" stroke="#E8EEF4" stroke-width="1.5" opacity="0.4" class="animate-mist-pulse" style="animation-delay: 1.6s;" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 11: Cypress Stand (Left)            -->
  <!-- ========================================== -->
  <g id="layer-11-cypress-left">
    <!-- Cypress 1 -->
    <polygon points="40,530 65,740 15,740" fill="#1A1F2E" />
    <ellipse cx="40" cy="640" rx="20" ry="100" fill="#1A1F2E" />
    <!-- Cypress 2 -->
    <polygon points="85,490 115,740 55,740" fill="#171C2A" />
    <ellipse cx="85" cy="620" rx="25" ry="120" fill="#171C2A" />
    <!-- Cypress 3 -->
    <polygon points="140,540 168,750 112,750" fill="#1A1F2E" />
    <ellipse cx="140" cy="650" rx="22" ry="95" fill="#1A1F2E" />
    <!-- Cypress 4 -->
    <polygon points="195,510 228,760 162,760" fill="#141824" />
    <ellipse cx="195" cy="635" rx="26" ry="115" fill="#141824" />
    <!-- Cypress 5 -->
    <polygon points="250,560 278,770 222,770" fill="#1A1F2E" />
    <ellipse cx="250" cy="665" rx="20" ry="85" fill="#1A1F2E" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 12: Cypress Stand (Right)           -->
  <!-- ========================================== -->
  <g id="layer-12-cypress-right">
    <!-- Cypress 1 -->
    <polygon points="1190,550 1218,770 1162,770" fill="#1A1F2E" />
    <ellipse cx="1190" cy="660" rx="22" ry="90" fill="#1A1F2E" />
    <!-- Cypress 2 -->
    <polygon points="1245,505 1278,760 1212,760" fill="#141824" />
    <ellipse cx="1245" cy="630" rx="26" ry="118" fill="#141824" />
    <!-- Cypress 3 -->
    <polygon points="1300,535 1328,750 1272,750" fill="#171C2A" />
    <ellipse cx="1300" cy="645" rx="24" ry="100" fill="#171C2A" />
    <!-- Cypress 4 -->
    <polygon points="1360,480 1392,740 1328,740" fill="#1A1F2E" />
    <ellipse cx="1360" cy="610" rx="28" ry="125" fill="#1A1F2E" />
    <!-- Cypress 5 -->
    <polygon points="1415,530 1440,740 1385,740" fill="#141824" />
    <ellipse cx="1415" cy="635" rx="22" ry="95" fill="#141824" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 13: Foreground Ground & Bushes      -->
  <!-- ========================================== -->
  <g id="layer-13-foreground-ground">
    <!-- Solid Ground Strip -->
    <polygon points="0,750 1440,750 1440,810 0,810" fill="#0F1218" />
    <!-- Rounded Silhouette Bushes (Left) -->
    <ellipse cx="60" cy="760" rx="70" ry="40" fill="#141820" />
    <ellipse cx="160" cy="765" rx="80" ry="45" fill="#10141A" />
    <ellipse cx="270" cy="770" rx="90" ry="40" fill="#141820" />
    <ellipse cx="400" cy="780" rx="110" ry="35" fill="#0F1218" />
    <!-- Rounded Silhouette Bushes (Right) -->
    <ellipse cx="1040" cy="780" rx="110" ry="35" fill="#0F1218" />
    <ellipse cx="1170" cy="770" rx="90" ry="40" fill="#141820" />
    <ellipse cx="1280" cy="765" rx="80" ry="45" fill="#10141A" />
    <ellipse cx="1380" cy="760" rx="70" ry="40" fill="#141820" />
  </g>

  <!-- ========================================== -->
  <!-- LAYER 14: Rising Mist Particles           -->
  <!-- ========================================== -->
  <g id="layer-14-mist-particles">
    <circle cx="680" cy="570" r="5" fill="#FFFFFF" opacity="0.7" class="animate-mist-float" style="animation-delay: 0.2s;" />
    <circle cx="710" cy="560" r="7" fill="#E8EEF4" opacity="0.8" class="animate-mist-float" style="animation-delay: 1.1s;" />
    <circle cx="740" cy="575" r="4" fill="#FFFFFF" opacity="0.6" class="animate-mist-float" style="animation-delay: 2.3s;" />
    <circle cx="765" cy="565" r="6" fill="#E8EEF4" opacity="0.75" class="animate-mist-float" style="animation-delay: 0.7s;" />
    <circle cx="695" cy="545" r="4.5" fill="#FFFFFF" opacity="0.65" class="animate-mist-float" style="animation-delay: 1.8s;" />
    <circle cx="750" cy="540" r="5.5" fill="#E8EEF4" opacity="0.7" class="animate-mist-float" style="animation-delay: 3.0s;" />
    <circle cx="725" cy="530" r="8" fill="#FFFFFF" opacity="0.5" class="animate-mist-float" style="animation-delay: 1.5s;" />
  </g>
</svg>
```

---

## 2. Layer-by-Layer Architectural Specification

| Layer | Element Name | Target Coordinate Envelope | SVG Primitives | Token Color Palette | Keyframe Motion Hooks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **L0** | Sky Background | $x \in [0, 1440], y \in [0, 810]$ | `<rect>` | `url(#sky-grad)` (`#2A2C6B` $\to$ `#6B72B5`) | Static base |
| **L1** | Distant Mountains | $x \in [0, 1440], y \in [370, 600]$ | `<polygon>` (low-poly ridges) | `#353870`, `#2D3060` (opacity 0.45–0.6) | Static depth cue |
| **L2** | Left Clouds | $x \in [-40, 590], y \in [110, 320]$ | `<path>` (billowing curves) | Body `#5B6B80`, Shadow `#3F4F60`, Stroke `#D4B94A` | `animate-cloud-drift`, `animate-rim-light-pulse` |
| **L3** | Right Clouds | $x \in [880, 1480], y \in [115, 310]$ | `<path>` (billowing curves) | Body `#5B6B80`, Shadow `#3F4F60`, Stroke `#D4B94A` | `animate-cloud-drift`, `animate-rim-light-pulse` |
| **L4** | Cliff / Rock Mass | $x \in [240, 1180], y \in [210, 650]$ | `<polygon>` (faceted cleft) | `url(#cliff-face-grad)`, `#353D50`, `#1E2330` | Static foundation |
| **L5** | Upper Fortress | $x \in [355, 725], y \in [85, 200]$ | `<polygon>`, `<path>`, `<rect>` | Body `#7A5C48`, Shadow `#5E4538`, Void `#1A1010` | Static architectural anchor |
| **L6** | Lower Building | $x \in [685, 910], y \in [280, 430]$ | `<polygon>`, `<circle>`, `<path>` | Body `#4A3830`, Glow `#F0C860` / `#D4A830` | `animate-window-glow` (pulsing amber) |
| **L7** | Cliff Rim Lighting | $x \in [280, 1160], y \in [210, 290]$ | `<polyline>` (stroke 2.5px) | `--color-cliff-lit` (`#D4B94A`) | Accent highlight |
| **L8** | Waterfall (Tier 1) | $x \in [675, 770], y \in [205, 395]$ | `<polygon>` | `url(#waterfall-sheer-grad)`, `#FFFFFF` | `animate-waterfall-shimmer`, `animate-waterfall-flow` |
| **L9** | Waterfall (Tier 2) | $x \in [640, 810], y \in [390, 590]$ | `<polygon>`, `<path>` (stepped flumes)| `url(#waterfall-sheer-grad)`, `#FFFFFF` | `animate-waterfall-shimmer`, `animate-waterfall-flow` |
| **L10**| Splash Pool & Mist | $x \in [555, 895], y \in [590, 655]$ | `<ellipse>` | `#FFFFFF`, `#E8EEF4`, `#D0D8E0`, `#A8B4C0` | `animate-mist-pulse` |
| **L11**| Cypress Trees (Left)| $x \in [15, 278], y \in [490, 770]$ | `<polygon>`, `<ellipse>` | `--color-fg-tree` (`#1A1F2E`, `#141824`) | Static silhouette |
| **L12**| Cypress Trees (Right)|$x \in [1162, 1440], y \in [480, 770]$| `<polygon>`, `<ellipse>` | `--color-fg-tree` (`#1A1F2E`, `#141824`) | Static silhouette |
| **L13**| Foreground Ground | $x \in [0, 1440], y \in [750, 810]$ | `<polygon>`, `<ellipse>` (bushes) | `--color-fg-ground` (`#0F1218`), `#141820` | Ground plane frame |
| **L14**| Mist Particles | $x \in [680, 765], y \in [530, 575]$ | `<circle>` ($r=4\dots8$) | `#FFFFFF`, `#E8EEF4` | `animate-mist-float` |

---

## 3. Next.js Component Integration

```tsx
// web/components/HeroIllustration.tsx
"use client";

import React from "react";

export function HeroIllustration() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* 1440x810 SVG canvas rendered inline for direct CSS class animation access */}
      <svg
        viewBox="0 0 1440 810"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full select-none"
      >
        {/* Full 14-layer vector hierarchy from Section 1 above */}
      </svg>
    </div>
  );
}
```

---

## 4. Asset & Licensing Note
The reference composition is a study; the output SVG is an original artwork created entirely from vector primitives (polygons, ellipses, paths, and gradients). Shipped code contains zero third-party binary images or copyrighted material.
