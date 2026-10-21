export default function DemoPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg)", color: "var(--color-text-primary)", fontFamily: "var(--font-ui)", padding: "var(--space-8)" }}>
      <a href="/" style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", textDecoration: "none" }}>← HydroMesh</a>
      <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 700, marginTop: "var(--space-6)", marginBottom: "var(--space-4)" }}>
        Live Demo Dashboard
      </h1>
      <p style={{ color: "var(--color-text-secondary)", maxWidth: "560px", lineHeight: 1.7, marginBottom: "var(--space-8)" }}>
        Real-time agent event stream, twin gauges, forecast chart, and operator override panel. Powered by the HydroMesh API — falls back to recorded replay when API is unreachable.
      </p>

      {/* Placeholder panels */}
      {[
        { title: "Agent Event Stream", desc: "LiveStream component — WebSocket /ws/stream · agent decisions, safety verdicts, alert transitions" },
        { title: "Twin Gauges", desc: "TwinGauges component — discharge m³/s · silt PPM · runner wear mm · grid freq Hz" },
        { title: "Forecast Chart", desc: "ForecastChart component — actual vs predicted sediment over 24h horizon · Recharts" },
        { title: "Incident Cards", desc: "IncidentCard component — per-incident report · safety verdict · override countdown button" },
      ].map(({ title, desc }) => (
        <div
          key={title}
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "var(--space-6)",
            marginBottom: "var(--space-4)",
          }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "var(--space-2)" }}>
            T15–T16 →
          </div>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600, marginBottom: "var(--space-2)", margin: "0 0 var(--space-2)" }}>{title}</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", margin: 0 }}>{desc}</p>
        </div>
      ))}
    </main>
  );
}
