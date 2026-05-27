/**
 * seed.ts — Load both Vendor Payments CSVs into PostgreSQL
 * Run: npm run seed
 *
 * Place CSVs in backend/data/:
 *   Vendor-Payments_2021-23_FY_2022_.csv
 *   Vendor-Payments_2021-23_FY_2023_.csv
 */

import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { pool } from "./db";

const DATA_DIR = path.join(__dirname, "../data");
const FILES = [
  "Vendor-Payments_2021-23_FY_2022_.csv",
  "Vendor-Payments_2021-23_FY_2023_.csv",
];

const BATCH_SIZE = 500;

async function truncateTable(client: any) {
  await client.query("TRUNCATE TABLE vendor_payments RESTART IDENTITY");
  console.log("Table truncated.");
}

function parseAmount(raw: string): number {
  const cleaned = String(raw ?? "0").replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function seedFile(filePath: string, client: any): Promise<number> {
  return new Promise((resolve, reject) => {
    let batch: any[][] = [];
    let total = 0;

    const flush = async () => {
      if (batch.length === 0) return;

      // Build parameterized bulk insert
      const values: any[] = [];
      const placeholders = batch.map((row, i) => {
        const base = i * 11;
        values.push(...row);
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11})`;
      });

      await client.query(
        `INSERT INTO vendor_payments
           (bien, fy, f_month, agy, agency, object, category, subobj, sub_category, vendor, amount)
         VALUES ${placeholders.join(",")}`,
        values
      );
      total += batch.length;
      batch = [];
    };

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });

    parser.on("data", async (row: Record<string, string>) => {
      if (!row.Vendor?.trim()) return;

      batch.push([
        row.Bien?.trim() ?? "",
        parseInt(row.FY?.trim() ?? "0", 10),
        parseInt(row.FMonth?.trim() ?? "0", 10),
        row.Agy?.trim() ?? "",
        row.Agency?.trim() ?? "",
        row.Object?.trim() ?? "",
        row.Category?.trim() ?? "",
        row.Subobj?.trim() ?? "",
        row.SubCategory?.trim() ?? "",
        row.Vendor?.trim() ?? "",
        parseAmount(row.Amount),
      ]);

      if (batch.length >= BATCH_SIZE) {
        parser.pause();
        try {
          await flush();
          if (total % 50000 === 0) process.stdout.write(`  ${total.toLocaleString()} rows...\r`);
        } catch (err) {
          reject(err);
          return;
        }
        parser.resume();
      }
    });

    parser.on("end", async () => {
      try {
        await flush();
        resolve(total);
      } catch (err) {
        reject(err);
      }
    });

    parser.on("error", reject);

    fs.createReadStream(filePath, { encoding: "utf8" }).pipe(parser);
  });
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("Starting seed...\n");
    await truncateTable(client);

    let grandTotal = 0;
    for (const file of FILES) {
      const filePath = path.join(DATA_DIR, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`  SKIPPED (not found): ${file}`);
        continue;
      }
      console.log(`Loading: ${file}`);
      const count = await seedFile(filePath, client);
      console.log(`  ✓ ${count.toLocaleString()} rows inserted`);
      grandTotal += count;
    }

    // Analyze for query planner
    console.log("\nRunning ANALYZE...");
    await client.query("ANALYZE vendor_payments");

    console.log(`\n✓ Seed complete — ${grandTotal.toLocaleString()} total rows\n`);
  } catch (err) {
    console.error("\nSeed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
