const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: 'Amazon RDS',
  });

  try {
    const connection = await pool.getConnection();
    
    console.log('Creating project_documents table...');
    const sql = `
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
    
    await connection.execute(sql);
    console.log('✓ project_documents table created successfully');
    
    connection.release();
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
