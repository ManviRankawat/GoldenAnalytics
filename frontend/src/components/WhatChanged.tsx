import type { ChangesData, DimChange } from "../types";
import { fmtAxis, fmtPct, TREND_COLORS } from "../utils";

interface Props {
  data: ChangesData | null;
  loading: boolean;
}

interface CardSpec {
  label: string;
  icon: string;
  accent: string;
  bg: string;
  entry: DimChange | null;
  valueFmt: (e: DimChange) => string;
}

const containerStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  padding: "14px 16px",
  marginBottom: 8,
};

const headerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#6b7280",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  margin: "0 0 10px",
};

function Card({ spec }: { spec: CardSpec }) {
  const { entry, label, icon, accent, bg, valueFmt } = spec;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${accent}33`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
        padding: "10px 12px",
        minHeight: 78,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569", fontWeight: 500 }}>
        <span style={{ color: accent, fontSize: 13, lineHeight: 1 }}>{icon}</span>
        {label}
      </div>
      {entry ? (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={entry.label}>
            {entry.label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
            {valueFmt(entry)}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>—</div>
      )}
    </div>
  );
}

export function WhatChanged({ data, loading }: Props) {
  const specs: CardSpec[] = [
    {
      label: "Top increase YoY",
      icon: "↑",
      accent: TREND_COLORS.up,
      bg: "#fef2f2",
      entry: data?.highlights.topIncrease ?? null,
      valueFmt: (e) => fmtPct(e.pctChange),
    },
    {
      label: "Largest vendor drop",
      icon: "↓",
      accent: TREND_COLORS.down,
      bg: "#f0fdf4",
      entry: data?.highlights.largestDrop ?? null,
      valueFmt: (e) => fmtPct(e.pctChange),
    },
    {
      label: "New high-spend category",
      icon: "★",
      accent: TREND_COLORS.stable,
      bg: "#eff6ff",
      entry: data?.highlights.newCategory ?? null,
      valueFmt: (e) => fmtAxis(e.fy23),
    },
  ];

  return (
    <div style={containerStyle}>
      <p style={headerStyle}>What changed (FY 2022 → FY 2023)</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {loading && !data
          ? specs.map((_, i) => (
              <div key={i} style={{ height: 78, background: "#f9fafb", border: "1px solid #f1f5f9", borderRadius: 6 }} />
            ))
          : specs.map((s) => <Card key={s.label} spec={s} />)}
      </div>
    </div>
  );
}
