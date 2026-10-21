const rules = [
  { id: "R1",  check: "Confidence Floor",      condition: "confidence < 0.80",                              outcome: "needs_human" },
  { id: "R2",  check: "Entity Resolution",     condition: "Unknown gate / basin / feeder ID",               outcome: "rejected" },
  { id: "R3",  check: "Flow Shock Clamp",      condition: "Reduction > 50% of current flow",                outcome: "clamp + note" },
  { id: "R4",  check: "Baseload Floor",        condition: "Target flow < 20% of design flow",               outcome: "clamp up + note" },
  { id: "R5",  check: "Structural Capacity",   condition: "Target flow > design flow",                      outcome: "rejected" },
  { id: "R6",  check: "Flush Window",          condition: "Duration outside [5, 90] minutes",               outcome: "rejected" },
  { id: "R7",  check: "Desander Cooldown",     condition: "Last flush < 60 min ago or flushing now",        outcome: "rejected" },
  { id: "R8",  check: "Action Throttle",       condition: "≥ 3 actions in last 10 minutes",                 outcome: "rejected" },
  { id: "R9",  check: "Generation Ceiling",    condition: "MW target > available capacity",                 outcome: "rejected" },
  { id: "R10", check: "Feeder Priority",       condition: "Critical feeders not first in dispatch list",    outcome: "rejected" },
  { id: "R11", check: "Null Action Check",     condition: "Action list is empty",                           outcome: "needs_human" },
];

const outcomeColor = (o: string) =>
  o === "rejected" ? "var(--color-red)" : o === "needs_human" ? "var(--color-yellow)" : "var(--color-green)";

export default function SafetyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg)", color: "var(--color-text-primary)", fontFamily: "var(--font-ui)", padding: "var(--space-8)" }}>
      <a href="/" style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", textDecoration: "none" }}>← HydroMesh</a>

      <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 700, marginTop: "var(--space-6)", marginBottom: "var(--space-2)" }}>
        Safety Policy — R1–R11
      </h1>
      <p style={{ color: "var(--color-text-secondary)", maxWidth: "560px", lineHeight: 1.7, marginBottom: "var(--space-8)" }}>
        The safety validator is <strong style={{ color: "var(--color-highlight)" }}>pure, deterministic, and performs zero I/O</strong>. Any rejected rule fails the entire decision. The system never auto-actuates hardware.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              {["Rule", "Check", "Condition", "Outcome"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", color: "var(--color-text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "var(--text-xs)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border)", background: i % 2 === 0 ? "transparent" : "var(--color-surface)" }}>
                <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-accent)", fontWeight: 700 }}>{r.id}</td>
                <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-primary)" }}>{r.check}</td>
                <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-secondary)" }}>{r.condition}</td>
                <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                  <span style={{ color: outcomeColor(r.outcome), fontWeight: 600 }}>{r.outcome}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "var(--space-12)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderLeft: "4px solid var(--color-red)", borderRadius: "0 8px 8px 0", padding: "var(--space-6)", maxWidth: "640px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: "var(--space-2)", color: "var(--color-red)" }}>CORE INVARIANT: Fail Closed</div>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", lineHeight: 1.7, margin: 0 }}>
          If ANY action receives <code style={{ color: "var(--color-red)" }}>rejected</code>, the entire SafetyVerdict is rejected. HydroMesh will NEVER bypass or relax this validator, regardless of LLM confidence scores.
        </p>
      </div>
    </main>
  );
}
