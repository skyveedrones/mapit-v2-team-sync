/**
 * Clerk Password Hash Migration Script (CSV → Clerk)
 * =====================================================
 * Reads a CSV export of users (email, password_hash, first_name, last_name)
 * and imports them into Clerk with their existing bcrypt password hashes.
 *
 * Flags set on every import:
 *   - password_hasher: "bcrypt"    → tells Clerk the hash algorithm
 *   - skip_password_checks: true   → accepts the raw hash without validation
 *   - skip_legal_checks:    true   → skips ToS/privacy acceptance requirement
 *   - skip_webhooks:        true   → suppresses user.created webhook events
 *                                    (prevents flooding your database)
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_live_xxx node scripts/import-csv-users-to-clerk.mjs users.csv
 *
 * CSV format (header row required):
 *   email,password_hash,first_name,last_name
 *   test@example.com,$2a$12$R9h/c...,John,Doe
 *
 * Output:
 *   - Console progress with per-user status
 *   - migration-results.json written to the same directory as the CSV
 *
 * No external dependencies — uses only Node.js built-ins.
 */

import { createReadStream } from "fs";
import { writeFile, access } from "fs/promises";
import { createInterface } from "readline";
import path from "path";

// ── Config ──────────────────────────────────────────────────────────────────

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error("❌  CLERK_SECRET_KEY environment variable is required.");
  console.error("    Run: CLERK_SECRET_KEY=sk_live_xxx node scripts/import-csv-users-to-clerk.mjs users.csv");
  process.exit(1);
}

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error("❌  CSV file path is required as the first argument.");
  console.error("    Run: node scripts/import-csv-users-to-clerk.mjs path/to/users.csv");
  process.exit(1);
}

try {
  await access(CSV_PATH);
} catch {
  console.error(`❌  CSV file not found: ${CSV_PATH}`);
  process.exit(1);
}

// Rate limiting: Clerk allows ~20 requests/second on most plans.
// 10 concurrent requests + 600ms pause between batches stays safely under that.
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 600;

// ── CSV parser (no external deps) ──────────────────────────────────────────

/**
 * Parse a single CSV line, handling quoted fields that may contain commas.
 */
function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped quotes ("")
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

async function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: createReadStream(filePath, "utf8"),
      crlfDelay: Infinity,
    });

    const rows = [];
    let headers = null;

    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const fields = parseCsvLine(trimmed);

      if (!headers) {
        // Normalise header names to lowercase with underscores
        headers = fields.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
        return;
      }

      const row = {};
      headers.forEach((h, i) => {
        row[h] = fields[i] ?? "";
      });
      rows.push(row);
    });

    rl.on("close", () => resolve(rows));
    rl.on("error", reject);
  });
}

// ── Import a single user via Clerk REST API ─────────────────────────────────

async function importUser(row, rowIndex) {
  // Support snake_case and camelCase column name variants
  const email = (row.email || "").trim().toLowerCase();
  const passwordHash = (row.password_hash || row.passwordhash || row.password || "").trim();
  const firstName = (row.first_name || row.firstname || "").trim() || undefined;
  const lastName = (row.last_name || row.lastname || "").trim() || undefined;

  if (!email) {
    return { status: "skipped", reason: "missing email", row: rowIndex };
  }
  if (!passwordHash) {
    return { status: "skipped", reason: "missing password_hash", email, row: rowIndex };
  }

  // Validate bcrypt hash prefix ($2a$, $2b$, $2y$ are all valid bcrypt variants)
  const isBcrypt =
    passwordHash.startsWith("$2a$") ||
    passwordHash.startsWith("$2b$") ||
    passwordHash.startsWith("$2y$");

  if (!isBcrypt) {
    return {
      status: "skipped",
      reason: `unrecognised hash format (expected bcrypt $2a$/$2b$/$2y$, got: ${passwordHash.substring(0, 8)}...)`,
      email,
      row: rowIndex,
    };
  }

  try {
    const res = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: [email],
        first_name: firstName,
        last_name: lastName,
        // Password hash migration
        password_hasher: "bcrypt",
        password_digest: passwordHash,
        // Suppress all side-effects during bulk import
        skip_password_checks: true,
        skip_legal_checks: true,
        skip_webhooks: true,
      }),
    });

    const data = await res.json();

    if (res.ok && data.id) {
      return { status: "success", email, clerkUserId: data.id, row: rowIndex };
    }

    const errorCode = data.errors?.[0]?.code ?? "";
    const errorMsg =
      data.errors?.[0]?.long_message ??
      data.errors?.[0]?.message ??
      JSON.stringify(data);

    // "Already exists" is a warning, not a failure
    if (
      errorCode === "form_identifier_exists" ||
      errorMsg.includes("already exists")
    ) {
      // Look up the existing user so we can return their Clerk ID
      const searchRes = await fetch(
        `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`,
        { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } }
      );
      const searchData = await searchRes.json();
      const existing = Array.isArray(searchData) ? searchData[0] : null;
      return {
        status: "already_exists",
        email,
        clerkUserId: existing?.id ?? null,
        row: rowIndex,
      };
    }

    return {
      status: "error",
      email,
      code: errorCode,
      message: errorMsg,
      row: rowIndex,
    };
  } catch (err) {
    return {
      status: "error",
      email,
      code: "network_error",
      message: err.message,
      row: rowIndex,
    };
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📂  Reading CSV: ${CSV_PATH}`);
  const rows = await readCsv(CSV_PATH);
  console.log(`✅  Loaded ${rows.length} rows\n`);

  if (rows.length === 0) {
    console.error("❌  No rows found in CSV. Check that the file has a header row and data rows.");
    process.exit(1);
  }

  // Show detected columns
  console.log(`📋  Detected columns: ${Object.keys(rows[0]).join(", ")}\n`);

  const results = {
    total: rows.length,
    success: 0,
    already_exists: 0,
    skipped: 0,
    error: 0,
    details: [],
  };

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

    console.log(
      `⏳  Batch ${batchNum}/${totalBatches} (rows ${i + 1}–${Math.min(i + BATCH_SIZE, rows.length)})...`
    );

    const batchResults = await Promise.all(
      batch.map((row, j) => importUser(row, i + j + 1))
    );

    for (const result of batchResults) {
      results[result.status] = (results[result.status] || 0) + 1;
      results.details.push(result);

      const icon =
        result.status === "success"
          ? "✅"
          : result.status === "already_exists"
          ? "⚠️ "
          : result.status === "skipped"
          ? "⏭️ "
          : "❌";

      const detail =
        result.status === "success"
          ? `${result.email} → ${result.clerkUserId}`
          : result.status === "already_exists"
          ? `${result.email} — already in Clerk (${result.clerkUserId ?? "ID unknown"})`
          : `${result.email ?? `row ${result.row}`} — ${result.reason ?? result.message}`;

      console.log(`  ${icon}  ${detail}`);
    }

    // Pause between batches to respect rate limits
    if (i + BATCH_SIZE < rows.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("\n── Migration Summary ──────────────────────────────────────────");
  console.log(`  Total rows:     ${results.total}`);
  console.log(`  ✅  Imported:   ${results.success}`);
  console.log(`  ⚠️   Existing:  ${results.already_exists}`);
  console.log(`  ⏭️   Skipped:   ${results.skipped}`);
  console.log(`  ❌  Errors:     ${results.error}`);
  console.log("───────────────────────────────────────────────────────────────\n");

  const outputPath = path.join(path.dirname(path.resolve(CSV_PATH)), "migration-results.json");
  await writeFile(outputPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`📄  Full results written to: ${outputPath}\n`);

  if (results.error > 0) {
    console.log("⚠️   Some users failed. Review migration-results.json for details.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌  Fatal error:", err);
  process.exit(1);
});
