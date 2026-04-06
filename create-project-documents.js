const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: 'Amazon RDS',
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  }
  console.log('✓ Connected to database');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS project_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      projectId INT NOT NULL,
      fileName VARCHAR(255) NOT NULL,
      fileUrl VARCHAR(512) NOT NULL,
      fileKey VARCHAR(512) NOT NULL,
      fileType VARCHAR(50) NOT NULL,
      fileSize INT NOT NULL,
      category ENUM('blueprint','permit','contract','site_plan','other') DEFAULT 'other' NOT NULL,
      convertedOverlayUrl VARCHAR(512),
      linkedOverlayId INT,
      description TEXT,
      uploadedBy INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      KEY idx_projectId (projectId),
      KEY idx_category (category),
      KEY idx_createdAt (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  connection.query(createTableSQL, (err, results) => {
    if (err) {
      console.error('❌ Error creating table:', err.message);
      connection.end();
      process.exit(1);
    }
    console.log('✓ project_documents table created/verified');

    // Verify the table exists
    connection.query("SHOW TABLES LIKE 'project_documents'", (err, results) => {
      if (err) {
        console.error('❌ Error verifying table:', err.message);
      } else if (results.length > 0) {
        console.log('✓ Verification: project_documents table EXISTS');
        
        // Get table structure
        connection.query('DESCRIBE project_documents', (err, columns) => {
          if (err) {
            console.error('Error describing table:', err.message);
          } else {
            console.log('\n✓ Table structure:');
            columns.forEach(col => {
              console.log(`  - ${col.Field} (${col.Type})`);
            });
          }
          connection.end();
        });
      } else {
        console.log('❌ Verification failed: table not found');
        connection.end();
      }
    });
  });
});
