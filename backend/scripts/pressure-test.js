/**
 * In Common — Pressure Test
 * Hits the live Render backend with concurrent requests across key endpoints.
 * Usage: node scripts/pressure-test.js [concurrency] [rounds]
 */

const https = require('https');
const BASE = 'https://in-common-1.onrender.com';

const CONCURRENCY = parseInt(process.argv[2]) || 20;
const ROUNDS      = parseInt(process.argv[3]) || 5;

// ── Endpoints to hit ──────────────────────────────────────────────────────────
const ENDPOINTS = [
  { label: 'Health',           path: '/api/health' },
  { label: 'Businesses (all)', path: '/api/businesses' },
  { label: 'Businesses (food)',path: '/api/businesses?category=food' },
  { label: 'Offers (all)',     path: '/api/businesses/offers' },
];

// ── HTTP helper ───────────────────────────────────────────────────────────────
function get(path) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.get(`${BASE}${path}`, { timeout: 15000 }, (res) => {
      res.resume(); // drain
      res.on('end', () => resolve({ ok: res.statusCode < 400, ms: Date.now() - start, status: res.statusCode }));
    });
    req.on('error', () => resolve({ ok: false, ms: Date.now() - start, status: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, ms: Date.now() - start, status: 408 }); });
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function stats(times) {
  const s = [...times].sort((a, b) => a - b);
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    min:  s[0],
    max:  s[s.length - 1],
    avg:  Math.round(sum / s.length),
    p95:  s[Math.floor(s.length * 0.95)],
    p99:  s[Math.floor(s.length * 0.99)],
  };
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function runEndpoint(endpoint) {
  const results = [];

  for (let round = 0; round < ROUNDS; round++) {
    const batch = Array.from({ length: CONCURRENCY }, () => get(endpoint.path));
    const res = await Promise.all(batch);
    results.push(...res);
    process.stdout.write('.');
  }

  console.log('');
  const times   = results.map(r => r.ms);
  const errors  = results.filter(r => !r.ok).length;
  const total   = results.length;
  const s       = stats(times);

  return { label: endpoint.label, total, errors, ...s };
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🔥 In Common Pressure Test`);
  console.log(`   Target:      ${BASE}`);
  console.log(`   Concurrency: ${CONCURRENCY} req/round`);
  console.log(`   Rounds:      ${ROUNDS}`);
  console.log(`   Total/ep:    ${CONCURRENCY * ROUNDS} requests\n`);

  // Wake up Render first (free tier may be sleeping)
  process.stdout.write('⏳ Waking up Render... ');
  const wake = await get('/api/health');
  console.log(`${wake.ms}ms (${wake.status})\n`);

  const rows = [];

  for (const ep of ENDPOINTS) {
    process.stdout.write(`📡 ${ep.label.padEnd(22)}`);
    const row = await runEndpoint(ep);
    rows.push(row);
  }

  // ── Report ──────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(80));
  console.log(
    'Endpoint'.padEnd(24) +
    'Reqs'.padStart(6) +
    'Errs'.padStart(6) +
    'Min'.padStart(8) +
    'Avg'.padStart(8) +
    'P95'.padStart(8) +
    'P99'.padStart(8) +
    'Max'.padStart(8)
  );
  console.log('─'.repeat(80));

  for (const r of rows) {
    const errPct = ((r.errors / r.total) * 100).toFixed(0);
    console.log(
      r.label.padEnd(24) +
      String(r.total).padStart(6) +
      `${r.errors}(${errPct}%)`.padStart(8) +
      `${r.min}ms`.padStart(8) +
      `${r.avg}ms`.padStart(8) +
      `${r.p95}ms`.padStart(8) +
      `${r.p99}ms`.padStart(8) +
      `${r.max}ms`.padStart(8)
    );
  }

  console.log('─'.repeat(80));

  const allErrors = rows.reduce((a, r) => a + r.errors, 0);
  const allReqs   = rows.reduce((a, r) => a + r.total, 0);
  const verdict   = allErrors === 0 ? '✅ All requests succeeded' : `⚠️  ${allErrors}/${allReqs} requests failed`;
  console.log(`\n${verdict}\n`);
})();
