"use client";

import React from "react";

interface MountainLandscapeProps {
  focusMode?: boolean; // True on splash / hero landing, muted (35%) on busy dashboards
  className?: string;
}

export default function MountainLandscape({ focusMode = false, className = "" }: MountainLandscapeProps) {
  return (
    <div
      className={`hydromesh-hero-landscape ${focusMode ? "hero-focus" : ""} ${className}`}
      aria-hidden="true"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        height: focusMode ? "75vh" : "55vh",
        maxHeight: "760px",
        minHeight: "340px",
        pointerEvents: "none",
        zIndex: 2,
        opacity: focusMode ? 0.95 : 0.32,
        transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), height 700ms ease",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 1600 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          {/* Golden Sunset Cloud Rim Glow Filter */}
          <filter id="goldenRimGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Arched Window Hearth Bloom */}
          <filter id="windowBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Waterfall Mist Linear Gradient */}
          <linearGradient id="waterfallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#E8EEF4" stopOpacity="0.85" />
          </linearGradient>

          {/* River Surface Gradient */}
          <linearGradient id="riverSurfaceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A8B4C0" />
            <stop offset="50%" stopColor="#D0D8E0" />
            <stop offset="100%" stopColor="#A8B4C0" />
          </linearGradient>
        </defs>

        {/* =================================================================
            LAYER 1: VOLUMETRIC HIGH-ALTITUDE CLOUDS (Flanking Masses)
            ================================================================= */}
        {/* Left Cloud Flank */}
        <g className="anim-cloud-flank-left">
          {/* Cloud base shadow */}
          <path
            d="M-80 340 C -40 280, 20 290, 80 320 C 120 270, 200 260, 260 300 C 320 250, 420 260, 460 330 C 500 400, 380 480, 260 490 L-80 490 Z"
            fill="#3F4F60"
          />
          {/* Cloud upper body */}
          <path
            d="M-80 320 C -40 240, 40 250, 100 290 C 150 230, 230 220, 290 260 C 350 210, 440 220, 480 290 C 510 350, 420 440, 280 450 L-80 450 Z"
            fill="#5B6B80"
          />
          {/* Golden Cloud Rim Stroke */}
          <path
            d="M-60 310 C -20 235, 50 245, 105 285 C 155 225, 235 215, 295 255 C 355 205, 445 215, 485 285"
            stroke="#D4B94A"
            strokeWidth="3"
            strokeLinecap="round"
            className="anim-cloud-rim"
            filter="url(#goldenRimGlow)"
          />
        </g>

        {/* Right Cloud Flank */}
        <g className="anim-cloud-flank-right">
          {/* Cloud base shadow */}
          <path
            d="M1120 310 C 1160 250, 1260 250, 1310 290 C 1370 230, 1460 230, 1510 280 C 1570 240, 1660 260, 1690 320 L1690 490 L1120 490 Z"
            fill="#3F4F60"
          />
          {/* Cloud upper body */}
          <path
            d="M1140 290 C 1180 220, 1270 220, 1320 260 C 1380 200, 1480 200, 1530 250 C 1590 210, 1670 230, 1700 290 L1700 450 L1140 450 Z"
            fill="#5B6B80"
          />
          {/* Golden Cloud Rim Stroke */}
          <path
            d="M1145 285 C 1185 215, 1275 215, 1325 255 C 1385 195, 1485 195, 1535 245 C 1595 205, 1675 225, 1705 285"
            stroke="#D4B94A"
            strokeWidth="3"
            strokeLinecap="round"
            className="anim-cloud-rim"
            filter="url(#goldenRimGlow)"
          />
        </g>

        {/* =================================================================
            LAYER 4: FRACTURED SLATE HIMALAYAN CLIFFS (Deep Navy Slate)
            ================================================================= */}
        {/* Left Canyon Wall */}
        <polygon
          points="0,700 0,260 140,240 280,310 390,280 520,380 620,350 680,440 680,700"
          fill="#1F2430"
        />
        <polygon
          points="80,700 160,330 280,310 380,370 510,420 580,510 580,700"
          fill="#2A3040"
        />
        <polygon
          points="240,700 320,410 420,440 480,520 480,700"
          fill="#353D50"
        />
        {/* Rim-Lit Rock Ledges on Left */}
        <polyline
          points="130,242 278,312 388,282 518,382 618,352"
          stroke="#D4B94A"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Right Canyon Wall */}
        <polygon
          points="1600,700 1600,240 1460,220 1320,290 1210,260 1080,360 980,330 920,430 920,700"
          fill="#1F2430"
        />
        <polygon
          points="1520,700 1440,310 1320,290 1220,350 1090,400 1020,490 1020,700"
          fill="#2A3040"
        />
        <polygon
          points="1360,700 1280,390 1180,420 1120,500 1120,700"
          fill="#353D50"
        />
        {/* Rim-Lit Rock Ledges on Right */}
        <polyline
          points="1465,222 1322,292 1212,262 1082,362 982,332"
          stroke="#D4B94A"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* =================================================================
            LAYER 2 & 3: CITADEL POWERHOUSE & ILLUMINATED CONTROL ROOM
            (Center Right Plateau, nestled into cliffside)
            ================================================================= */}
        <g id="hydropowerCitadel">
          {/* Lower Stone Retaining Wall / Powerhouse Foundation */}
          <polygon
            points="880,480 1060,460 1060,590 860,600"
            fill="#4A3830"
          />
          {/* Upper Fortress Keep (Terracotta Stone) */}
          <polygon
            points="895,380 1045,365 1055,465 885,480"
            fill="#7A5C48"
          />
          {/* Shaded Masonry Accent */}
          <polygon
            points="990,370 1045,365 1055,465 1000,470"
            fill="#5E4538"
          />
          {/* Fortress Crenellations / Battlements */}
          <rect x="895" y="370" width="16" height="12" fill="#7A5C48" />
          <rect x="925" y="367" width="16" height="12" fill="#7A5C48" />
          <rect x="955" y="364" width="16" height="12" fill="#7A5C48" />
          <rect x="985" y="361" width="16" height="12" fill="#7A5C48" />
          <rect x="1015" y="358" width="16" height="12" fill="#7A5C48" />

          {/* Arched Window Voids (Dark Stone Sockets) */}
          <path d="M 915 425 Q 925 410 935 425 L 935 450 L 915 450 Z" fill="#1A1010" />
          <path d="M 950 422 Q 960 407 970 422 L 970 447 L 950 447 Z" fill="#1A1010" />
          <path d="M 985 419 Q 995 404 1005 419 L 1005 444 L 985 444 Z" fill="#1A1010" />

          {/* THREE ILLUMINATED CONTROL ROOM ARCHED WINDOWS (The Heartbeat Glow) */}
          <g className="anim-window-glow">
            {/* Window 1 */}
            <path
              d="M 917 426 Q 925 413 933 426 L 933 448 L 917 448 Z"
              fill="#F0C860"
              filter="url(#windowBloom)"
            />
            <circle cx="925" cy="432" r="4" fill="#FFF0B3" />

            {/* Window 2 (Center - Brightest) */}
            <path
              d="M 952 423 Q 960 410 968 423 L 968 445 L 952 445 Z"
              fill="#F0C860"
              filter="url(#windowBloom)"
            />
            <circle cx="960" cy="429" r="4.5" fill="#FFF0B3" />

            {/* Window 3 */}
            <path
              d="M 987 420 Q 995 407 1003 420 L 1003 442 L 987 442 Z"
              fill="#F0C860"
              filter="url(#windowBloom)"
            />
            <circle cx="995" cy="426" r="4" fill="#FFF0B3" />
          </g>

          {/* Diffuse Warm Hearth Light Spill on Lower Foundation */}
          <ellipse cx="960" cy="475" rx="75" ry="25" fill="rgba(240, 200, 96, 0.16)" />
        </g>

        {/* =================================================================
            LAYER 5: DUAL-TIER HIMALAYAN WATERFALL (The Focal Light)
            ================================================================= */}
        <g id="dualTierWaterfall">
          {/* Upper Mountain Cascade (Dropping from mountain cleft at 780 to terrace at 810) */}
          <path
            d="M 770 330 Q 775 390 765 440 L 795 440 Q 805 390 790 330 Z"
            fill="url(#waterfallGrad)"
            className="anim-waterfall-core"
          />

          {/* Middle Rock Terrace & Spray Foam Barrier */}
          <polygon
            points="740,440 820,435 830,470 730,475"
            fill="#2A3040"
          />
          <ellipse cx="780" cy="442" rx="38" ry="8" fill="#F8FAFC" opacity="0.9" />

          {/* Lower Roaring Plunge (Dropping into Tailrace River) */}
          <path
            d="M 745 465 Q 735 550 720 640 L 830 640 Q 820 550 810 465 Z"
            fill="url(#waterfallGrad)"
            className="anim-waterfall-core"
          />

          {/* Hydraulic Downward Flowlines (Vector Dash Animation) */}
          <line
            x1="765"
            y1="470"
            x2="750"
            y2="635"
            stroke="#E8EEF4"
            strokeWidth="3"
            className="anim-waterfall-flowlines"
          />
          <line
            x1="785"
            y1="470"
            x2="780"
            y2="635"
            stroke="#E8EEF4"
            strokeWidth="4"
            className="anim-waterfall-flowlines"
          />
          <line
            x1="805"
            y1="470"
            x2="800"
            y2="635"
            stroke="#E8EEF4"
            strokeWidth="3"
            className="anim-waterfall-flowlines"
          />

          {/* Splash Pool Foam & Rising Mist Spray */}
          <ellipse cx="775" cy="640" rx="90" ry="24" fill="#FFFFFF" opacity="0.92" />
          <ellipse cx="775" cy="635" rx="120" ry="32" fill="#E8EEF4" opacity="0.65" />

          {/* Ascending Mist Aerosol Particles */}
          <circle cx="740" cy="625" r="7" fill="#FFFFFF" className="anim-mist-particle mist-p1" />
          <circle cx="765" cy="620" r="9" fill="#FFFFFF" className="anim-mist-particle mist-p2" />
          <circle cx="795" cy="622" r="8" fill="#FFFFFF" className="anim-mist-particle mist-p3" />
          <circle cx="820" cy="628" r="6" fill="#FFFFFF" className="anim-mist-particle mist-p4" />
        </g>

        {/* =================================================================
            LAYER 6: SPLASH POOL & TAILRACE RIVER RUNOUT
            ================================================================= */}
        <polygon
          points="560,700 680,630 880,630 1020,700"
          fill="url(#riverSurfaceGrad)"
        />
        {/* Shimmering Tailrace Flow Wavelets */}
        <path d="M 690 655 Q 730 650 770 655" stroke="#FFFFFF" strokeWidth="2" opacity="0.75" />
        <path d="M 760 670 Q 800 665 840 670" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.8" />
        <path d="M 720 685 Q 770 680 820 685" stroke="#FFFFFF" strokeWidth="2" opacity="0.65" />

        {/* =================================================================
            LAYER 7: FOREGROUND SILHOUETTES (Himalayan Cypress Trees & Scrub)
            ================================================================= */}
        {/* Left Cypress Pines */}
        <g fill="#141820">
          {/* Pine 1 (Left Tall) */}
          <polygon points="120,700 80,600 100,600 60,500 80,500 50,420 80,420 120,360 160,420 190,420 160,500 180,500 140,600 160,600" />
          {/* Pine 2 (Left Mid) */}
          <polygon points="210,700 180,620 195,620 165,540 180,540 155,470 180,470 210,410 240,470 265,470 240,540 255,540 225,620 240,620" />
          {/* Riverside Scrub Silhouettes */}
          <ellipse cx="60" cy="690" rx="90" ry="35" fill="#0F1218" />
          <ellipse cx="280" cy="695" rx="80" ry="30" fill="#0F1218" />
          <ellipse cx="440" cy="700" rx="100" ry="25" fill="#0F1218" />
        </g>

        {/* Right Cypress Pines */}
        <g fill="#141820">
          {/* Pine 3 (Right Tall) */}
          <polygon points="1460,700 1420,590 1440,590 1400,490 1420,490 1390,410 1420,410 1460,340 1500,410 1530,410 1500,490 1520,490 1480,590 1500,590" />
          {/* Pine 4 (Right Flank) */}
          <polygon points="1350,700 1320,630 1335,630 1305,560 1320,560 1295,490 1320,490 1350,430 1380,490 1405,490 1380,560 1395,560 1365,630 1380,630" />
          {/* Riverside Scrub Silhouettes */}
          <ellipse cx="1160" cy="700" rx="90" ry="25" fill="#0F1218" />
          <ellipse cx="1320" cy="695" rx="80" ry="30" fill="#0F1218" />
          <ellipse cx="1520" cy="690" rx="100" ry="35" fill="#0F1218" />
        </g>

        {/* Ground baseline strip at bottom edge */}
        <rect x="0" y="695" width="1600" height="5" fill="#0F1218" />
      </svg>
    </div>
  );
}
