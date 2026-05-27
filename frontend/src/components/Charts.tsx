import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";
import type { CategoryData, MonthData, VendorData, AgencyData, FilterState, MonthBreakdown, ChangesData } from "../types";
import { fmt, fmtAxis, fmtPct, PALETTE, TREND_COLORS, trendColor } from "../utils";
import { fetchMonthBreakdown } from "../api";

const card: React.CSSProperties = {
  background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "14px 16px",
};
const title: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 10px",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, padding: "8px 12px", fontSize: 11 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#374151", maxWidth: 220 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ margin: "2px 0", color: "#111" }}>
          {p.name !== "total" ? `${p.name}: ` : ""}{fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

const MONTH_NAMES = ["","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];

const TrendLegend = () => (
  <div style={{ display: "flex", gap: 10, fontSize: 10, color: "#6b7280" }}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: TREND_COLORS.up }} />Over
    </span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: TREND_COLORS.stable }} />Stable
    </span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: TREND_COLORS.down }} />Reduced
    </span>
  </div>
);

const TrendTooltip = ({ active, payload, label, changeMap }: any) => {
  if (!active || !payload?.length) return null;
  const change = changeMap?.get(label);
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, padding: "8px 12px", fontSize: 11, maxWidth: 240 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#374151" }}>{label}</p>
      <p style={{ margin: "2px 0", color: "#111" }}>{fmt(payload[0].value)}</p>
      {change && (
        <p style={{ margin: "4px 0 0", color: trendColor(change.pctChange, change.isNew), fontSize: 11, fontWeight: 600 }}>
          YoY: {change.pctChange == null ? (change.isNew ? "new" : "—") : fmtPct(change.pctChange)}
          {change.fy22 > 0 && change.pctChange != null && (
            <span style={{ color: "#6b7280", fontWeight: 400 }}> ({fmtAxis(change.fy22)} → {fmtAxis(change.fy23)})</span>
          )}
        </p>
      )}
    </div>
  );
};

const renderPieSlicePercent = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (percent < 0.04) return null;
  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

interface Props {
  byCategory: CategoryData[];
  byMonth: MonthData[];
  topVendors: VendorData[];
  byAgency: AgencyData[];
  filters: FilterState;
  changes: ChangesData | null;
}

type BreakdownTab = "category" | "agency" | "vendor";

export function Charts({ byCategory, byMonth, topVendors, byAgency, filters, changes }: Props) {
  const agencyChangeMap = new Map(changes?.agencies.map((a) => [a.label, a]) ?? []);
  const vendorChangeMap = new Map(changes?.vendors.map((v) => [v.label, v]) ?? []);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<MonthBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>("category");

  useEffect(() => { setSelectedMonth(null); setBreakdown(null); }, [filters]);

  useEffect(() => {
    if (selectedMonth == null) { setBreakdown(null); return; }
    setBreakdownLoading(true);
    fetchMonthBreakdown(selectedMonth, filters)
      .then(setBreakdown)
      .catch(() => setBreakdown(null))
      .finally(() => setBreakdownLoading(false));
  }, [selectedMonth, filters]);

  const handleChartClick = (e: any) => {
    const label = e?.activeLabel;
    if (!label) return;
    const monthIdx = MONTH_NAMES.indexOf(label);
    if (monthIdx > 0) setSelectedMonth(monthIdx === selectedMonth ? null : monthIdx);
  };

  // Build monthly trend — two series (FY22, FY23) across months 1–12
  const monthMap: Record<number, { month: number; FY2022?: number; FY2023?: number }> = {};
  for (let m = 1; m <= 12; m++) monthMap[m] = { month: m };
  byMonth.forEach(({ fy, fMonth, total }) => {
    const key = `FY${fy}` as "FY2022" | "FY2023";
    if (monthMap[fMonth]) monthMap[fMonth][key] = (monthMap[fMonth][key] ?? 0) + total;
  });
  const monthlyData = Object.values(monthMap).map((r) => ({
    ...r, label: MONTH_NAMES[r.month] ?? `M${r.month}`,
  }));

  const hasFY22 = byMonth.some((d) => d.fy === 2022);
  const hasFY23 = byMonth.some((d) => d.fy === 2023);

  // Top 15 agencies for chart
  const agencyData = byAgency.slice(0, 15).map((d) => ({
    agency: d.agency.replace("Department of ", "Dept. ").replace("Department ", "Dept. "),
    total: d.total,
  }));

  return (
    <>
      {/* Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>

        {/* Monthly Trend */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
            <p style={{ ...title, margin: 0 }}>Monthly Spend Trend</p>
            <span style={{ fontSize: 10, color: "#9ca3af" }}>Click a month to drill in</span>
          </div>
          <div style={{ display: "flex", gap: 14, margin: "6px 0 8px" }}>
            {hasFY22 && <span style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 2, background: "#1e3a5f", display: "inline-block" }}></span>FY 2022</span>}
            {hasFY23 && <span style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 2, background: "#60a5d8", display: "inline-block", borderTop: "2px dashed #60a5d8" }}></span>FY 2023</span>}
          </div>
          <ResponsiveContainer width="100%" height={195}>
            <LineChart data={monthlyData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} onClick={handleChartClick} style={{ cursor: "pointer" }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={fmtAxis} width={60} />
              <Tooltip content={<CustomTooltip />} />
              {hasFY22 && <Line type="monotone" dataKey="FY2022" name="FY 2022" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 2.5, fill: "#1e3a5f" }} activeDot={{ r: 5, cursor: "pointer" }} />}
              {hasFY23 && <Line type="monotone" dataKey="FY2023" name="FY 2023" stroke="#60a5d8" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2.5, fill: "#60a5d8" }} activeDot={{ r: 5, cursor: "pointer" }} />}
            </LineChart>
          </ResponsiveContainer>

          {selectedMonth != null && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>
                  {MONTH_NAMES[selectedMonth]}
                  {breakdown && breakdown.byFY.length > 0 && (
                    <span style={{ marginLeft: 8, fontWeight: 400, color: "#6b7280" }}>
                      {breakdown.byFY.map((r) => `FY${r.fy}: ${fmtAxis(r.total)}`).join("  •  ")}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setSelectedMonth(null)}
                  style={{ background: "transparent", border: "none", color: "#6b7280", fontSize: 11, cursor: "pointer", padding: 0 }}
                >
                  × clear
                </button>
              </div>

              <div style={{ display: "flex", gap: 4, marginBottom: 8, borderBottom: "1px solid #e5e7eb" }}>
                {(["category", "agency", "vendor"] as BreakdownTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBreakdownTab(t)}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: `2px solid ${breakdownTab === t ? "#1e3a5f" : "transparent"}`,
                      color: breakdownTab === t ? "#0f172a" : "#6b7280",
                      fontSize: 11,
                      fontWeight: breakdownTab === t ? 600 : 500,
                      padding: "4px 8px",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {t === "category" ? "Categories" : t === "agency" ? "Agencies" : "Vendors"}
                  </button>
                ))}
              </div>

              {breakdownLoading ? (
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Loading…</p>
              ) : breakdown ? (() => {
                const rows: { label: string; total: number }[] =
                  breakdownTab === "category" ? breakdown.byCategory.map((r) => ({ label: r.category, total: r.total })) :
                  breakdownTab === "agency"   ? breakdown.byAgency.map((r) => ({ label: r.agency, total: r.total })) :
                                                breakdown.byVendor.map((r) => ({ label: r.vendor, total: r.total }));
                if (rows.length === 0) return <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>No data for this month.</p>;
                const max = rows[0].total;
                return (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 11, maxHeight: 180, overflowY: "auto" }}>
                    {rows.map((r, i) => (
                      <li key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0", color: "#374151" }}>
                        <span style={{ flex: "0 0 38%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.label}>{r.label}</span>
                        <span style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
                          <span style={{ display: "block", width: `${(r.total / max) * 100}%`, height: "100%", background: PALETTE[i % PALETTE.length] }} />
                        </span>
                        <span style={{ flex: "0 0 64px", textAlign: "right", color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>{fmtAxis(r.total)}</span>
                      </li>
                    ))}
                  </ul>
                );
              })() : (
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>No data for this month.</p>
              )}
            </div>
          )}
        </div>

        {/* Spend by Category */}
        <div style={{ ...card, display: "flex", flexDirection: "column" }}>
          <p style={title}>Spend by Category</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "center", flex: 1, minHeight: 260 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={260}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius="32%"
                  outerRadius="70%"
                  paddingAngle={1}
                  stroke="#fff"
                  strokeWidth={1}
                  labelLine={false}
                  label={renderPieSlicePercent}
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 11, maxHeight: "100%", overflowY: "auto" }}>
              {byCategory.map((c, i) => (
                <li key={c.category} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", color: "#374151" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.category}>{c.category}</span>
                  <span style={{ color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>{fmtAxis(c.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>

        {/* Top 13 Vendors */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ ...title, margin: 0 }}>Top 13 Vendors by Spend</p>
            <TrendLegend />
          </div>
          <ResponsiveContainer width="100%" height={Math.max(topVendors.length * 32 + 20, 180)}>
            <BarChart data={topVendors} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
              <YAxis
                type="category"
                dataKey="vendor"
                tick={{ fontSize: 10, fill: "#374151" }}
                tickLine={false}
                axisLine={false}
                width={160}
                tickFormatter={(v: string) => v.length > 24 ? v.slice(0, 23) + "…" : v}
              />
              <Tooltip content={<TrendTooltip changeMap={vendorChangeMap} />} />
              <Bar dataKey="total" radius={[0, 3, 3, 0]} barSize={14}>
                {topVendors.map((v, i) => {
                  const c = vendorChangeMap.get(v.vendor);
                  return <Cell key={i} fill={trendColor(c?.pctChange ?? null, c?.isNew ?? false)} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spend by Agency (Top 15) */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ ...title, margin: 0 }}>Spend by Agency (Top 15)</p>
            <TrendLegend />
          </div>
          <ResponsiveContainer width="100%" height={Math.max(agencyData.length * 28 + 20, 180)}>
            <BarChart data={agencyData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
              <YAxis
                type="category"
                dataKey="agency"
                tick={{ fontSize: 10, fill: "#374151" }}
                tickLine={false}
                axisLine={false}
                width={140}
                tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 21) + "…" : v}
              />
              <Tooltip content={<TrendTooltip changeMap={agencyChangeMap} />} />
              <Bar dataKey="total" radius={[0, 3, 3, 0]} barSize={12}>
                {agencyData.map((a, i) => {
                  const c = agencyChangeMap.get(a.agency);
                  return <Cell key={i} fill={trendColor(c?.pctChange ?? null, c?.isNew ?? false)} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
