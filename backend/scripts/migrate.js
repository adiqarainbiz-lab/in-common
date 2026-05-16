require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.DB_HOST, port: process.env.DB_PORT,
      database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    });

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      ran_at   TIMESTAMP DEFAULT NOW()
    )
  `);

  const files = ['001_initial.sql', '002_seed.sql'];
  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM _migrations WHERE filename=$1', [file]);
    if (rows.length) {
      console.log(`Skipping ${file} (already ran)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8');
    console.log(`Running ${file}…`);
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
    console.log(`✓ ${file}`);
  }

  await pool.end();
  console.log('Migration complete.');
}

run().catch((e) => { console.error(e); process.exit(1); });
