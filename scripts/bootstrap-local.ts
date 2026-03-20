/**
 * bootstrap-local.ts
 * 
 * Seeds a fresh local TiDB/MySQL database with:
 *   - A SkyVee organization
 *   - A local dev user (Clay Bechtol)
 *   - A Test Project 1
 * 
 * Usage:
 *   npx tsx scripts/bootstrap-local.ts
 * 
 * Prerequisites:
 *   - DATABASE_URL set in your .env file
 *   - pnpm db:push already run to create tables
 */

import * as dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Please add it to your .env file.");
  process.exit(1);
}

async function bootstrap() {
  console.log("🚀 Starting local database bootstrap...");

  const connection = await mysql.createConnection(DATABASE_URL as string);

  try {
    // ─── 1. Insert SkyVee Organization ───────────────────────────────────────
    console.log("📦 Creating SkyVee organization...");
    const [orgResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO organizations (name, type, subscriptionTier, createdAt, updatedAt)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      ["SkyVee Aerial Drone Services", "drone_service_provider", "professional"]
    );
    const orgId = orgResult.insertId;
    console.log(`   ✅ Organization ID: ${orgId}`);

    // ─── 2. Insert Local Dev User ─────────────────────────────────────────────
    console.log("👤 Creating local dev user (Clay Bechtol)...");
    const [userResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO users (
         openId, name, email, loginMethod, role,
         organization, defaultDronePilot, defaultFaaLicenseNumber, defaultLaancAuthNumber,
         subscriptionTier, subscriptionStatus, billingPeriod, cancelAtPeriodEnd,
         organizationId, orgRole, createdAt, updatedAt, lastSignedIn
       ) VALUES (
         ?, ?, ?, ?, ?,
         ?, ?, ?, ?,
         ?, ?, ?, ?,
         ?, ?, NOW(), NOW(), NOW()
       )
       ON DUPLICATE KEY UPDATE
         organizationId = VALUES(organizationId),
         orgRole = VALUES(orgRole),
         updatedAt = NOW()`,
      [
        "local-dev-open-id",           // openId
        "Clay Bechtol",                 // name
        "clay@skyveedrones.com",        // email
        "local",                        // loginMethod
        "webmaster",                    // role
        "SkyVee Aerial Drone Services", // organization
        "Edward Clay Bechtol",          // defaultDronePilot
        "5205636",                      // defaultFaaLicenseNumber
        "LAANC-2025-001",               // defaultLaancAuthNumber
        "enterprise",                   // subscriptionTier
        "active",                       // subscriptionStatus
        "annual",                       // billingPeriod
        "no",                           // cancelAtPeriodEnd
        orgId,                          // organizationId
        "PROVIDER",                     // orgRole
      ]
    );
    const userId = userResult.insertId || (await getUserId(connection, "clay@skyveedrones.com"));
    console.log(`   ✅ User ID: ${userId}`);

    // Update user's organizationId if already existed (ON DUPLICATE KEY doesn't return insertId)
    if (userResult.insertId === 0) {
      await connection.execute(
        `UPDATE users SET organizationId = ?, orgRole = 'PROVIDER' WHERE email = ?`,
        [orgId, "clay@skyveedrones.com"]
      );
      console.log(`   ✅ Updated existing user's organizationId to ${orgId}`);
    }

    // ─── 3. Insert Test Project 1 ─────────────────────────────────────────────
    console.log("📁 Creating Test Project 1...");
    const [projectResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO projects (
         userId, name, description, location, status,
         mediaCount, organizationId, isPinned, createdAt, updatedAt
       ) VALUES (
         ?, ?, ?, ?, ?,
         ?, ?, ?, NOW(), NOW()
       )
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [
        userId,
        "Test Project 1",
        "Local development test project — safe to delete",
        "Dallas, TX",
        "active",
        0,
        orgId,
        true,
      ]
    );
    const projectId = projectResult.insertId;
    console.log(`   ✅ Project ID: ${projectId}`);

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log("\n✅ Bootstrap complete!");
    console.log("─────────────────────────────────────────");
    console.log(`   Organization: SkyVee Aerial Drone Services (ID: ${orgId})`);
    console.log(`   User:         Clay Bechtol (ID: ${userId})`);
    console.log(`   Project:      Test Project 1 (ID: ${projectId})`);
    console.log("─────────────────────────────────────────");
    console.log("\n🔑 To log in locally, set your JWT_SECRET and use the Manus OAuth callback.");
    console.log("   Or manually set a session cookie with userId:", userId);

  } catch (error) {
    console.error("❌ Bootstrap failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

async function getUserId(connection: mysql.Connection, email: string): Promise<number> {
  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    `SELECT id FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0]?.id ?? 1;
}

bootstrap();
