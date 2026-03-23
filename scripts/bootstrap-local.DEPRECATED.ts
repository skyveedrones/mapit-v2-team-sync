/**
 * ⚠️  DEPRECATED: bootstrap-local.DEPRECATED.ts
 *
 * ⛔ DO NOT USE THIS SCRIPT IN PRODUCTION ⛔
 *
 * This script is DEPRECATED and should NEVER be executed against the production database.
 * It was used for local development setup only and has been renamed to prevent accidental use.
 *
 * PRODUCTION DATA PROTECTION:
 * - All production data has been restored and verified
 * - This script WILL overwrite existing rows if executed
 * - Running this script will corrupt your production database
 * - If you need to reset local development data, use a separate development database
 *
 * HISTORY:
 * - This script was responsible for creating 'Project 1' and test data
 * - It has been disabled to protect production integrity
 * - All existing projects, clients, and media are now locked down
 * - Renamed from bootstrap-local.ts to bootstrap-local.DEPRECATED.ts on March 22, 2026
 *
 * WHAT THIS SCRIPT DOES (for reference only):
 * Seeds a fresh local TiDB/MySQL database with:
 *   - A SkyVee organization
 *   - A local dev user (Clay Bechtol)
 *   - A Test Project 1
 *
 * ⚠️  ORIGINAL USAGE (DO NOT USE):
 *   npx tsx scripts/bootstrap-local.DEPRECATED.ts
 *
 * FOR LOCAL DEVELOPMENT:
 * If you need to set up a fresh local development database:
 * 1. Create a separate local MySQL/TiDB instance
 * 2. Set DATABASE_URL to point to your local instance
 * 3. Run `pnpm db:push` to create tables
 * 4. Then you can use this script (at your own risk)
 *
 * Prerequisites (if you must use this):
 *   1. Create a .env file in the project root with:
 *
 *      DATABASE_URL=mysql://root:password@localhost:4000/dronemapp
 *
 *      For TiDB Cloud:
 *      DATABASE_URL=mysql://user:password@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/dronemapp?ssl={"rejectUnauthorized":true}
 *
 *      For local MySQL:
 *      DATABASE_URL=mysql://root:password@127.0.0.1:3306/dronemapp
 *
 *   2. Run `pnpm db:push` first to create all tables.
 *   3. Then run this script: `npx tsx scripts/bootstrap-local.DEPRECATED.ts`
 */

import * as dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set.");
  console.error("");
  console.error("   Create a .env file in the project root with:");
  console.error("   DATABASE_URL=mysql://root:password@localhost:4000/dronemapp");
  console.error("");
  console.error("   For TiDB Cloud:");
  console.error('   DATABASE_URL=mysql://user:pass@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/dronemapp?ssl={"rejectUnauthorized":true}');
  process.exit(1);
}

async function bootstrap() {
  console.log("⚠️  WARNING: This script is DEPRECATED and should only be used for LOCAL DEVELOPMENT");
  console.log("🚀 Starting local database bootstrap...");
  console.log(`   Connecting to: ${DATABASE_URL!.replace(/:([^:@]+)@/, ":****@")}`);

  let connection: mysql.Connection;
  try {
    connection = await mysql.createConnection(DATABASE_URL as string);
    console.log("   ✅ Database connection established\n");
  } catch (err) {
    console.error("❌ Could not connect to database:", err);
    console.error("");
    console.error("   Check your DATABASE_URL and ensure the database server is running.");
    process.exit(1);
  }

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
         orgRole        = VALUES(orgRole),
         updatedAt      = NOW()`,
      [
        "local-dev-open-id",            // openId
        "Clay Bechtol",                  // name
        "clay@skyveedrones.com",         // email
        "local",                         // loginMethod
        "webmaster",                     // role
        "SkyVee Aerial Drone Services",  // organization
        "Edward Clay Bechtol",           // defaultDronePilot
        "5205636",                       // defaultFaaLicenseNumber
        "LAANC-2025-001",                // defaultLaancAuthNumber
        "enterprise",                    // subscriptionTier
        "active",                        // subscriptionStatus
        "annual",                        // billingPeriod
        "no",                            // cancelAtPeriodEnd
        orgId,                           // organizationId
        "PROVIDER",                      // orgRole
      ]
    );

    const userId =
      userResult.insertId > 0
        ? userResult.insertId
        : await getUserId(connection, "clay@skyveedrones.com");

    // If user already existed, ensure organizationId is linked
    if (userResult.insertId === 0) {
      await connection.execute(
        `UPDATE users SET organizationId = ?, orgRole = 'PROVIDER' WHERE email = ?`,
        [orgId, "clay@skyveedrones.com"]
      );
      console.log(`   ✅ Updated existing user's organizationId to ${orgId}`);
    }
    console.log(`   ✅ User ID: ${userId}`);

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
    console.log("─────────────────────────────────────────────────────");
    console.log(`   Organization : SkyVee Aerial Drone Services (ID: ${orgId})`);
    console.log(`   User         : Clay Bechtol (ID: ${userId})`);
    console.log(`   Project      : Test Project 1 (ID: ${projectId})`);
    console.log("─────────────────────────────────────────────────────");
    console.log("\n📌 Next steps:");
    console.log("   1. Run `pnpm dev` to start the dev server");
    console.log("   2. Visit http://localhost:3000");
    console.log("   3. The app will bypass onboarding in development mode");
    console.log(`   4. Your user ID is ${userId} — use this for manual session setup if needed`);
    console.log("\n🔑 For OAuth login locally, ensure these .env vars are set:");
    console.log("   VITE_OAUTH_PORTAL_URL=https://auth.manus.im");
    console.log("   VITE_APP_ID=<your-app-id>");
    console.log("   JWT_SECRET=<any-random-string-for-local-dev>");

  } catch (error) {
    console.error("❌ Bootstrap failed:", error);
    process.exit(1);
  } finally {
    await connection!.end();
  }
}

async function getUserId(connection: mysql.Connection, email: string): Promise<number> {
  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    `SELECT id FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  if (!rows[0]?.id) {
    throw new Error(`User with email ${email} not found after insert.`);
  }
  return rows[0].id;
}

bootstrap();
