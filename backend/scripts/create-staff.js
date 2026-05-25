require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const businessName = process.argv[2];
const staffName    = process.argv[3];
const phone        = process.argv[4];
const password     = process.argv[5];
const role         = process.argv[6] || 'cashier';

if (!businessName || !staffName || !phone || !password) {
  console.error('Usage: node scripts/create-staff.js <business-name> <staff-name> <phone> <password> [role]');
  console.error('Example: node scripts/create-staff.js "Cafe Bastet" dialabastet +972534837039 bastet123 manager');
  process.exit(1);
}

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.DB_HOST, port: process.env.DB_PORT,
      database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    });

async function run() {
  const { rows: [biz] } = await pool.query(
    `SELECT id, name FROM businesses WHERE LOWER(name) LIKE LOWER($1) AND is_active = TRUE LIMIT 1`,
    [`%${businessName}%`],
  );
  if (!biz) { console.error(`No active business found matching "${businessName}"`); process.exit(1); }
  console.log(`Business: ${biz.name} (${biz.id})`);

  const hash = await bcrypt.hash(password, 12);
  const { rows: [staff] } = await pool.query(
    `INSERT INTO staff (business_id, name, phone_number, password_hash, role)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (phone_number) DO UPDATE SET name=$2, password_hash=$4, role=$5, business_id=$1
     RETURNING id, name, phone_number, role`,
    [biz.id, staffName, phone, hash, role],
  );
  console.log('Staff created:', staff);
  await pool.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
