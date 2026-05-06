import Link from "next/link";
import { listTemplates } from "@/templates";

const cardStyle: React.CSSProperties = {
  display: "block",
  padding: 20,
  borderRadius: 12,
  border: "1px solid #1f2937",
  background: "#0b0f1a",
  color: "#e5e7eb",
  textDecoration: "none",
};

export default function TemplatesIndex() {
  const templates = listTemplates();
  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: 32, color: "#e5e7eb", background: "#030712", minHeight: "100vh" }}>
      <h1 style={{ marginTop: 0 }}>Templates</h1>
      <p style={{ color: "#9ca3af" }}>
        Each template renders to a 1200×630 PNG. Click one to play with its params.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginTop: 24 }}>
        {templates.map((t) => (
          <Link key={`${t.slug}-${t.version}`} href={`/templates/${t.slug}`} style={cardStyle}>
            <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, color: "#9ca3af" }}>
              {t.slug}@{t.version}
            </div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 600 }}>{t.slug}</div>
            <div style={{ marginTop: 4, color: "#9ca3af", fontSize: 14 }}>
              {Object.keys(t.params).length} params
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
