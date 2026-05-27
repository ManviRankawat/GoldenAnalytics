import { Router, Request, Response } from "express";
import { pool } from "../db";

export const paymentsRouter = Router();

// ─── Filter builder ────────────────────────────────────────────────────────

interface Filters {
  fy?: string;
  agency?: string;
  category?: string;
  subCategory?: string;
  vendor?: string;
}

function buildWhere(f: Filters): { clause: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (f.fy)          { conds.push(`fy = $${i++}`);           params.push(parseInt(f.fy, 10)); }
  if (f.agency)      { conds.push(`agency = $${i++}`);       params.push(f.agency); }
  if (f.category)    { conds.push(`category = $${i++}`);     params.push(f.category); }
  if (f.subCategory) { conds.push(`sub_category = $${i++}`); params.push(f.subCategory); }
  if (f.vendor)      { conds.push(`vendor = $${i++}`);       params.push(f.vendor); }
  return { clause: conds.length ? `WHERE ${conds.join(" AND ")}` : "", params };
}

const SAFE_SORT: Record<string, string> = {
  bien: "bien", fy: "fy", fMonth: "f_month", agy: "agy", agency: "agency",
  object: "object", category: "category", subobj: "subobj", subCategory: "sub_category",
  vendor: "vendor", amount: "amount",
};

// ─── GET /api/filters ─────────────────────────────────────────────────────

paymentsRouter.get("/filters", async (req: Request, res: Response) => {
  try {
    const [fys, agencies, categories, subCats, vendors] = await Promise.all([
      pool.query<{ fy: number }>("SELECT DISTINCT fy FROM vendor_payments ORDER BY fy"),
      pool.query<{ agency: string }>("SELECT DISTINCT agency FROM vendor_payments ORDER BY agency"),
      pool.query<{ category: string }>(
        "SELECT DISTINCT category FROM vendor_payments WHERE category IS NOT NULL AND category <> '' ORDER BY category"
      ),
      pool.query<{ sub_category: string; category: string }>(
        "SELECT DISTINCT sub_category, category FROM vendor_payments WHERE sub_category IS NOT NULL AND sub_category <> '' ORDER BY sub_category"
      ),
      pool.query<{ vendor: string }>(
        "SELECT DISTINCT vendor FROM vendor_payments WHERE vendor <> '' ORDER BY vendor"
      ),
    ]);

    res.json({
      fys:           fys.rows.map((r) => r.fy),
      agencies:      agencies.rows.map((r) => r.agency),
      categories:    categories.rows.map((r) => r.category),
      subCategories: subCats.rows.map((r) => ({ subCategory: r.sub_category, category: r.category })),
      vendors:       vendors.rows.map((r) => r.vendor),
    });
  } catch (err) {
    console.error("/api/filters error:", err);
    res.status(500).json({ error: "Failed to load filters" });
  }
});

// ─── GET /api/dashboard ───────────────────────────────────────────────────

paymentsRouter.get("/dashboard", async (req: Request, res: Response) => {
  const {
    fy, agency, category, subCategory, vendor,
    page = "1", pageSize = "15",
    sortCol = "amount", sortDir = "desc",
  } = req.query as Record<string, string>;

  const { clause, params } = buildWhere(
    Object.fromEntries(
      Object.entries({ fy, agency, category, subCategory, vendor }).filter(([, v]) => v && v !== "All")
    ) as Filters
  );

  const orderBy   = SAFE_SORT[sortCol] ?? "amount";
  const direction = sortDir === "asc" ? "ASC" : "DESC";
  const limit     = Math.min(parseInt(pageSize, 10) || 15, 100);
  const offset    = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  try {
    const [summary, byCat, byMonth, topVendors, byAgency, records, countRow] = await Promise.all([

      pool.query<{ count: string; total: string; avg: string; vendors: string }>(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total,
                COALESCE(AVG(amount),0) AS avg, COUNT(DISTINCT vendor) AS vendors
         FROM vendor_payments ${clause}`,
        params
      ),

      pool.query<{ category: string; total: string }>(
        `SELECT category, SUM(amount) AS total
         FROM vendor_payments ${clause}
         GROUP BY category ORDER BY total DESC`,
        params
      ),

      pool.query<{ fy: number; f_month: number; total: string }>(
        `SELECT fy,
                CASE WHEN f_month <= 12 THEN f_month ELSE f_month - 12 END AS f_month,
                SUM(amount) AS total
         FROM vendor_payments ${clause}
         GROUP BY fy, CASE WHEN f_month <= 12 THEN f_month ELSE f_month - 12 END
         ORDER BY fy ASC, 2 ASC`,
        params
      ),

      pool.query<{ vendor: string; total: string }>(
        `SELECT vendor, SUM(amount) AS total
         FROM vendor_payments ${clause}
         GROUP BY vendor ORDER BY total DESC LIMIT 13`,
        params
      ),

      pool.query<{ agency: string; total: string }>(
        `SELECT agency, SUM(amount) AS total
         FROM vendor_payments ${clause}
         GROUP BY agency ORDER BY total DESC`,
        params
      ),

      pool.query(
        `SELECT id, bien, fy, f_month, agy, agency, object, category,
                subobj, sub_category, vendor, amount
         FROM vendor_payments ${clause}
         ORDER BY ${orderBy} ${direction}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),

      pool.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM vendor_payments ${clause}`,
        params
      ),
    ]);

    const s = summary.rows[0];
    res.json({
      summary: {
        totalAmount:   parseFloat(s.total),
        totalCount:    parseInt(s.count, 10),
        uniqueVendors: parseInt(s.vendors, 10),
        avgAmount:     parseFloat(s.avg),
      },
      byCategory:  byCat.rows.map((r) => ({ category: r.category, total: parseFloat(r.total) })),
      byMonth:     byMonth.rows.map((r) => ({ fy: r.fy, fMonth: r.f_month, total: parseFloat(r.total) })),
      topVendors:  topVendors.rows.map((r) => ({ vendor: r.vendor, total: parseFloat(r.total) })),
      byAgency:    byAgency.rows.map((r) => ({ agency: r.agency, total: parseFloat(r.total) })),
      records:     records.rows,
      pagination: {
        page:       parseInt(page, 10),
        pageSize:   limit,
        totalCount: parseInt(countRow.rows[0].count, 10),
        totalPages: Math.ceil(parseInt(countRow.rows[0].count, 10) / limit),
      },
    });
  } catch (err) {
    console.error("/api/dashboard error:", err);
    res.status(500).json({ error: "Query failed" });
  }
});

// ─── GET /api/changes ─────────────────────────────────────────────────────
// Year-over-year comparison (FY22 → FY23). The fy filter is intentionally
// ignored so we always have both years to compare; other filters apply.

const MIN_BASELINE = 100_000;
const MIN_GROWTH_PCT = 10;  // minimum YoY growth to count as a "rising" category

interface DimRow {
  label: string;
  fy22: number;
  fy23: number;
  pctChange: number | null;
  absChange: number;
  isNew: boolean;
}

function buildDim(rows: { label: string; fy22: string; fy23: string }[]): DimRow[] {
  return rows.map((r) => {
    const fy22 = parseFloat(r.fy22) || 0;
    const fy23 = parseFloat(r.fy23) || 0;
    const absChange = fy23 - fy22;
    const pctChange = fy22 > 0 ? (absChange / fy22) * 100 : null;
    return { label: r.label, fy22, fy23, pctChange, absChange, isNew: fy22 === 0 && fy23 > 0 };
  });
}

paymentsRouter.get("/changes", async (req: Request, res: Response) => {
  const { agency, category, subCategory, vendor } = req.query as Record<string, string>;

  const { clause, params } = buildWhere(
    Object.fromEntries(
      Object.entries({ agency, category, subCategory, vendor }).filter(([, v]) => v && v !== "All")
    ) as Filters
  );

  const yoyExpr = (col: string) => `
    SELECT ${col} AS label,
           SUM(CASE WHEN fy = 2022 THEN amount ELSE 0 END) AS fy22,
           SUM(CASE WHEN fy = 2023 THEN amount ELSE 0 END) AS fy23
    FROM vendor_payments ${clause}
    GROUP BY ${col}
    HAVING SUM(CASE WHEN fy = 2022 THEN amount ELSE 0 END) > 0
        OR SUM(CASE WHEN fy = 2023 THEN amount ELSE 0 END) > 0`;

  try {
    const [catRes, agencyRes, vendorRes] = await Promise.all([
      pool.query<{ label: string; fy22: string; fy23: string }>(yoyExpr("category"), params),
      pool.query<{ label: string; fy22: string; fy23: string }>(yoyExpr("agency"),   params),
      pool.query<{ label: string; fy22: string; fy23: string }>(yoyExpr("vendor"),   params),
    ]);

    const categories = buildDim(catRes.rows);
    const agencies   = buildDim(agencyRes.rows);
    const vendors    = buildDim(vendorRes.rows);

    // Top mover: largest % increase among items with a real baseline
    const topIncrease = [...categories]
      .filter((c) => c.fy22 >= MIN_BASELINE && c.pctChange != null && c.pctChange > 0)
      .sort((a, b) => (b.pctChange! - a.pctChange!))[0] ?? null;

    // Largest drop: most negative % change among vendors with a real baseline
    const largestDrop = [...vendors]
      .filter((v) => v.fy22 >= MIN_BASELINE && v.pctChange != null && v.pctChange < 0)
      .sort((a, b) => (a.pctChange! - b.pctChange!))[0] ?? null;

    // Rising spend area: among categories that meaningfully grew (≥10% YoY),
    const newCategory =
      [...categories]
        .filter((c) => c.label !== topIncrease?.label && c.pctChange != null && c.pctChange >= MIN_GROWTH_PCT)
        .sort((a, b) => a.fy22 - b.fy22)[0]
      ?? [...categories]
        .filter((c) => c.label !== topIncrease?.label && c.absChange > 0)
        .sort((a, b) => a.fy22 - b.fy22)[0]
      ?? null;

    res.json({
      categories,
      agencies,
      vendors,
      highlights: { topIncrease, largestDrop, newCategory },
    });
  } catch (err) {
    console.error("/api/changes error:", err);
    res.status(500).json({ error: "Query failed" });
  }
});

// ─── GET /api/month-breakdown ─────────────────────────────────────────────

paymentsRouter.get("/month-breakdown", async (req: Request, res: Response) => {
  const { fMonth, fy, agency, category, subCategory, vendor } =
    req.query as Record<string, string>;

  const monthNum = parseInt(fMonth, 10);
  if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ error: "fMonth must be 1-12" });
  }

  const { clause, params } = buildWhere(
    Object.fromEntries(
      Object.entries({ fy, agency, category, subCategory, vendor }).filter(([, v]) => v && v !== "All")
    ) as Filters
  );

  const monthCond = `(CASE WHEN f_month <= 12 THEN f_month ELSE f_month - 12 END) = $${params.length + 1}`;
  const fullClause = clause ? `${clause} AND ${monthCond}` : `WHERE ${monthCond}`;
  const fullParams = [...params, monthNum];

  try {
    const [byCat, byAgency, byVendor, byFY] = await Promise.all([
      pool.query<{ category: string; total: string }>(
        `SELECT category, SUM(amount) AS total
         FROM vendor_payments ${fullClause}
         GROUP BY category ORDER BY total DESC LIMIT 8`,
        fullParams
      ),
      pool.query<{ agency: string; total: string }>(
        `SELECT agency, SUM(amount) AS total
         FROM vendor_payments ${fullClause}
         GROUP BY agency ORDER BY total DESC LIMIT 8`,
        fullParams
      ),
      pool.query<{ vendor: string; total: string }>(
        `SELECT vendor, SUM(amount) AS total
         FROM vendor_payments ${fullClause}
         GROUP BY vendor ORDER BY total DESC LIMIT 8`,
        fullParams
      ),
      pool.query<{ fy: number; total: string }>(
        `SELECT fy, SUM(amount) AS total
         FROM vendor_payments ${fullClause}
         GROUP BY fy ORDER BY fy`,
        fullParams
      ),
    ]);

    res.json({
      fMonth: monthNum,
      byCategory: byCat.rows.map((r) => ({ category: r.category, total: parseFloat(r.total) })),
      byAgency:   byAgency.rows.map((r) => ({ agency: r.agency, total: parseFloat(r.total) })),
      byVendor:   byVendor.rows.map((r) => ({ vendor: r.vendor, total: parseFloat(r.total) })),
      byFY:       byFY.rows.map((r) => ({ fy: r.fy, total: parseFloat(r.total) })),
    });
  } catch (err) {
    console.error("/api/month-breakdown error:", err);
    res.status(500).json({ error: "Query failed" });
  }
});
