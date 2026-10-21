import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-ui)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-4) var(--space-8)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-lg)",
            color: "var(--color-accent)",
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          HydroMesh
        </span>
        <div style={{ display: "flex", gap: "var(--space-6)" }}>
          {["Demo", "Safety", "Evidence", "About"].map((label) => (
            <Link
              key={label}
              href={`/${label.toLowerCase()}`}
              style={{
                color: "var(--color-text-secondary)",
                textDecoration: "none",
                fontSize: "var(--text-sm)",
                transition: "color 150ms ease",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-20) var(--space-8)",
          textAlign: "center",
          gap: "var(--space-6)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "var(--color-cloud-rim)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            border: "1px solid var(--color-cloud-rim)",
            padding: "var(--space-1) var(--space-3)",
            borderRadius: "4px",
          }}
        >
          Digital Twin · Advisory Only · Simulated Results
        </span>

        <h1
          style={{
            fontSize: "var(--text-hero)",
            fontWeight: 700,
            color: "var(--color-highlight)",
            lineHeight: 1.15,
            maxWidth: "800px",
            margin: 0,
          }}
        >
          Himalayan Hydropower
          <br />
          <span style={{ color: "var(--color-accent)" }}>
            Predictive Intelligence
          </span>
        </h1>

        <p
          style={{
            fontSize: "var(--text-lg)",
            color: "var(--color-text-secondary)",
            maxWidth: "560px",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Forecast suspended sediment &amp; river discharge 12–24 h ahead.
          Coupled with IEC 62364 turbine wear physics and 3-tier operational
          alerts for run-of-river plants.
        </p>

        <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
          <Link
            href="/demo"
            style={{
              background: "var(--color-accent)",
              color: "#0A0A0F",
              padding: "var(--space-3) var(--space-8)",
              borderRadius: "4px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "var(--text-base)",
              transition: "background 150ms ease",
            }}
          >
            View Live Demo
          </Link>
          <Link
            href="/safety"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              padding: "var(--space-3) var(--space-8)",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "var(--text-base)",
            }}
          >
            Safety Rules R1–R11
          </Link>
        </div>

        {/* Alert status preview strip */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-4)",
            marginTop: "var(--space-12)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { label: "🟢 GREEN", sub: "< 1,200 PPM", bg: "var(--color-green-bg)", border: "var(--color-green)" },
            { label: "🟡 YELLOW", sub: "1,200 – 3,000 PPM", bg: "var(--color-yellow-bg)", border: "var(--color-yellow)" },
            { label: "🔴 RED", sub: "> 3,000 PPM", bg: "var(--color-red-bg)", border: "var(--color-red)" },
          ].map(({ label, sub, bg, border }) => (
            <div
              key={label}
              style={{
                background: bg,
                borderLeft: `4px solid ${border}`,
                borderRadius: "0 8px 8px 0",
                padding: "var(--space-4) var(--space-6)",
                minWidth: "180px",
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-base)" }}>
                {label}
              </div>
              <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* Telemetry data row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-4)",
            marginTop: "var(--space-8)",
            width: "100%",
            maxWidth: "720px",
          }}
        >
          {[
            { label: "DISCHARGE", value: "342.8", unit: "m³/s" },
            { label: "SILT PPM", value: "1,847", unit: "ppm" },
            { label: "RUNNER WEAR", value: "0.42", unit: "mm" },
          ].map(({ label, value, unit }) => (
            <div
              key={label}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "var(--space-6)",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-dim)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "var(--space-2)",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xl)",
                  fontWeight: 700,
                  color: "var(--color-highlight)",
                }}
              >
                {value}
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-secondary)",
                    marginLeft: "var(--space-1)",
                    fontWeight: 400,
                  }}
                >
                  {unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "var(--space-6) var(--space-8)",
          borderTop: "1px solid var(--color-border)",
          textAlign: "center",
          color: "var(--color-text-dim)",
          fontSize: "var(--text-xs)",
          fontFamily: "var(--font-mono)",
        }}
      >
        HydroMesh v0.1.0 · Digital Twin MVP · All metrics simulated · Advisory
        only, never auto-actuates
      </footer>
    </main>
  );
}
