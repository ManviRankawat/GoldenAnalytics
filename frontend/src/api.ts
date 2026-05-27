import type { DashboardData, FilterOptions, FilterState, MonthBreakdown, ChangesData } from "./types";

const BASE = "/api";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function fetchFilters(): Promise<FilterOptions> {
  return get<FilterOptions>(`${BASE}/filters`);
}

export async function fetchDashboard(
  filters: FilterState,
  page: number,
  pageSize: number,
  sortCol: string,
  sortDir: string
): Promise<DashboardData> {
  const params = new URLSearchParams();

  if (filters.fy)          params.set("fy",          filters.fy);
  if (filters.agency)      params.set("agency",      filters.agency);
  if (filters.category)    params.set("category",    filters.category);
  if (filters.subCategory) params.set("subCategory", filters.subCategory);
  if (filters.vendor)      params.set("vendor",      filters.vendor);

  params.set("page",     String(page));
  params.set("pageSize", String(pageSize));
  params.set("sortCol",  sortCol);
  params.set("sortDir",  sortDir);

  return get<DashboardData>(`${BASE}/dashboard?${params.toString()}`);
}

export async function fetchChanges(filters: FilterState): Promise<ChangesData> {
  const params = new URLSearchParams();
  if (filters.agency)      params.set("agency",      filters.agency);
  if (filters.category)    params.set("category",    filters.category);
  if (filters.subCategory) params.set("subCategory", filters.subCategory);
  if (filters.vendor)      params.set("vendor",      filters.vendor);
  const qs = params.toString();
  return get<ChangesData>(`${BASE}/changes${qs ? `?${qs}` : ""}`);
}

export async function fetchMonthBreakdown(
  fMonth: number,
  filters: FilterState
): Promise<MonthBreakdown> {
  const params = new URLSearchParams();
  params.set("fMonth", String(fMonth));
  if (filters.fy)          params.set("fy",          filters.fy);
  if (filters.agency)      params.set("agency",      filters.agency);
  if (filters.category)    params.set("category",    filters.category);
  if (filters.subCategory) params.set("subCategory", filters.subCategory);
  if (filters.vendor)      params.set("vendor",      filters.vendor);
  return get<MonthBreakdown>(`${BASE}/month-breakdown?${params.toString()}`);
}

export async function askAI(question: string, filters: FilterState): Promise<string> {
  const res = await fetch(`${BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, filters }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `API error ${res.status}`);
  return body.answer as string;
}
