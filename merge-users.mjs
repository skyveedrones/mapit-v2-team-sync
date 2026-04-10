/**
 * Merge User ID 19680001 into User ID 1
 * - Reassign all data from 19680001 → 1
 * - Update User ID 1 credentials to clay@skyveedrones.com / Google / openId Xr6YqEAkBXyf8T3pdNzrMW
 * - Delete User ID 19680001
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const FROM_ID = 19680001;
const TO_ID = 1;
const NEW_OPEN_ID = 'Xr6YqEAkBXyf8T3pdNzrMW';
const NEW_EMAIL = 'clay@skyveedrones.com';
const NEW_LOGIN_METHOD = 'google';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  console.log(`\nMerging User ${FROM_ID} → User ${TO_ID}\n`);

  // 1. Show current state of both users
  const [users] = await conn.execute(
    `SELECT id, openId, name, email, loginMethod, role, organizationId FROM users WHERE id IN (?, ?)`,
    [FROM_ID, TO_ID]
  );
  console.log('Current users:');
  users.forEach(u => console.log(` - ID ${u.id}: ${u.email} (${u.loginMethod}) openId=${u.openId}`));

  // 2. CRITICAL: Set a temp openId on FROM_ID first to avoid unique key conflict
  // (openId is NOT NULL + UNIQUE, so we can't set NULL — use a temp placeholder)
  const tempOpenId = `__merged_${FROM_ID}_${Date.now()}`;
  await conn.execute(`UPDATE users SET openId = ? WHERE id = ?`, [tempOpenId, FROM_ID]);
  console.log(`\n✓ Set temp openId on User ${FROM_ID} to free up the real openId`);

  // 3. Reassign projects (userId column)
  const [projResult] = await conn.execute(
    `UPDATE projects SET userId = ? WHERE userId = ?`, [TO_ID, FROM_ID]
  );
  console.log(`✓ projects: ${projResult.affectedRows} rows reassigned`);

  // 4. Reassign project_members (userId column)
  const [pmResult] = await conn.execute(
    `UPDATE project_members SET userId = ? WHERE userId = ?`, [TO_ID, FROM_ID]
  );
  console.log(`✓ project_members: ${pmResult.affectedRows} rows reassigned`);

  // 5. Reassign media (userId column)
  const [mediaResult] = await conn.execute(
    `UPDATE media SET userId = ? WHERE userId = ?`, [TO_ID, FROM_ID]
  );
  console.log(`✓ media: ${mediaResult.affectedRows} rows reassigned`);

  // 6. Reassign flights (userId column)
  const [flightResult] = await conn.execute(
    `UPDATE flights SET userId = ? WHERE userId = ?`, [TO_ID, FROM_ID]
  );
  console.log(`✓ flights: ${flightResult.affectedRows} rows reassigned`);

  // 7. Reassign clients (ownerId column)
  const [clientResult] = await conn.execute(
    `UPDATE clients SET ownerId = ? WHERE ownerId = ?`, [TO_ID, FROM_ID]
  );
  console.log(`✓ clients: ${clientResult.affectedRows} rows reassigned`);

  // 8. project_overlays has no userId column — linked via projectId which is already reassigned
  console.log(`✓ project_overlays: linked via projectId (already reassigned)`);

  // 9. project_documents has no userId column — linked via projectId which is already reassigned
  console.log(`✓ project_documents: linked via projectId (already reassigned)`);

  // 10. Verify organization 300001 — ensure TO_ID is the owner
  const [orgCheck] = await conn.execute(
    `SELECT id, name FROM organizations WHERE id = 300001`
  );
  if (orgCheck.length > 0) {
    console.log(`\n✓ Organization 300001 (${orgCheck[0].name}) exists`);
  }

  // 11. Update User ID 1 credentials (openId is now free since we cleared it above)
  await conn.execute(
    `UPDATE users SET 
      openId = ?,
      email = ?,
      loginMethod = ?,
      name = 'Clay Bechtol',
      role = 'webmaster',
      organizationId = 300001,
      updatedAt = NOW()
    WHERE id = ?`,
    [NEW_OPEN_ID, NEW_EMAIL, NEW_LOGIN_METHOD, TO_ID]
  );
  console.log(`\n✓ User ${TO_ID} credentials updated:`);
  console.log(`   openId = ${NEW_OPEN_ID}`);
  console.log(`   email  = ${NEW_EMAIL}`);
  console.log(`   method = ${NEW_LOGIN_METHOD}`);
  console.log(`   org    = 300001`);

  // 12. Delete User ID 19680001
  const [delResult] = await conn.execute(
    `DELETE FROM users WHERE id = ?`, [FROM_ID]
  );
  console.log(`\n✓ User ${FROM_ID} deleted (${delResult.affectedRows} row)`);

  // 13. Final verification
  const [finalUser] = await conn.execute(
    `SELECT id, openId, name, email, loginMethod, role, organizationId FROM users WHERE id = ?`,
    [TO_ID]
  );
  console.log('\nFinal state of User ID 1:');
  console.log(finalUser[0]);

  console.log('\n✅ Merge complete! Log in with clay@skyveedrones.com via Google.');

} catch (err) {
  console.error('\n❌ Merge failed:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
