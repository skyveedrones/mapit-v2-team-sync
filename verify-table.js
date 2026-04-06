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
    console.error('Connection error:', err.message);
    process.exit(1);
  }

  connection.query('SHOW TABLES LIKE "project_documents"', (err, results) => {
    if (err) {
      console.error('Query error:', err.message);
      connection.end();
      process.exit(1);
    }

    if (results.length > 0) {
      console.log('✓ project_documents table EXISTS');
      
      // Get table structure
      connection.query('DESCRIBE project_documents', (err, columns) => {
        if (err) {
          console.error('Error describing table:', err.message);
        } else {
          console.log('\nTable structure:');
          columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
          });
        }
        connection.end();
      });
    } else {
      console.log('✗ project_documents table DOES NOT EXIST');
      connection.end();
    }
  });
});
