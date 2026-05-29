/**
 * In Common — Geocode Businesses
 * Fetches lat/lng from Google Maps Geocoding API for every business
 * that currently has null coordinates, then updates the database.
 *
 * Usage:
 *   GOOGLE_API_KEY=<key> node scripts/geocode-businesses.js
 *
 * Get a free API key at: https://console.cloud.google.com/
 * Enable: Geocoding API (under Maps section)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const https = require('https');
const { Pool } = require('pg');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error('❌  Set GOOGLE_API_KEY env var: GOOGLE_API_KEY=xxx node scripts/geocode-businesses.js');
  process.exit(1);
}

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.DB_HOST, port: process.env.DB_PORT,
      database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    });

// ── Geocode via Google Maps Geocoding API ──────────────────────────────────────
function geocode(address) {
  const query = encodeURIComponent(`${address}, Jerusalem`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GOOGLE_API_KEY}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results.length > 0) {
            const { lat, lng } = json.results[0].geometry.location;
            resolve({ lat, lng, formatted: json.results[0].formatted_address });
          } else {
            resolve(null); // not found
          }
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n📍 In Common — Business Geocoder');
  console.log('   Source: Google Maps Geocoding API\n');

  // Fetch all businesses (or just those missing coordinates)
  const { rows: businesses } = await pool.query(
    `SELECT id, name, address FROM businesses WHERE address IS NOT NULL AND address != '' ORDER BY name`
  );

  console.log(`Found ${businesses.length} businesses to geocode\n`);

  let updated = 0, skipped = 0, failed = 0;

  for (const biz of businesses) {
    process.stdout.write(`📍 ${biz.name.padEnd(35)}`);

    if (!biz.address || biz.address.trim() === '') {
      console.log('⚠️  No address — skipped');
      skipped++;
      continue;
    }

    try {
      const result = await geocode(biz.address);

      if (!result) {
        console.log('❌  Not found');
        failed++;
        continue;
      }

      await pool.query(
        `UPDATE businesses SET lat = $1, lng = $2 WHERE id = $3`,
        [result.lat, result.lng, biz.id]
      );

      console.log(`✅  ${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}  (${result.formatted})`);
      updated++;

      // Respect Google's rate limit — 50 req/s free tier, be safe at 5/s
      await sleep(200);
    } catch (e) {
      console.log(`❌  Error: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅ Updated:  ${updated}`);
  console.log(`⚠️  Skipped:  ${skipped}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`─────────────────────────────────\n`);

  await pool.end();
})();
