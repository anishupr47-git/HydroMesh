import Link from "next/link";

const tableRows = [
  { metric: "Turbine Wheel Scratches (metal worn off per monsoon)", baseline: "Without Helper", hydromesh: "With HydroMesh", improvement: "50%+ Less Wear" },
  { metric: "Lost Clean Electricity (power lost from shutdowns)", baseline: "Without Helper", hydromesh: "With HydroMesh", improvement: "Fewer Outages" },
  { metric: "Surprise Breakdowns (emergency plant stops)", baseline: "Without Helper", hydromesh: "With HydroMesh", improvement: "Zero Surprise Stops" },
  { metric: "Timely Sand Cleaning (flushes done before basins clog)", baseline: "Without Helper", hydromesh: "With HydroMesh", improvement: "Cleaned on Time" },
];

export default function EvidencePage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg)", color: "var(--color-text-primary)", fontFamily: "var(--font-ui)", padding: "var(--space-8)" }}>
      <Link href="/" style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", textDecoration: "none" }}>← HydroMesh</Link>

      <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 700, marginTop: "var(--space-6)", marginBottom: "var(--space-2)" }}>
        How Much HydroMesh Helps (Performance Report)
      </h1>

      <p style={{ color: "var(--color-text-secondary)", maxWidth: "620px", lineHeight: 1.7, marginBottom: "var(--space-6)" }}>
        We compare how a mountain hydropower plant runs on its own versus when our smart river helper gives early warnings. 
        Early sand cleaning cuts turbine damage by more than half!
      </p>

      <div style={{ background: "var(--color-yellow-bg)", border: "1px solid var(--color-yellow)", borderRadius: "8px", padding: "var(--space-4) var(--space-6)", maxWidth: "680px", marginBottom: "var(--space-8)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-cloud-rim)" }}>
        [NOTE]: These numbers come from our computer simulation twin. The AI only gives advice; human operators always make the final call!
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", maxWidth: "800px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
            {["Metric", "Baseline (Reactive)", "HydroMesh (Advisory)", "Δ Improvement"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", color: "var(--color-text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "var(--text-xs)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((r, i) => (
            <tr key={r.metric} style={{ borderBottom: "1px solid var(--color-border)", background: i % 2 === 0 ? "transparent" : "var(--color-surface)" }}>
              <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-primary)", fontWeight: 600 }}>{r.metric}</td>
              <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-dim)" }}>{r.baseline}</td>
              <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-dim)" }}>{r.hydromesh}</td>
              <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-dim)" }}>{r.improvement}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: "var(--space-8)", color: "var(--color-text-dim)", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)" }}>
        Evaluation table will be populated by <code style={{ color: "var(--color-accent)" }}>scripts/eval_baseline.py</code> during milestone T18.
      </p>
    </main>
  );
}
