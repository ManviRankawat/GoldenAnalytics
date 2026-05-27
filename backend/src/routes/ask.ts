import { Router, Request, Response } from "express";
import Groq from "groq-sdk";
import { pool } from "../db";

export const askRouter = Router();

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a friendly data analyst helping a non-technical user understand vendor payment spending data for a US state agency.

Rules:
- Answer in plain English, no jargon. Imagine you're explaining to a budget manager, not a developer.
- Be concise: 2–5 short sentences, or a tight bulleted list. Never write a wall of text.
- Always ground your answer in the data provided below. Quote specific dollar amounts and percentages.
- Format dollar amounts in human-friendly form: $1.2M, $450K, $3.4B. Not raw numbers.
- If the question can't be answered from the provided data, say so honestly in one sentence.
- Never invent vendors, agencies, or figures. Only use what's in the data.
- Do not echo the question back. Get straight to the answer.`;

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

async function buildDataContext(filters: Filters): Promise<string> {
  const { clause, params } = buildWhere(filters);

  const [summary, byCat, byMonth, topVendors, byAgency] = await Promise.all([
    pool.query<{ count: string; total: string; avg: string; vendors: string }>(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total,
              COALESCE(AVG(amount),0) AS avg, COUNT(DISTINCT vendor) AS vendors
       FROM vendor_payments ${clause}`,
      params
    ),
    pool.query<{ category: string; total: string }>(
      `SELECT category, SUM(amount) AS total FROM vendor_payments ${clause}
       GROUP BY category ORDER BY total DESC`,
      params
    ),
    pool.query<{ fy: number; f_month: number; total: string }>(
      `SELECT fy,
              CASE WHEN f_month <= 12 THEN f_month ELSE f_month - 12 END AS f_month,
              SUM(amount) AS total
       FROM vendor_payments ${clause}
       GROUP BY fy, CASE WHEN f_month <= 12 THEN f_month ELSE f_month - 12 END
       ORDER BY fy, 2`,
      params
    ),
    pool.query<{ vendor: string; total: string }>(
      `SELECT vendor, SUM(amount) AS total FROM vendor_payments ${clause}
       GROUP BY vendor ORDER BY total DESC LIMIT 20`,
      params
    ),
    pool.query<{ agency: string; total: string }>(
      `SELECT agency, SUM(amount) AS total FROM vendor_payments ${clause}
       GROUP BY agency ORDER BY total DESC LIMIT 20`,
      params
    ),
  ]);

  const s = summary.rows[0];
  const monthNames = ["", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  const ctx = {
    activeFilters: filters,
    summary: {
      totalSpending: parseFloat(s.total),
      paymentCount:  parseInt(s.count, 10),
      uniqueVendors: parseInt(s.vendors, 10),
      avgPayment:    parseFloat(s.avg),
    },
    byCategory: byCat.rows.map((r) => ({ category: r.category, total: parseFloat(r.total) })),
    monthlyTrend: byMonth.rows.map((r) => ({
      fy: r.fy, month: monthNames[r.f_month] ?? `M${r.f_month}`, total: parseFloat(r.total),
    })),
    top20Vendors: topVendors.rows.map((r) => ({ vendor: r.vendor, total: parseFloat(r.total) })),
    top20Agencies: byAgency.rows.map((r) => ({ agency: r.agency, total: parseFloat(r.total) })),
  };

  return JSON.stringify(ctx, null, 2);
}

askRouter.post("/ask", async (req: Request, res: Response) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      error: "AI is not configured. Set GROQ_API_KEY in backend/.env to enable.",
    });
  }

  const { question, filters } = req.body as { question?: string; filters?: Filters };
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "Question is required." });
  }
  if (question.length > 500) {
    return res.status(400).json({ error: "Question is too long (max 500 chars)." });
  }

  try {
    const dataContext = await buildDataContext(filters ?? {});

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 600,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here is the current spending data the user is looking at:\n\n${dataContext}\n\nUser question: ${question.trim()}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    res.json({ answer: text });
  } catch (err: any) {
    console.error("/api/ask error:", err?.message ?? err);
    res.status(500).json({ error: "Failed to get an answer. Please try again." });
  }
});
