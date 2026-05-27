export const fmt = (n: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(n);

export const fmtAxis = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
};

export const PALETTE = [
  "#1e3a5f","#2563a8","#3b82c4","#60a5d8","#93c5e8","#bdddf4",
  "#0f5132","#198754","#20c997",
];

// Trend color codes — used everywhere YoY change is visualized.
export const TREND_COLORS = {
  up:     "#dc2626", // overspending → red
  stable: "#2563eb", // stable → blue
  down:   "#16a34a", // reduced → green
  neutral:"#9ca3af", // no comparable baseline → gray
};

export function trendColor(pctChange: number | null, isNew: boolean): string {
  if (pctChange == null) return isNew ? TREND_COLORS.stable : TREND_COLORS.neutral;
  if (pctChange >  10) return TREND_COLORS.up;
  if (pctChange < -10) return TREND_COLORS.down;
  return TREND_COLORS.stable;
}

export const fmtPct = (n: number | null): string => {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(0)}%`;
};
