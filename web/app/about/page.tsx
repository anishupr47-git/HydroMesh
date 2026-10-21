import Link from "next/link";

export default function AboutPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-ui)",
        padding: "var(--space-8)",
      }}
    >
      <Link
        href="/"
        style={{
          color: "var(--color-accent)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-sm)",
          textDecoration: "none",
        }}
      >
        ← HydroMesh
      </Link>
      <h1
        style={{
          fontSize: "var(--text-3xl)",
          fontWeight: 700,
          marginTop: "var(--space-6)",
          marginBottom: "var(--space-4)",
        }}
      >
        About HydroMesh
      </h1>
      <p
        style={{
          color: "var(--color-text-secondary)",
          maxWidth: "560px",
          lineHeight: 1.7,
        }}
      >
        Self-hosted spatio-temporal deep-learning platform for Himalayan run-of-river
        hydropower plants. Forecasting sediment and discharge to protect infrastructure
        and optimize operations.
      </p>
    </main>
  );
}
