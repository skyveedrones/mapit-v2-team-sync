import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const conn = await createConnection(process.env.DATABASE_URL);

try {
  await conn.execute(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(64) NULL"
  );
  console.log("✅ clerk_user_id column added (or already exists)");
} catch (err) {
  if (err.code === "ER_DUP_FIELDNAME" || err.sqlMessage?.includes("Duplicate column")) {
    console.log("✅ clerk_user_id column already exists — skipping");
  } else {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
} finally {
  await conn.end();
}
