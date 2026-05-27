import type { DashboardSummary } from "../types";
import { fmt } from "../utils";

interface Props {
  summary: DashboardSummary | null;
}

const CARDS = [
  { key: "totalAmount" as const,   label: "Total Payments",  format: (v: number) => fmt(v) },
  { key: "totalCount" as const,    label: "Transactions",    format: (v: number) => v.toLocaleString() },
  { key: "uniqueVendors" as const, label: "Unique Vendors",  format: (v: number) => v.toLocaleString() },
  { key: "avgAmount" as const,     label: "Avg. Payment",    format: (v: number) => fmt(v) },
];

export function Scorecards({ summary }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
      {CARDS.map(({ key, label, format }) => (
        <div key={key} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "12px 16px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 5px" }}>
            {label}
          </p>
          <p style={{ fontSize: 19, fontWeight: 700, margin: 0, color: "#0f172a", letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" }}>
            {summary ? format(summary[key]) : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
