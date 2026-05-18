const router = require('express').Router();
const db     = require('../config/database');
const { authStaff } = require('../middleware/auth');
const { validateQRToken } = require('../services/qrService');
const { earnPoints, redeemPoints, reverseTransaction } = require('../services/pointsService');

router.use(authStaff);

// POST /api/staff/scan — validate QR, return member info
router.post('/scan', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });

    let memberId;
    try {
      memberId = validateQRToken(token);
    } catch (e) {
      return res.status(400).json({ error: 'QR code invalid or expired. Ask member to refresh.' });
    }

    const result = await db.query(
      `SELECT id, name, phone_number, points_balance, tier, last_activity_at
       FROM members WHERE id=$1`,
      [memberId],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });

    res.json({ member: result.rows[0] });
  } catch (e) { next(e); }
});

// POST /api/staff/earn — award points directly
router.post('/earn', async (req, res, next) => {
  try {
    const { member_id, points, description } = req.body;
    if (!member_id || !points) return res.status(400).json({ error: 'member_id and points required' });

    const result = await earnPoints(
      member_id,
      req.staff.business_id,
      req.staff.sub,
      Math.floor(Number(points)),
      description,
    );
    res.json(result);
  } catch (e) { next(e); }
});

// POST /api/staff/redeem — redeem points
router.post('/redeem', async (req, res, next) => {
  try {
    const { member_id, points } = req.body;
    if (!member_id || !points) return res.status(400).json({ error: 'member_id and points required' });

    const result = await redeemPoints(
      member_id,
      req.staff.business_id,
      req.staff.sub,
      Math.floor(Number(points)),
    );
    res.json(result);
  } catch (e) { next(e); }
});

// GET /api/staff/transactions?date=2026-05-11
router.get('/transactions', async (req, res, next) => {
  try {
    const date    = req.query.date || new Date().toISOString().slice(0, 10);
    const dayStart = `${date} 00:00:00`;
    const dayEnd   = `${date} 23:59:59`;

    const result = await db.query(
      `SELECT t.id, t.type, t.points, t.description, t.created_at, t.reversal_of,
              EXISTS(SELECT 1 FROM transactions r WHERE r.reversal_of = t.id) AS is_reversed,
              m.name AS member_name, m.phone_number AS member_phone, m.tier
       FROM transactions t
       LEFT JOIN members m ON t.member_id = m.id
       WHERE t.business_id=$1 AND t.created_at BETWEEN $2 AND $3
       ORDER BY t.created_at DESC`,
      [req.staff.business_id, dayStart, dayEnd],
    );

    const summary = result.rows.reduce(
      (acc, t) => {
        if (t.type === 'earn'   && !t.is_reversed) acc.earned   += t.points;
        if (t.type === 'redeem' && !t.is_reversed) acc.redeemed += Math.abs(t.points);
        return acc;
      },
      { earned: 0, redeemed: 0 },
    );

    res.json({ date, transactions: result.rows, summary });
  } catch (e) { next(e); }
});

// GET /api/staff/analytics
router.get('/analytics', async (req, res, next) => {
  try {
    const biz = req.staff.business_id;

    const [summaryRes, dailyRes, topRes] = await Promise.all([
      db.query(`
        SELECT
          COALESCE(SUM(t.points)      FILTER (WHERE t.type='earn'   AND t.created_at >= DATE_TRUNC('week',  NOW())), 0) AS week_earned,
          COALESCE(SUM(ABS(t.points)) FILTER (WHERE t.type='redeem' AND t.created_at >= DATE_TRUNC('week',  NOW())), 0) AS week_redeemed,
          COUNT(*)                    FILTER (WHERE t.type IN ('earn','redeem') AND t.created_at >= DATE_TRUNC('week',  NOW()))  AS week_transactions,
          COUNT(DISTINCT t.member_id) FILTER (WHERE t.type IN ('earn','redeem') AND t.created_at >= DATE_TRUNC('week',  NOW()))  AS week_members,
          COALESCE(SUM(t.points)      FILTER (WHERE t.type='earn'   AND t.created_at >= DATE_TRUNC('month', NOW())), 0) AS month_earned,
          COALESCE(SUM(ABS(t.points)) FILTER (WHERE t.type='redeem' AND t.created_at >= DATE_TRUNC('month', NOW())), 0) AS month_redeemed,
          COUNT(*)                    FILTER (WHERE t.type IN ('earn','redeem') AND t.created_at >= DATE_TRUNC('month', NOW())) AS month_transactions,
          COUNT(DISTINCT t.member_id) FILTER (WHERE t.type IN ('earn','redeem') AND t.created_at >= DATE_TRUNC('month', NOW())) AS month_members
        FROM transactions t
        LEFT JOIN transactions rev ON rev.reversal_of = t.id
        WHERE t.business_id=$1 AND rev.id IS NULL
      `, [biz]),

      db.query(`
        SELECT DATE(t.created_at) AS date,
               COALESCE(SUM(t.points)      FILTER (WHERE t.type='earn'),   0) AS earned,
               COALESCE(SUM(ABS(t.points)) FILTER (WHERE t.type='redeem'), 0) AS redeemed,
               COUNT(*)                    FILTER (WHERE t.type IN ('earn','redeem'))  AS transactions
        FROM transactions t
        LEFT JOIN transactions rev ON rev.reversal_of = t.id
        WHERE t.business_id=$1 AND rev.id IS NULL
          AND t.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(t.created_at)
        ORDER BY date
      `, [biz]),

      db.query(`
        SELECT m.name, m.tier,
               SUM(t.points) AS points_earned,
               COUNT(*)      AS visit_count
        FROM transactions t
        JOIN members m ON t.member_id = m.id
        LEFT JOIN transactions rev ON rev.reversal_of = t.id
        WHERE t.business_id=$1 AND t.type='earn' AND rev.id IS NULL
          AND t.created_at >= DATE_TRUNC('month', NOW())
        GROUP BY m.id, m.name, m.tier
        ORDER BY points_earned DESC
        LIMIT 5
      `, [biz]),
    ]);

    // Fill gaps so client always gets 7 days
    const daily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = dailyRes.rows.find(r => r.date.toISOString().slice(0, 10) === key);
      daily.push({
        date: key,
        earned:       row ? parseInt(row.earned)       : 0,
        redeemed:     row ? parseInt(row.redeemed)     : 0,
        transactions: row ? parseInt(row.transactions) : 0,
      });
    }

    const s = summaryRes.rows[0];
    res.json({
      week:  { earned: +s.week_earned,  redeemed: +s.week_redeemed,  transactions: +s.week_transactions,  members: +s.week_members  },
      month: { earned: +s.month_earned, redeemed: +s.month_redeemed, transactions: +s.month_transactions, members: +s.month_members },
      daily,
      top_members: topRes.rows.map(r => ({ ...r, points_earned: +r.points_earned, visit_count: +r.visit_count })),
    });
  } catch (e) { next(e); }
});

// GET /api/staff/search?q=
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ members: [] });

    const result = await db.query(
      `SELECT id, name, phone_number, points_balance, tier, member_code, last_activity_at
       FROM members
       WHERE name ILIKE $1 OR phone_number ILIKE $1
       ORDER BY name
       LIMIT 20`,
      [`%${q}%`],
    );
    res.json({ members: result.rows });
  } catch (e) { next(e); }
});

// POST /api/staff/transactions/:id/reverse
router.post('/transactions/:id/reverse', async (req, res, next) => {
  try {
    const result = await reverseTransaction(req.params.id, req.staff.sub, req.staff.business_id);
    res.json(result);
  } catch (e) { next(e); }
});

// GET /api/staff/member/:id — look up member directly (for manual entry)
router.get('/member/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, phone_number, points_balance, tier, last_activity_at
       FROM members WHERE id=$1`,
      [req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
    res.json({ member: result.rows[0] });
  } catch (e) { next(e); }
});

// POST /api/staff/lookup-code — manual fallback when QR scan fails
router.post('/lookup-code', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const result = await db.query(
      `SELECT id, name, phone_number, points_balance, tier, member_code, last_activity_at
       FROM members WHERE member_code=$1`,
      [String(code).trim()],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'No member found with that code' });
    res.json({ member: result.rows[0] });
  } catch (e) { next(e); }
});

module.exports = router;
