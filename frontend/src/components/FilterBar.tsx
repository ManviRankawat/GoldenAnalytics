import type { FilterOptions, FilterState } from "../types";

const s: React.CSSProperties = {
  border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 8px",
  fontSize: 12, background: "#fff", color: "#111", cursor: "pointer", outline: "none",
};

interface Props {
  options: FilterOptions | null;
  filters: FilterState;
  totalCount: number;
  loading: boolean;
  onChange: (key: keyof FilterState, value: string) => void;
  onClear: () => void;
}

export function FilterBar({ options, filters, totalCount, loading, onChange, onClear }: Props) {
  const subCatOptions = options
    ? options.subCategories
        .filter((s) => !filters.category || s.category === filters.category)
        .map((s) => s.subCategory)
    : [];

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 14px", marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.6px" }}>Filters</span>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Fiscal Year</label>
        <select style={s} value={filters.fy} onChange={(e) => onChange("fy", e.target.value)} disabled={!options}>
          <option value="">All</option>
          {options?.fys.map((y) => <option key={y} value={String(y)}>FY {y}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Agency</label>
        <select style={{ ...s, maxWidth: 180 }} value={filters.agency} onChange={(e) => onChange("agency", e.target.value)} disabled={!options}>
          <option value="">All</option>
          {options?.agencies.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Category</label>
        <select style={{ ...s, maxWidth: 180 }} value={filters.category} onChange={(e) => onChange("category", e.target.value)} disabled={!options}>
          <option value="">All</option>
          {options?.categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>SubCategory</label>
        <select style={{ ...s, maxWidth: 180 }} value={filters.subCategory} onChange={(e) => onChange("subCategory", e.target.value)} disabled={!options || !subCatOptions.length}>
          <option value="">All</option>
          {subCatOptions.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Vendor</label>
        <select style={{ ...s, maxWidth: 200 }} value={filters.vendor} onChange={(e) => onChange("vendor", e.target.value)} disabled={!options}>
          <option value="">All</option>
          {options?.vendors.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

      <button onClick={onClear} style={{ ...s, background: "#f1f5f9", borderColor: "#cbd5e1", fontSize: 11, fontWeight: 500 }}>
        Clear All
      </button>

      <span style={{ marginLeft: "auto", fontSize: 11, color: loading ? "#60a5fa" : "#9ca3af" }}>
        {loading ? "Loading…" : `${totalCount.toLocaleString()} records`}
      </span>
    </div>
  );
}
