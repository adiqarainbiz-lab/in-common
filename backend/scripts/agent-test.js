/**
 * In Common — AI Agent Pressure Test
 * Simulates N concurrent users each performing a realistic journey through the app.
 *
 * Prerequisites:
 *   1. Set TEST_SECRET in Render env vars (any random string)
 *   2. Run: TEST_SECRET=<your-secret> node scripts/agent-test.js [agents] [journeys]
 *
 * Each agent:
 *   login → browse businesses → open business detail → browse deals
 *         → check profile → read transaction history → check achievements
 */

const https = require('https');

const BASE         = 'https://in-common-1.onrender.com';
const TEST_SECRET  = process.env.TEST_SECRET;
const NUM_AGENTS   = parseInt(process.argv[2]) || 20;
const JOURNEYS     = parseInt(process.argv[3]) || 3;  // journeys per agent
const THINK_MS     = 300; // simulated "reading time" between steps

if (!TEST_SECRET) {
  console.error('❌  Set TEST_SECRET env var first: TEST_SECRET=mysecret node scripts/agent-test.js');
  process.exit(1);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function request(method, path, { body, token } = {}) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'in-common-1.onrender.com',
      path,
      method,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        ...(token          && { Authorization: `Bearer ${token}` }),
        ...(method !== 'GET' && { 'x-test-secret': TEST_SECRET }),
      },
    };
    // Always send test secret header for the agent-token endpoint
    if (path.includes('agent-token')) options.headers['x-test-secret'] = TEST_SECRET;

    const start = Date.now();
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const ms = Date.now() - start;
        try {
          resolve({ ok: res.statusCode < 400, status: res.statusCode, ms, body: JSON.parse(data) });
        } catch {
          resolve({ ok: res.statusCode < 400, status: res.statusCode, ms, body: null });
        }
      });
    });
    req.on('error', () => resolve({ ok: false, status: 0, ms: Date.now() - start, body: null }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 408, ms: Date.now() - start, body: null }); });
    if (payload) req.write(payload);
    req.end();
  });
}

const get  = (path, token) => request('GET',  path, { token });
const post = (path, body)  => request('POST', path, { body });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];

// ── Journey steps ─────────────────────────────────────────────────────────────
const STEPS = [
  'login',
  'browse_businesses',
  'view_business',
  'browse_deals',
  'view_profile',
  'read_history',
  'check_achievements',
];

async function runJourney(agentId, token) {
  const timings = {};

  // 1. Browse businesses
  await sleep(THINK_MS);
  const bizRes = await get('/api/businesses', token);
  timings.browse_businesses = { ms: bizRes.ms, ok: bizRes.ok };

  // 2. Open a random business detail
  await sleep(THINK_MS);
  const businesses = bizRes.ok && Array.isArray(bizRes.body) ? bizRes.body : [];
  if (businesses.length) {
    const biz = pick(businesses);
    const detailRes = await get(`/api/businesses/${biz.id}`, token);
    timings.view_business = { ms: detailRes.ms, ok: detailRes.ok };

    // Also load its offers
    await sleep(THINK_MS / 2);
    const bizOffersRes = await get(`/api/businesses/${biz.id}/offers`, token);
    timings.view_business_offers = { ms: bizOffersRes.ms, ok: bizOffersRes.ok };
  }

  // 3. Browse all deals
  await sleep(THINK_MS);
  const dealsRes = await get('/api/businesses/offers', token);
  timings.browse_deals = { ms: dealsRes.ms, ok: dealsRes.ok };

  // 4. View profile
  await sleep(THINK_MS);
  const profileRes = await get('/api/member/profile', token);
  timings.view_profile = { ms: profileRes.ms, ok: profileRes.ok };

  // 5. Read transaction history
  await sleep(THINK_MS);
  const historyRes = await get('/api/member/transactions', token);
  timings.read_history = { ms: historyRes.ms, ok: historyRes.ok };

  // 6. Check achievements
  await sleep(THINK_MS);
  const achRes = await get('/api/member/achievements', token);
  timings.check_achievements = { ms: achRes.ms, ok: achRes.ok };

  return timings;
}

// ── Agent ─────────────────────────────────────────────────────────────────────
async function runAgent(agentId) {
  const phone = `+9720000${String(agentId).padStart(5, '0')}`;

  // Login
  const loginRes = await post('/api/auth/dev/agent-token', { phone_number: phone, name: `Agent ${agentId}` });
  if (!loginRes.ok) return { agentId, error: `login failed (${loginRes.status})`, timings: {}, loginMs: loginRes.ms };

  const token = loginRes.body?.token;
  const allTimings = {};

  for (let j = 0; j < JOURNEYS; j++) {
    const t = await runJourney(agentId, token);
    for (const [step, result] of Object.entries(t)) {
      if (!allTimings[step]) allTimings[step] = [];
      allTimings[step].push(result);
    }
  }

  return { agentId, loginMs: loginRes.ms, timings: allTimings };
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function stats(results) {
  const times  = results.map(r => r.ms).sort((a, b) => a - b);
  const errors = results.filter(r => !r.ok).length;
  return {
    count:  results.length,
    errors,
    avg:    Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    p95:    times[Math.floor(times.length * 0.95)] ?? times[times.length - 1],
    max:    times[times.length - 1],
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🤖 In Common — Agent Simulation`);
  console.log(`   Agents:   ${NUM_AGENTS} concurrent users`);
  console.log(`   Journeys: ${JOURNEYS} per agent`);
  console.log(`   Flow:     login → businesses → business detail → deals → profile → history → achievements\n`);

  // Wake up Render
  process.stdout.write('⏳ Waking up Render... ');
  const wake = await get('/api/health');
  console.log(`${wake.ms}ms\n`);

  console.log(`🚀 Launching ${NUM_AGENTS} agents...\n`);
  const start = Date.now();

  const agentResults = await Promise.all(
    Array.from({ length: NUM_AGENTS }, (_, i) => runAgent(i + 1))
  );

  const totalMs = Date.now() - start;

  // Aggregate timings across all agents
  const aggregate = {};
  let loginTimes = [];
  let agentErrors = 0;

  for (const agent of agentResults) {
    if (agent.error) { agentErrors++; continue; }
    loginTimes.push({ ms: agent.loginMs, ok: true });
    for (const [step, results] of Object.entries(agent.timings)) {
      if (!aggregate[step]) aggregate[step] = [];
      aggregate[step].push(...results);
    }
  }

  // ── Report ──────────────────────────────────────────────────────────────────
  console.log('─'.repeat(78));
  console.log(
    'Step'.padEnd(26) +
    'Calls'.padStart(7) +
    'Errs'.padStart(6) +
    'Avg'.padStart(8) +
    'P95'.padStart(8) +
    'Max'.padStart(8)
  );
  console.log('─'.repeat(78));

  const loginStats = stats(loginTimes);
  console.log(
    'login'.padEnd(26) +
    String(loginStats.count).padStart(7) +
    String(loginStats.errors).padStart(6) +
    `${loginStats.avg}ms`.padStart(8) +
    `${loginStats.p95}ms`.padStart(8) +
    `${loginStats.max}ms`.padStart(8)
  );

  const STEP_ORDER = ['browse_businesses','view_business','view_business_offers','browse_deals','view_profile','read_history','check_achievements'];
  for (const step of STEP_ORDER) {
    if (!aggregate[step]) continue;
    const s = stats(aggregate[step]);
    console.log(
      step.padEnd(26) +
      String(s.count).padStart(7) +
      String(s.errors).padStart(6) +
      `${s.avg}ms`.padStart(8) +
      `${s.p95}ms`.padStart(8) +
      `${s.max}ms`.padStart(8)
    );
  }

  console.log('─'.repeat(78));

  const totalCalls = Object.values(aggregate).reduce((a, v) => a + v.length, 0) + loginTimes.length;
  const totalErrors = Object.values(aggregate).reduce((a, v) => a + v.filter(r => !r.ok).length, 0) + loginStats.errors;

  console.log(`\n📊 Summary`);
  console.log(`   Total wall time:  ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`   Total API calls:  ${totalCalls}`);
  console.log(`   Failed agents:    ${agentErrors}/${NUM_AGENTS}`);
  console.log(`   API errors:       ${totalErrors}/${totalCalls} (${((totalErrors/totalCalls)*100).toFixed(1)}%)`);

  const verdict = totalErrors === 0
    ? '✅ Perfect run — zero errors'
    : totalErrors / totalCalls < 0.02
      ? '🟡 Under 2% error rate — acceptable'
      : '🔴 Error rate too high';
  console.log(`   Verdict:          ${verdict}\n`);
})();
