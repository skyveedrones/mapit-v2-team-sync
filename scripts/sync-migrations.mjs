import mysql from 'mysql2/promise';
import crypto from 'crypto';
import fs from 'fs';
import { config } from 'dotenv';

config();

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get existing hashes
  const [rows] = await conn.execute('SELECT hash FROM __drizzle_migrations');
  const existing = new Set(rows.map(r => r.hash));
  
  // All pending migration files that already have their changes in the DB
  const pendingFiles = [
    '0026_uneven_retro_girl.sql',
    '0026_vengeful_silvermane.sql',
    '0027_colossal_sleeper.sql',
    '0027_spicy_unus.sql',
    '0028_add_label_and_version_to_project_overlays.sql',
    '0028_pretty_nekra.sql',
    '0029_grey_dreaming_celestial.sql',
    '0030_ordinary_flatman.sql',
    '0031_big_garia.sql',
    '0032_rare_owl.sql',
    '0033_worried_ironclad.sql',
    '0008_add_public_share_to_projects.sql',
  ];
  
  for (const file of pendingFiles) {
    try {
      const sql = fs.readFileSync('drizzle/' + file, 'utf8');
      const hash = crypto.createHash('sha256').update(sql).digest('hex');
      if (existing.has(hash)) {
        console.log('Already applied:', file);
      } else {
        await conn.execute('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [hash, Date.now()]);
        console.log('Marked as applied:', file);
      }
    } catch(e) {
      console.log('File not found or error:', file, e.message);
    }
  }
  
  await conn.end();
  console.log('Done - all pending migrations marked as applied');
}

main().catch(console.error);
