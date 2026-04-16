/**
 * migrate-users-to-clerk.mjs
 *
 * One-off script: reads all existing MAPIT users from MySQL,
 * creates them in Clerk (skip_password_checks: true),
 * then writes the Clerk user ID back to the clerk_user_id column.
 *
 * Run: node scripts/migrate-users-to-clerk.mjs
 */

import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error("❌ CLERK_SECRET_KEY not set");
  process.exit(1);
}

const conn = await createConnection(process.env.DATABASE_URL);

// Fetch all users that don't already have a clerk_user_id
const [rows] = await conn.execute(
  "SELECT id, name, email, openId, role FROM users WHERE clerk_user_id IS NULL AND email IS NOT NULL AND email != '' ORDER BY id"
);

console.log(`Found ${rows.length} users to migrate`);

let created = 0;
let skipped = 0;
let failed = 0;

for (const user of rows) {
  const nameParts = (user.name || "").trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  try {
    // Create user in Clerk
    const res = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: [user.email],
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        skip_password_checks: true,
        skip_password_requirement: true,
        // Store our internal DB id in Clerk metadata for reference
        public_metadata: {
          db_user_id: user.id,
          role: user.role,
        },
      }),
    });

    const data = await res.json();

    if (res.ok && data.id) {
      // Write clerk_user_id back to DB
      await conn.execute(
        "UPDATE users SET clerk_user_id = ? WHERE id = ?",
        [data.id, user.id]
      );
      console.log(`✅ [${user.id}] ${user.email} → ${data.id}`);
      created++;
    } else if (data.errors?.some((e) => e.code === "form_identifier_exists")) {
      // User already exists in Clerk — look them up by email
      const searchRes = await fetch(
        `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(user.email)}`,
        {
          headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
        }
      );
      const searchData = await searchRes.json();
      const existing = Array.isArray(searchData) ? searchData[0] : null;
      if (existing?.id) {
        await conn.execute(
          "UPDATE users SET clerk_user_id = ? WHERE id = ?",
          [existing.id, user.id]
        );
        console.log(`↩️  [${user.id}] ${user.email} already in Clerk → ${existing.id}`);
        skipped++;
      } else {
        console.warn(`⚠️  [${user.id}] ${user.email} exists in Clerk but lookup failed`);
        failed++;
      }
    } else {
      console.error(`❌ [${user.id}] ${user.email}:`, JSON.stringify(data.errors || data));
      failed++;
    }
  } catch (err) {
    console.error(`❌ [${user.id}] ${user.email}: ${err.message}`);
    failed++;
  }

  // Rate limit: Clerk allows ~20 req/s on test keys
  await new Promise((r) => setTimeout(r, 100));
}

await conn.end();
console.log(`\nDone. Created: ${created}, Already existed: ${skipped}, Failed: ${failed}`);
