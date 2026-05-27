# GoldenAnalytics — Project Writeup

## The data I started with

A vendor-payments dataset from a US state government covering Fiscal Year 2022 and Fiscal Year 2023. Every row is a single payment, with:

- **When** — fiscal year, fiscal month, biennium
- **Who paid** — agency (full name + short code)
- **What for** — category and sub-category (standardized accounting codes), plus the underlying object/sub-object codes
- **Who got paid** — vendor name
- **How much** — dollar amount

Roughly: ~50K+ payments across ~200 agencies, 9 categories, ~77 sub-categories, thousands of vendors. Two years of comparable data means everything has a natural year-over-year story.

## How I wanted the page to communicate

This is data a *budget manager* or *agency executive* should be able to open and understand in under thirty seconds — not data that requires an analyst to translate. So the page had to do three jobs in order:

1. **Show me the headline numbers** — totals, counts, averages, distinct vendor count.
2. **Show me where the money goes** — by category, by agency, by vendor, across time.
3. **Tell me what changed** — and let me ask follow-up questions in plain English.

Everything else (raw records, drill-downs, filters) is in service of those three.

---

## 1. The problem I set out to solve

State spending data is public, but it's effectively opaque to the people who most need to act on it. The pain isn't "the data doesn't exist" — it's:

- A spreadsheet with 50,000 rows tells you nothing at a glance.
- Trends only become visible when you compare years, and that comparison requires effort most non-analysts won't make.
- The interesting questions ("did Transportation start spending more this year? on what?") require SQL skills the audience doesn't have.

So the user pain I focused on is: **a non-technical decision-maker should be able to spot what changed, drill into why, and ask follow-up questions — without writing a single query.**

**Other directions I considered and rejected:**

- *Build a deeper analytics tool* (cohort analysis, forecasting, anomaly detection). Rejected because it solves a different audience's problem (data scientists), and the actual gap for state-budget users is *clarity*, not statistical sophistication.
- *Build an alerting / monitoring service* (e.g., "ping me when X agency spends over $Y"). Rejected because alerts require an opinion about *what's normal*, and that opinion is exactly what the dashboard is supposed to help the user form in the first place.
- *Pure report generation* (static PDFs). Rejected because the interesting follow-ups always come *after* you see the first chart, and a static report can't answer "yeah but why is Health Care Authority 44% of the total?"

The interactive-explore-with-change-detection direction won because it puts the human in the loop where they need to be (asking questions) and removes them from where they shouldn't be (writing SQL).

---

## 2. Tech and architectural choices

### What I built

A single-page React app talking to a small Node/Express + Postgres backend.

| Layer | Choice | Why |
|---|---|---|
| Database | Postgres | Indexes on `fy`, `category`, `agency`, `vendor` make every dashboard query sub-second on this dataset size. Composite indexes on `(fy, category)` and `(fy, agency)` carry the YoY queries. |
| Backend | Express + raw SQL via `pg` | The queries are all aggregations — an ORM would just add friction. A small `buildWhere()` helper composes filter clauses safely (parameterized). |
| Frontend | React + TypeScript + Recharts | TypeScript catches the data-shape mistakes that are easy to make when SQL columns rename. Recharts is declarative enough that the chart logic stays readable. |
| LLM | Groq (Llama 3.3 70B) | I originally wired Anthropic Claude; switched to Groq because the free tier means anyone can run this without payment friction. Response times under a second matter for "ask anything" UX. |

### How the change-detection layer works

The `/api/changes` endpoint computes year-over-year deltas for categories, agencies, and vendors in a single query each. For every dimension it returns FY22 total, FY23 total, percentage change, and an `isNew` flag.

A trend-color helper then maps that percentage into three semantic buckets used everywhere on the page:

- **Red** — overspending (more than +10% YoY)
- **Blue** — stable (within ±10%) or new
- **Green** — reduced costs (more than −10% YoY)

The Spend by Agency and Top Vendors bar charts use these colors directly per bar, so a user gets a visual heatmap of where the spending pressure is — without reading any numbers.

The "What Changed?" cards sit above the charts and pick three executive-relevant highlights from the change data: the biggest YoY jumper, the biggest vendor drop, and a newly significant category.

### How the chatbot works

The `/api/ask` endpoint receives the user's question along with their currently active filters. The backend re-runs the dashboard queries against the filtered slice, serializes the result (summary + top categories + top vendors + top agencies + monthly trend) as a JSON block, and includes it in the prompt sent to Groq. A system prompt enforces:

- Plain English, no jargon
- Concise (2–5 sentences)
- Dollar amounts in `$1.2M` / `$450K` form, never raw numbers
- Refuse to invent vendors or figures not in the data

The model answers based only on the slice the user is currently viewing — so an answer to "what's the top vendor?" automatically respects whatever filters are applied.

### What I explicitly deferred

- **Auth, user accounts, multi-tenancy.** This is a single-tenant analytics layer over public data. Adding auth before there are users to authorize would be premature.
- **Real-time data ingestion.** The data is annual budget data; nightly refresh is more than enough. I didn't build streaming or pub/sub.
- **Drill-down beyond month level.** The dataset has no day-level granularity, so I didn't build a daily view that would always be empty.
- **A comprehensive test suite.** I rely on TypeScript's compile-time checks and the type-checked SQL result shapes. For a production version, I'd add at least snapshot tests for the chart components and integration tests for the change-detection logic.
- **Caching.** Right now every page load re-runs the aggregations. They're fast enough on this dataset, but in production I'd add a Redis layer keyed by filter combination, invalidated nightly.
- **Accessibility audit.** Color-only encoding (red/blue/green) is meaningful, but a colorblind user wouldn't get the same signal. In a production version I'd pair color with iconography or text labels on the bars.

### What I'd change in a production version

1. **Move SQL into views.** The YoY query in `/api/changes` is the same shape three times (category, agency, vendor). I'd express it as a parameterized view and reduce duplication.
2. **Schema-validate the LLM responses.** Right now the AI returns free-form text. In production I'd ask it to return structured JSON (`answer`, `confidence`, `sourcesUsed`) so the frontend can verify nothing was hallucinated and surface citations.
3. **Server-side pagination of the change data.** Today the backend returns *all* categories/agencies/vendors with YoY data — fine at this scale, but it'd need slicing if the dataset 10x'd.
4. **Audit log for AI questions.** A simple table that logs question + answer + filter context, so the team can spot which questions get asked repeatedly and bake those into dashboard panels.
5. **Replace `style={{}}` inline styles with CSS modules or Tailwind.** The inline-styles approach worked for shipping fast; it's not what I'd want for a team of three people maintaining the UI.

---

## 3. AI usage log

I used Claude Code as a pair-programmer throughout. Three interactions worth describing:

### Interaction 1: Choosing the LLM provider

**What I asked:** I described the AskAI chatbot feature and asked for the simplest path from "no AI in the app" to "user can type a question and get a grounded answer."

**What it gave me:** A clear comparison of three options — Anthropic Claude (best quality, paid API), Groq with Llama 3.3 (free tier, very fast, comparable quality for this kind of Q&A), and a rule-based pattern-matcher (no AI, no key, but very limited). It also flagged that prompt caching would matter for cost — and built the first version with Claude + caching.

**What I kept, changed, rejected:** I initially picked Claude. When I realized API access required separate billing from my Claude.ai subscription (which I had to learn from the AI — I'd assumed the two were linked), I pivoted to Groq's free tier. The AI swapped out the SDK cleanly: same `/api/ask` contract, same system prompt, same data context — only the client library and model name changed. I kept the system prompt verbatim because it was already enforcing the rules I wanted (plain English, $1.2M formatting, no hallucination, ground in supplied data).

### Interaction 2: Diagnosing the empty "New high-spend category" card

**What I asked:** "New high spend category is empty? diagnose why"

**What it gave me:** Instead of guessing, the AI immediately ran two SQL queries against my actual database to inspect the data shape — first checking categories (9 total, all present in both years), then sub-categories (77 total, only 1 literally new in FY23 and only at $198 of spend). It explained that the strict "FY22 = $0 and FY23 ≥ $250K" condition could never match because state accounting codes don't actually appear or disappear year-over-year. It then proposed a fallback heuristic: literal-new first, then biggest scale-up (e.g., a sub-category that 4×'d from a small baseline).

**What I kept, changed, rejected:** I kept the diagnosis — it was the right call to look at the data before changing the logic. I haven't yet applied the proposed fix because I want to think about whether "biggest scale-up" is the right replacement signal or whether the card should just be removed for this dataset. This is a good example of the AI doing the *investigation* well and leaving the *judgment call* to me — which is the division of labor I want.

### Interaction 3: Fixing the chopped X-axis labels (and then redesigning the whole chart)

**What I asked:** I described an existing chart where the rotated category labels were getting cut off because the rotation angle + small bottom margin meant the text fell off the canvas.

**What it gave me:** A targeted fix — steepened the angle from −30° to −45°, expanded the chart height and bottom margin, added explicit XAxis height, added a `tickFormatter` to truncate over-long labels with an ellipsis (with the full name still in the tooltip). Type-checked clean on the first try.

**What I kept, changed, rejected:** I kept the fix as-is for that chart, then a few iterations later asked the AI to redesign the chart entirely as a donut + legend layout, with percentages on the slices and dollar amounts in the legend. The original tickFormatter idea got reused as the truncation rule for the legend list. I rejected the AI's default of having percentages in the *legend* too — I wanted the percent inside the slice (visual) and the dollar amount in the legend (precise), so I told it to do exactly that and it did. This was a good example of iterating on the same surface — the AI never tried to revisit my earlier rotation fix once we'd moved past it.

---

## What didn't go well

A couple of things to be honest about:

- The "What Changed?" detection has a real edge case (described above) where standardized accounting codes mean nothing is literally new. I shipped the feature anyway because the other two cards (top increase, largest drop) work correctly — but the third card being empty for this dataset is a visible flaw I haven't resolved.
- The color coding uses three colors only (red/blue/green). For a colorblind user, the meaning collapses. A production version needs symbols too.
- I'm using inline styles throughout. It works, but it's not what I'd hand off to a team.

## What I'd want to add next

1. **Vendor concentration risk** — flag agencies where one vendor receives more than X% of total spend.
2. **Anomaly detection on the monthly trend** — call out months where a single line item drove a spike.
3. **Saved views** — let a user bookmark a filter combination + a default question to ask.
4. **Export to PDF** — for the executive who actually wants the static report after exploring interactively.
