const router = require('express').Router();
const db     = require('../config/database');
const { authMember } = require('../middleware/auth');
const { generateQRToken } = require('../services/qrService');

// All routes require member auth
router.use(authMember);

// GET /api/member/profile
router.get('/profile', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, phone_number, name, points_balance, tier, member_code, last_activity_at, created_at
       FROM members WHERE id=$1`,
      [req.member.sub],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

// PATCH /api/member/push-token
router.patch('/push-token', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });
    await db.query('UPDATE members SET push_token=$1 WHERE id=$2', [token, req.member.sub]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// PATCH /api/member/profile
router.patch('/profile', async (req, res, next) => {
  try {
    const { name, phone_number } = req.body;
    if (!name && !phone_number) return res.status(400).json({ error: 'Provide name or phone_number to update' });

    const existing = await db.query('SELECT * FROM members WHERE id=$1', [req.member.sub]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Member not found' });
    const m = existing.rows[0];

    if (phone_number && phone_number !== m.phone_number) {
      const taken = await db.query(
        'SELECT id FROM members WHERE phone_number=$1 AND id!=$2',
        [phone_number, req.member.sub],
      );
      if (taken.rows.length) return res.status(409).json({ error: 'Phone number already in use' });
    }

    const result = await db.query(
      `UPDATE members SET name=$1, phone_number=$2
       WHERE id=$3
       RETURNING id, phone_number, name, points_balance, tier, member_code, last_activity_at, created_at`,
      [name ?? m.name, phone_number ?? m.phone_number, req.member.sub],
    );
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

// GET /api/member/qr-token — rotating QR, valid ~90s
router.get('/qr-token', async (req, res, next) => {
  try {
    const token = generateQRToken(req.member.sub);
    const expiresAt = new Date(Date.now() + 90 * 1000);
    res.json({ token, expires_at: expiresAt.toISOString(), refresh_in: 60 });
  } catch (e) { next(e); }
});

// GET /api/member/transactions?page=1&limit=20
router.get('/transactions', async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT t.id, t.type, t.amount_jd, t.points, t.description, t.created_at,
              b.name AS business_name, b.category AS business_category
       FROM transactions t
       LEFT JOIN businesses b ON t.business_id = b.id
       WHERE t.member_id=$1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.member.sub, limit, offset],
    );

    const countRes = await db.query(
      'SELECT COUNT(*) FROM transactions WHERE member_id=$1',
      [req.member.sub],
    );

    res.json({
      transactions: result.rows,
      total: parseInt(countRes.rows[0].count),
      page,
      limit,
    });
  } catch (e) { next(e); }
});

// GET /api/member/businesses?category=food
router.get('/businesses', async (req, res, next) => {
  try {
    const { category } = req.query;
    const params = [];
    let where = 'WHERE is_active=TRUE';
    if (category) {
      params.push(category);
      where += ` AND category=$${params.length}`;
    }

    const result = await db.query(
      `SELECT id, name, category, address, description, logo_url, cover_url, points_rate
       FROM businesses ${where} ORDER BY name`,
      params,
    );
    res.json(result.rows);
  } catch (e) { next(e); }
});

module.exports = router;
