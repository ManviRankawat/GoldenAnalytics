# GoldenAnalytics — Vendor Payments Dashboard

React + TypeScript frontend · Express + TypeScript backend · PostgreSQL

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally
- The two CSV files in `backend/data/`

---

## 1. Database Setup

```bash
createdb golden_analytics
psql -d golden_analytics -f backend/sql/schema.sql
```

---

## 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env         
```

### Seed the database (~935K rows, takes ~2–3 min)

Place the two CSV files in `backend/data/`:
```
backend/data/Vendor-Payments_2021-23_FY_2022_.csv
backend/data/Vendor-Payments_2021-23_FY_2023_.csv
```

Then run:
```bash
npm run seed
```

### Start the API server (port 3001)
```bash
npm run dev
```

---

## 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev       # opens on http://localhost:5173
```

---

## Project Structure

```
GoldenAnalytics/
├── backend/
│   ├── data/           ← place CSV files here
│   ├── sql/schema.sql
│   └── src/
│       ├── db.ts
│       ├── seed.ts
│       ├── server.ts
│       └── routes/payments.ts
└── frontend/
    └── src/
        ├── types.ts
        ├── api.ts
        ├── App.tsx
        └── components/
            ├── Dashboard.tsx
            ├── FilterBar.tsx
            ├── Scorecards.tsx
            ├── Charts.tsx
            └── DataTable.tsx
```
