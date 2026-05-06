import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        padding: 32,
        color: "#e5e7eb",
        background: "#030712",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Waku Render</h1>
      <p style={{ color: "#9ca3af", maxWidth: 640 }}>
        URL-as-API image template service. Hit{" "}
        <code style={{ background: "#0b0f1a", padding: "2px 6px", borderRadius: 4 }}>
          /r/[slug]/[version]?param=...
        </code>{" "}
        and get a PNG.
      </p>
      <p style={{ marginTop: 24 }}>
        <Link href="/templates" style={{ color: "#22d3ee" }}>
          Browse templates →
        </Link>
      </p>
    </main>
  );
}
