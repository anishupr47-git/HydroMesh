import Link from "next/link";
import MountainLandscape from "@/components/MountainLandscape";
import GlobalFooter from "@/components/GlobalFooter";
import CookieConsentBanner from "@/components/CookieConsentBanner";

export default function HomePage() {
  return (
    <div className="hydromesh-viewport-bg" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Mountain Landscape Fixed Backdrop */}
      <MountainLandscape focusMode={true} />

      {/* Top Navbar */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          borderBottom: "1px solid var(--color-border-default, #3A436D)",
          background: "rgba(30, 34, 64, 0.95)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Illuminated Amber Arch Window */}
          <div
            style={{
              width: "22px",
              height: "26px",
              background: "#1A1010",
              border: "2px solid #7A5C48",
              borderRadius: "10px 10px 2px 2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "16px",
                background: "#F0C860",
                borderRadius: "6px 6px 1px 1px",
                boxShadow: "0 0 10px rgba(240, 200, 96, 0.8)",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "18px",
              color: "var(--color-text-primary, #F4F6FC)",
              fontWeight: 800,
              letterSpacing: "0.04em",
            }}
          >
            Hydro<span style={{ color: "var(--color-cloud-rim, #D4B94A)" }}>Mesh</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {["Demo", "Safety", "Evidence", "About"].map((label) => (
            <Link
              key={label}
              href={`/${label.toLowerCase()}`}
              style={{
                color: "var(--color-text-secondary, #A6B0CF)",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 600,
                transition: "color 150ms ease",
              }}
            >
              {label}
            </Link>
          ))}
          <a
            href="https://drive.google.com/file/d/1Osoh1evxvKg218bq1rX2Ek3AweE2OcKj/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--color-cloud-rim, #D4B94A)",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Video Demo ↗
          </a>
          <Link
            href="/demo"
            style={{
              background: "var(--color-cloud-rim, #D4B94A)",
              color: "#1A1010",
              padding: "6px 16px",
              borderRadius: "4px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            Launch SCADA Cockpit →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px 80px 24px",
          textAlign: "center",
          gap: "20px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "11px",
            color: "var(--color-cloud-rim, #D4B94A)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            border: "1px solid var(--color-cloud-rim, #D4B94A)",
            padding: "4px 12px",
            borderRadius: "20px",
            background: "rgba(212, 185, 74, 0.12)",
          }}
        >
          Himalayan Hydropower Sentinel · Advisory Decision Support System
        </span>

        <h1
          style={{
            fontSize: "clamp(32px, 6vw, 64px)",
            fontWeight: 800,
            color: "var(--color-highlight, #FFFFFF)",
            lineHeight: 1.15,
            maxWidth: "920px",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Himalayan Hydropower
          <br />
          <span style={{ color: "var(--color-cloud-rim, #D4B94A)" }}>
            Smart River Guardian
          </span>
        </h1>

        <p
          style={{
            fontSize: "16px",
            color: "var(--color-text-secondary, #A6B0CF)",
            maxWidth: "680px",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Coupling deep-learning hydrology forecasting with operational economics. We predict quartz sediment influxes 12–24 hours ahead from satellite weather arrays, protecting turbine runners and maximizing clean generation revenue.
        </p>

        <div style={{ display: "flex", gap: "16px", marginTop: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/demo"
            style={{
              background: "var(--color-cloud-rim, #D4B94A)",
              color: "#1A1010",
              padding: "12px 28px",
              borderRadius: "4px",
              textDecoration: "none",
              fontWeight: 800,
              fontSize: "14px",
              boxShadow: "0 0 20px rgba(212, 185, 74, 0.4)",
            }}
          >
            Launch 20-House Fleet SCADA →
          </Link>
          <a
            href="https://drive.google.com/file/d/1Osoh1evxvKg218bq1rX2Ek3AweE2OcKj/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              border: "1px solid var(--color-cloud-rim, #D4B94A)",
              background: "rgba(212, 185, 74, 0.15)",
              color: "var(--color-cloud-rim, #D4B94A)",
              padding: "12px 24px",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Watch Video Demo ↗
          </a>
          <Link
            href="/safety"
            style={{
              border: "1px solid var(--color-border-bright, #546096)",
              background: "var(--color-surface, #1E2240)",
              color: "var(--color-text-primary, #F4F6FC)",
              padding: "12px 24px",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Safety Kernel Rules R1–R11
          </Link>
        </div>

        {/* Alert Status Preview Strip */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "32px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { label: "[NORMAL] Safe Baseload", sub: "< 1,200 PPM Silt · Clean mountain inflow", bg: "rgba(76, 175, 130, 0.12)", border: "#4CAF82" },
            { label: "[WATCH] Desander Flush", sub: "1,200 – 3,000 PPM · SOP-04 Sand exclusion active", bg: "rgba(229, 184, 59, 0.12)", border: "#E5B83B" },
            { label: "[CRITICAL] Gate Throttle", sub: "> 3,000 PPM · Emergency shutoff to save runners", bg: "rgba(230, 76, 76, 0.14)", border: "#E64C4C" },
          ].map(({ label, sub, bg, border }) => (
            <div
              key={label}
              style={{
                background: bg,
                borderLeft: `4px solid ${border}`,
                borderRadius: "0 6px 6px 0",
                padding: "14px 20px",
                minWidth: "250px",
                textAlign: "left",
                border: "1px solid var(--color-border-subtle, #2E3557)",
                borderLeftColor: border,
              }}
            >
              <div style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, fontSize: "13px", color: "var(--color-text-primary, #F4F6FC)" }}>
                {label}
              </div>
              <div style={{ color: "var(--color-text-secondary, #A6B0CF)", fontSize: "11px", marginTop: "4px" }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* Telemetry Preview Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
            marginTop: "24px",
            width: "100%",
            maxWidth: "880px",
          }}
        >
          {[
            { label: "RATED FLEET CAPACITY", value: "1,248", unit: "MW" },
            { label: "SATELLITE INGESTION", value: "9.0", unit: "km (ECMWF)" },
            { label: "IEC 62364 RUNNER SAVINGS", value: "NPR 15.3", unit: "Lakhs/day" },
          ].map(({ label, value, unit }) => (
            <div
              key={label}
              style={{
                background: "var(--color-surface, #1E2240)",
                border: "1px solid var(--color-border-default, #3A436D)",
                borderRadius: "6px",
                padding: "16px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "10px",
                  color: "var(--color-text-dim, #6C7699)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "var(--color-highlight, #FFFFFF)",
                }}
              >
                {value}
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--color-cloud-rim, #D4B94A)",
                    marginLeft: "6px",
                    fontWeight: 600,
                  }}
                >
                  {unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating Cookie Consent */}
      <CookieConsentBanner />

      {/* Master 4-Column Footer */}
      <GlobalFooter />
    </div>
  );
}
