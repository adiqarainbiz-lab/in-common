const router = require('express').Router();
const db     = require('../config/database');
const { authStaff } = require('../middleware/auth');
const { validateQRToken } = require('../services/qrService');
const { earnPoints, redeemPoints } = require('../services/pointsService');

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
      `SELECT t.id, t.type, t.amount_jd, t.points, t.description, t.created_at,
              m.name AS member_name, m.phone_number AS member_phone, m.tier
       FROM transactions t
       LEFT JOIN members m ON t.member_id = m.id
       WHERE t.business_id=$1 AND t.created_at BETWEEN $2 AND $3
       ORDER BY t.created_at DESC`,
      [req.staff.business_id, dayStart, dayEnd],
    );

    const summary = result.rows.reduce(
      (acc, t) => {
        if (t.type === 'earn')   acc.earned   += t.points;
        if (t.type === 'redeem') acc.redeemed += Math.abs(t.points);
        return acc;
      },
      { earned: 0, redeemed: 0 },
    );

    res.json({ date, transactions: result.rows, summary });
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
