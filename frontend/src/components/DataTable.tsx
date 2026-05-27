import type { PaymentRecord, Pagination } from "../types";
import { fmt } from "../utils";

interface Props {
  records: PaymentRecord[];
  pagination: Pagination | null;
  sortCol: string;
  sortDir: string;
  onSort: (col: string) => void;
  onPage: (page: number) => void;
}

const COLS: { key: string; label: string; align?: "right" | "center"; width?: number }[] = [
  { key: "bien",         label: "Bien",         width: 80 },
  { key: "fy",           label: "FY",           width: 52, align: "center" },
  { key: "fMonth",       label: "Mo.",          width: 44, align: "center" },
  { key: "agy",          label: "Agy",          width: 48 },
  { key: "agency",       label: "Agency",       width: 150 },
  { key: "object",       label: "Obj",          width: 40, align: "center" },
  { key: "category",     label: "Category",     width: 160 },
  { key: "subobj",       label: "SubObj",       width: 60, align: "center" },
  { key: "subCategory",  label: "SubCategory",  width: 160 },
  { key: "vendor",       label: "Vendor" },
  { key: "amount",       label: "Amount",       width: 120, align: "right" },
];

const btnStyle = (active: boolean): React.CSSProperties => ({
  border: "1px solid", borderRadius: 4, padding: "3px 9px", fontSize: 11, cursor: "pointer",
  background: active ? "#1e3a5f" : "#fff",
  color: active ? "#fff" : "#111",
  borderColor: active ? "#1e3a5f" : "#d1d5db",
});

export function DataTable({ records, pagination, sortCol, sortDir, onSort, onPage }: Props) {
  const totalPages = pagination?.totalPages ?? 1;
  const page = pagination?.page ?? 1;

  const pageNums = () => {
    const nums: number[] = [];
    const start = Math.max(1, Math.min(totalPages - 6, page - 3));
    for (let i = 0; i < Math.min(7, totalPages); i++) {
      if (start + i <= totalPages) nums.push(start + i);
    }
    return nums;
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: 0 }}>Transaction Detail</p>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>
          {pagination
            ? `${((page - 1) * pagination.pageSize + 1).toLocaleString()}–${Math.min(page * pagination.pageSize, pagination.totalCount).toLocaleString()} of ${pagination.totalCount.toLocaleString()}`
            : ""}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, tableLayout: "fixed", minWidth: 1000 }}>
          <colgroup>
            {COLS.map((c) => <col key={c.key} style={{ width: c.width ?? "auto" }} />)}
          </colgroup>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => onSort(c.key)}
                  style={{
                    textAlign: c.align ?? "left",
                    padding: "7px 10px",
                    fontWeight: 600,
                    color: "#374151",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    userSelect: "none",
                    background: sortCol === c.key ? "#f0f4f8" : "#f8fafc",
                    borderBottom: "2px solid #e5e7eb",
                  }}
                >
                  {c.label}{sortCol === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} style={{ textAlign: "center", padding: 24, color: "#9ca3af", fontSize: 12 }}>
                  No records match the current filters.
                </td>
              </tr>
            ) : records.map((row, i) => (
              <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "5px 10px", color: "#374151" }}>{row.bien}</td>
                <td style={{ padding: "5px 10px", textAlign: "center", color: "#374151" }}>{row.fy}</td>
                <td style={{ padding: "5px 10px", textAlign: "center", color: "#6b7280" }}>{row.f_month}</td>
                <td style={{ padding: "5px 10px", color: "#6b7280" }}>{row.agy}</td>
                <td style={{ padding: "5px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.agency}</td>
                <td style={{ padding: "5px 10px", textAlign: "center", color: "#6b7280" }}>{row.object}</td>
                <td style={{ padding: "5px 10px", overflow: "hidden", textOverflow: "ellipsis" }}>{row.category}</td>
                <td style={{ padding: "5px 10px", textAlign: "center", color: "#6b7280" }}>{row.subobj}</td>
                <td style={{ padding: "5px 10px", overflow: "hidden", textOverflow: "ellipsis" }}>{row.sub_category}</td>
                <td style={{ padding: "5px 10px", overflow: "hidden", textOverflow: "ellipsis" }}>{row.vendor}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: row.amount < 0 ? "#dc2626" : "#0f172a" }}>
                  {fmt(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 3, justifyContent: "flex-end", marginTop: 10, alignItems: "center" }}>
          <button onClick={() => onPage(1)}              disabled={page === 1}          style={btnStyle(false)}>«</button>
          <button onClick={() => onPage(page - 1)}       disabled={page === 1}          style={btnStyle(false)}>‹</button>
          {pageNums().map((p) => (
            <button key={p} onClick={() => onPage(p)} style={btnStyle(p === page)}>{p}</button>
          ))}
          <button onClick={() => onPage(page + 1)}       disabled={page === totalPages} style={btnStyle(false)}>›</button>
          <button onClick={() => onPage(totalPages)}     disabled={page === totalPages} style={btnStyle(false)}>»</button>
        </div>
      )}
    </div>
  );
}
