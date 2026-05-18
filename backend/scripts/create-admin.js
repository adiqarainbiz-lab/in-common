require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const email    = process.argv[2];
const password = process.argv[3];
const name     = process.argv[4] || 'Admin';

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.js <email> <password> [name]');
  process.exit(1);
}

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.DB_HOST, port: process.env.DB_PORT,
      database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    });

async function run() {
  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO admins (email, password_hash, name) VALUES ($1,$2,$3)
     ON CONFLICT (email) DO UPDATE SET password_hash=$2, name=$3
     RETURNING id, email, name`,
    [email.toLowerCase(), hash, name],
  );
  console.log('Admin upserted:', result.rows[0]);
  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
