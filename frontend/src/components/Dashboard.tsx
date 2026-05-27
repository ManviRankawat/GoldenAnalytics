import { useState, useEffect, useCallback } from "react";
import type { FilterOptions, FilterState, DashboardData, ChangesData } from "../types";
import { fetchFilters, fetchDashboard, fetchChanges } from "../api";
import { FilterBar } from "./FilterBar";
import { Scorecards } from "./Scorecards";
import { Charts } from "./Charts";
import { DataTable } from "./DataTable";
import { AskAI } from "./AskAI";
import { WhatChanged } from "./WhatChanged";

const EMPTY_FILTERS: FilterState = {
  fy: "", agency: "", category: "", subCategory: "", vendor: "",
};

const EMPTY_DASH: DashboardData = {
  summary:    { totalAmount: 0, totalCount: 0, uniqueVendors: 0, avgAmount: 0 },
  byCategory: [],
  byMonth:    [],
  topVendors: [],
  byAgency:   [],
  records:    [],
  pagination: { page: 1, pageSize: 15, totalCount: 0, totalPages: 0 },
};

export function Dashboard() {
  const [filterOpts, setFilterOpts] = useState<FilterOptions | null>(null);
  const [filters, setFilters]       = useState<FilterState>(EMPTY_FILTERS);
  const [data, setData]             = useState<DashboardData>(EMPTY_DASH);
  const [page, setPage]             = useState(1);
  const [sortCol, setSortCol]       = useState("amount");
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("desc");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [changes, setChanges]       = useState<ChangesData | null>(null);
  const [changesLoading, setChangesLoading] = useState(false);

  // Load filter options once
  useEffect(() => {
    fetchFilters()
      .then(setFilterOpts)
      .catch((e) => setError(String(e)));
  }, []);

  // Reload dashboard whenever filters / page / sort change
  const load = useCallback(() => {
    setLoading(true);
    fetchDashboard(filters, page, 15, sortCol, sortDir)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [filters, page, sortCol, sortDir]);

  useEffect(() => { load(); }, [load]);

  // YoY changes depend only on filters (not pagination/sort)
  useEffect(() => {
    setChangesLoading(true);
    fetchChanges(filters)
      .then(setChanges)
      .catch(() => setChanges(null))
      .finally(() => setChangesLoading(false));
  }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      // Reset subCategory when category changes
      ...(key === "category" ? { subCategory: "" } : {}),
    }));
    setPage(1);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
    setPage(1);
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setSortCol("amount");
    setSortDir("desc");
  };

  return (
    <div style={{ padding: 14, minHeight: "100vh", color: "#111" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: "-0.3px", color: "#0f172a" }}>
          Vendor Payments Dashboard
        </h1>
        <span style={{ fontSize: 12, color: "#6b7280" }}>FY 2022 – FY 2023</span>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", marginBottom: 10, fontSize: 12, color: "#dc2626" }}>
          {error}
        </div>
      )}

      <FilterBar
        options={filterOpts}
        filters={filters}
        totalCount={data.pagination.totalCount}
        loading={loading}
        onChange={handleFilterChange}
        onClear={handleClear}
      />

      <Scorecards summary={data.summary} />

      <WhatChanged data={changes} loading={changesLoading} />

      <Charts
        byCategory={data.byCategory}
        byMonth={data.byMonth}
        topVendors={data.topVendors}
        byAgency={data.byAgency}
        filters={filters}
        changes={changes}
      />

      <AskAI filters={filters} />

      <DataTable
        records={data.records}
        pagination={data.pagination}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        onPage={setPage}
      />
    </div>
  );
}
