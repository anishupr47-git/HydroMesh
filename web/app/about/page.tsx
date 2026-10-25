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
          maxWidth: "620px",
          lineHeight: 1.8,
          fontSize: "var(--text-base)",
          marginBottom: "var(--space-6)",
        }}
      >
        In the high mountains of Nepal, fast Himalayan rivers carry millions of tons of sharp, tiny quartz sand. 
        When this sandy water rushes through a hydropower plant, it scratches and cuts the metal water wheels (turbines) 
        just like sandpaper.
      </p>
      <p
        style={{
          color: "var(--color-text-secondary)",
          maxWidth: "620px",
          lineHeight: 1.8,
          fontSize: "var(--text-base)",
          marginBottom: "var(--space-6)",
        }}
      >
        <strong>HydroMesh is our smart river guardian.</strong> It watches mountain rain, counts floating sand in the water, 
        and warns operators 12–24 hours ahead of big muddy floods. This gives plant crews time to clean out sand basins and 
        protect clean energy equipment that lights up homes across Nepal!
      </p>

      <div style={{ marginTop: "var(--space-6)" }}>
        <a
          href="https://drive.google.com/file/d/1ianVC1C0tzzN8EGa4G-siXM_L9pzpi8s/view?usp=drive_link"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "var(--color-accent)",
            color: "#0B1424",
            padding: "10px 20px",
            borderRadius: "4px",
            textDecoration: "none",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: "var(--text-sm)",
          }}
        >
          Watch Video Demonstration ↗
        </a>
      </div>
    </main>
  );
}
