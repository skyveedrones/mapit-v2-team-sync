import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const alterStatements = [
  // Add issue tracking columns to media table
  `ALTER TABLE media 
    ADD COLUMN IF NOT EXISTS issueReportType ENUM('none','corrective','punchlist') NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS issueStatus ENUM('open','corrected') NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS issueWorkflowAction ENUM('none','assign','review','rejected','accepted') NOT NULL DEFAULT 'none'`,
  // Add project_mgr to users role enum
  `ALTER TABLE users MODIFY COLUMN role ENUM('user','admin','webmaster','client','project_mgr') NOT NULL DEFAULT 'user'`,
];

for (const sql of alterStatements) {
  try {
    await conn.execute(sql);
    console.log('✓', sql.slice(0, 60));
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.message?.includes('Duplicate column')) {
      console.log('⚠ Already exists, skipping:', sql.slice(0, 60));
    } else {
      console.error('✗ Error:', err.message);
      throw err;
    }
  }
}

await conn.end();
console.log('Migration complete.');
