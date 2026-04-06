import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: 'Amazon RDS',
});

async function checkAndCreateTable() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Checking existing tables...');
    const [tables] = await connection.query(`SHOW TABLES LIKE 'project_documents'`);
    
    if (tables.length > 0) {
      console.log('✓ project_documents table already exists');
      const [columns] = await connection.query(`DESCRIBE project_documents`);
      console.log('Columns:', columns.map(c => c.Field).join(', '));
    } else {
      console.log('✗ project_documents table does NOT exist, creating...');
      
      const sql = `
        CREATE TABLE project_documents (
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
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await connection.release();
    await pool.end();
  }
}

checkAndCreateTable().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
