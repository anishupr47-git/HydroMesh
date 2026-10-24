import Link from "next/link";

const rules = [
  { id: "R1",  check: "Confidence Floor",      simple: "Is the AI sure? If unsure, ring alarm and ask a human!", condition: "confidence < 0.80",                              outcome: "needs_human" },
  { id: "R2",  check: "Entity Resolution",     simple: "Real gates only! Refuse non-existent gates or basins.", condition: "Unknown gate / basin / feeder ID",               outcome: "rejected" },
  { id: "R3",  check: "Flow Shock Clamp",      simple: "No water slams! Never cut water > 50% at once (pipes burst).", condition: "Reduction > 50% of current flow",                outcome: "clamp + note" },
  { id: "R4",  check: "Baseload Floor",        simple: "Keep river alive! Keep at least 20% flow for fish and river.", condition: "Target flow < 20% of design flow",               outcome: "clamp up + note" },
  { id: "R5",  check: "Structural Capacity",   simple: "Don't burst pipes! Never exceed maximum gate capacity.", condition: "Target flow > design flow",                      outcome: "rejected" },
  { id: "R6",  check: "Flush Window",          simple: "Sand cleaning timer: Sand flushing takes 5 to 90 mins.", condition: "Duration outside [5, 90] minutes",               outcome: "rejected" },
  { id: "R7",  check: "Desander Cooldown",     simple: "Let sand trap rest: Wait 1 hour between flush cycles.", condition: "Last flush < 60 min ago or flushing now",        outcome: "rejected" },
  { id: "R8",  check: "Action Throttle",       simple: "Don't rush buttons! Max 3 actions in 10 mins (save motors).", condition: "≥ 3 actions in last 10 minutes",                 outcome: "rejected" },
  { id: "R9",  check: "Generation Ceiling",    simple: "No pretend power! Never promise more megawatts than river makes.", condition: "MW target > available capacity",                 outcome: "rejected" },
  { id: "R10", check: "Feeder Priority",       simple: "Hospitals & water pumps first! Critical lines lead dispatch.", condition: "Critical feeders not first in dispatch list",    outcome: "rejected" },
  { id: "R11", check: "Null Action Check",     simple: "No blank papers! If AI has zero actions, ask a human.", condition: "Action list is empty",                           outcome: "needs_human" },
];

const outcomeColor = (o: string) =>
  o === "rejected" ? "var(--color-red)" : o === "needs_human" ? "var(--color-yellow)" : "var(--color-green)";

export default function SafetyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg)", color: "var(--color-text-primary)", fontFamily: "var(--font-ui)", padding: "var(--space-8)" }}>
      <Link href="/" style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", textDecoration: "none" }}>← HydroMesh</Link>

      <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 700, marginTop: "var(--space-6)", marginBottom: "var(--space-2)" }}>
        Plant Safety Guardbook — Rules R1–R11
      </h1>
      <p style={{ color: "var(--color-text-secondary)", maxWidth: "640px", lineHeight: 1.7, marginBottom: "var(--space-8)" }}>
        This is our <strong>digital guard dog</strong>. The AI helper can only make suggestions. 
        Before any water gate moves, every single idea is checked by these 11 strict safety rules. 
        If even one rule says NO, the whole command is stopped. <strong>Human operators always stay in control!</strong>
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              {["Rule", "Check", "What It Means In Plain Words", "Safety Condition", "Decision"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", color: "var(--color-text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "var(--text-xs)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border)", background: i % 2 === 0 ? "transparent" : "var(--color-surface)" }}>
                <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-accent)", fontWeight: 700 }}>{r.id}</td>
                <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-primary)", fontWeight: 600 }}>{r.check}</td>
                <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-highlight)" }}>{r.simple}</td>
                <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-secondary)" }}>{r.condition}</td>
                <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                  <span style={{ color: outcomeColor(r.outcome), fontWeight: 600 }}>{r.outcome}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "var(--space-12)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderLeft: "4px solid var(--color-red)", borderRadius: "0 8px 8px 0", padding: "var(--space-6)", maxWidth: "680px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: "var(--space-2)", color: "var(--color-red)" }}>NUMBER ONE RULE: Fail Closed (Always Safe)</div>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)", lineHeight: 1.7, margin: 0 }}>
          If there is any doubt, confusion, or a rule says <code style={{ color: "var(--color-red)" }}>rejected</code>, the plant stops the action and asks a real human. The AI can never force its way past this rulebook!
        </p>
      </div>
    </main>
  );
}
