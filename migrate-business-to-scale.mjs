import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('[Migration] Starting business → scale tier conversion...');
    
    // Step 1: Update existing users with 'business' tier to 'scale'
    const updateResult = await connection.execute(
      `UPDATE users SET subscriptionTier = 'scale' WHERE subscriptionTier = 'business'`
    );
    console.log(`[Migration] Updated ${updateResult[0].affectedRows} users from 'business' to 'scale' tier`);
    
    // Step 2: Verify the update
    const [rows] = await connection.execute(
      `SELECT COUNT(*) as count FROM users WHERE subscriptionTier = 'scale'`
    );
    console.log(`[Migration] Total users on 'scale' tier: ${rows[0].count}`);
    
    console.log('[Migration] ✅ Migration completed successfully');
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
