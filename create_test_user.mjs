import mysql from 'mysql2/promise';

// Parse DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);

if (!match) {
  console.error('Failed to parse DATABASE_URL');
  process.exit(1);
}

const [, user, password, host, port, database] = match;

const connection = await mysql.createConnection({
  host,
  port: parseInt(port),
  user,
  password,
  database,
  ssl: 'amazon',
});

// Create a test user with unique openId
const testOpenId = `test_user_${Date.now()}`;
const testEmail = `e2e.test.${Date.now()}@mapit.test`;

try {
  await connection.execute(
    `INSERT INTO users (openId, name, email, loginMethod, role, subscriptionTier, subscriptionStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [testOpenId, 'E2E Test User', testEmail, 'test', 'user', 'pilot', 'trialing']
  );
  console.log(`✓ Test user created successfully`);
  console.log(`  OpenID: ${testOpenId}`);
  console.log(`  Email: ${testEmail}`);
  console.log(`  Tier: pilot (PILOT plan)`);
} catch (error) {
  console.error('Error creating test user:', error.message);
} finally {
  await connection.end();
}
