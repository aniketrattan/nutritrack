require('dotenv').config();
const fs      = require('fs');
const path    = require('path');
const mysql   = require('mysql2/promise');

async function init() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    console.error('Missing required env vars');
    process.exit(1);
  }

  const adminConn = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS,
    multipleStatements: true
  });
  await adminConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  console.log(`Database “${DB_NAME}” ready`);
  await adminConn.end();

  const pool = mysql.createPool({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS,
    database: DB_NAME, waitForConnections: true, connectionLimit: 5
  });

  const ddl = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const stmts = ddl.split(/;\s*$/m).map(s => s.trim()).filter(Boolean);
  for (let sql of stmts) {
    await pool.execute(sql);
  }
  console.log(`All tables created/verified from schema.sql`);

  await pool.end();
}

init().catch(err => {
  console.error('Initialization failed:', err);
  process.exit(1);
});
