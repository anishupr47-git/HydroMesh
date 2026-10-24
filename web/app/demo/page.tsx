import Link from "next/link";

export default function DemoPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--color-bg)", color: "var(--color-text-primary)", fontFamily: "var(--font-ui)", padding: "var(--space-8)" }}>
      <Link href="/" style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", textDecoration: "none" }}>← HydroMesh</Link>
      <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 700, marginTop: "var(--space-6)", marginBottom: "var(--space-4)" }}>
        Live Plant Dashboard
      </h1>
      <p style={{ color: "var(--color-text-secondary)", maxWidth: "600px", lineHeight: 1.7, marginBottom: "var(--space-8)" }}>
        Watch HydroMesh protect the river plant in real time. The AI helper spots muddy water, checks with the strict safety guard, and asks human operators before opening any gate!
      </p>

      {/* Placeholder panels */}
      {[
        { title: "Robot Helper Activity Log", desc: "Live step-by-step diary of what the AI helpers see, what they suggest, and how the safety guard checks each idea." },
        { title: "Live Plant Dials", desc: "Real-time meters showing river water speed, floating sand count, and scratches on the spinning water wheels." },
        { title: "River Mud Forecast Graph", desc: "A 24-hour lookahead graph showing upcoming rain and when big waves of sand will reach the plant." },
        { title: "Operator Action Cards", desc: "Simple action cards where human plant operators can review suggestions, press approve, or cancel anytime." },
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
