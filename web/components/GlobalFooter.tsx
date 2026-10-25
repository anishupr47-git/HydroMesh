"use client";

import React from "react";
import Link from "next/link";

export default function GlobalFooter() {
  return (
    <footer className="bg-[#0F1A2E] border-t border-[#C9A24B] text-[#A3B0C8] font-sans px-6 py-12 mt-auto relative z-10">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        {/* Column 1: Brand, Mission & System Health */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-full border border-[#C9A24B] flex items-center justify-center bg-[#0B1424]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#F0D27A] shadow-[0_0_6px_#F0D27A]" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-[#F1EAD9]">
              Hydro<span className="text-[#F0D27A]">Mesh</span>
            </span>
          </div>

          <p className="text-xs leading-relaxed text-[#D9D2BF] mb-4">
            Autonomous Spatio-Temporal Digital Twin & Early Warning Sentinel for Himalayan Run-of-River Hydropower. Couples deep-learning forecasting with operational economics.
          </p>

          <div className="inline-flex items-center gap-2 bg-[#0B1424] border border-[#C9A24B]/30 rounded-sm px-3 py-1.5 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#5FB3A8] shadow-[0_0_6px_#5FB3A8]" />
            <span className="text-[#5FB3A8] font-bold">Systems Operational</span>
            <span className="text-[#A3B0C8]">· NASA GPM Live</span>
          </div>
        </div>

        {/* Column 2: Architecture & Research */}
        <div>
          <h4 className="font-serif text-sm font-bold text-[#F1EAD9] uppercase tracking-wider mb-3">
            Architecture
          </h4>
          <ul className="space-y-2 text-xs font-sans">
            <li>
              <Link href="/demo" className="text-[#A3B0C8] hover:text-[#F0D27A] transition-colors">
                SCADA Mission Control Cockpit
              </Link>
            </li>
            <li>
              <Link href="/safety" className="text-[#A3B0C8] hover:text-[#F0D27A] transition-colors">
                Safety Kernel Rules (R1–R11)
              </Link>
            </li>
            <li>
              <Link href="/evidence" className="text-[#A3B0C8] hover:text-[#F0D27A] transition-colors">
                Sha-256 Verified SOP Audit
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-[#A3B0C8] hover:text-[#F0D27A] transition-colors">
                Himalayan Hydrology Deep Dive
              </Link>
            </li>
            <li>
              <a
                href="https://drive.google.com/file/d/1Osoh1evxvKg218bq1rX2Ek3AweE2OcKj/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F0D27A] hover:underline transition-colors"
              >
                Video Demonstration (Google Drive) ↗
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Physical Standards */}
        <div>
          <h4 className="font-serif text-sm font-bold text-[#F1EAD9] uppercase tracking-wider mb-3">
            Physical Compliance
          </h4>
          <ul className="space-y-2 text-xs font-mono text-[#A3B0C8]">
            <li>IEC 62364: Quartz Runner Abrasion</li>
            <li>Allievi Formula: Surge Clamping</li>
            <li>NASA GPM IMERG: 9km Telemetry</li>
            <li>Open-Meteo: Real-Time Catchment Weather</li>
          </ul>
        </div>

        {/* Column 4: Operational Disclaimer */}
        <div>
          <h4 className="font-serif text-sm font-bold text-[#F1EAD9] uppercase tracking-wider mb-3">
            Statutory Notice
          </h4>
          <p className="text-[11px] text-[#A3B0C8] leading-relaxed">
            HydroMesh models run in an air-gapped advisory state. Gate actuation proposals require human operator interlock authorization before programmable logic controller transmission.
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto pt-6 border-t border-[#C9A24B]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#A3B0C8]">
        <div>© 2026 HydroMesh Sentinel. Himalayan Run-of-River Intelligence.</div>
        <div>NST UTC+5:45 · Kathmandu Grid Reference</div>
      </div>
    </footer>
  );
}
