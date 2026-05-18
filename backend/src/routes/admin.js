const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/database');
const { authAdmin } = require('../middleware/auth');
const { reverseTransaction } = require('../services/pointsService');

// ─── Auth ─────────────────────────────────────────────────────────────────────

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const result = await db.query('SELECT * FROM admins WHERE email=$1', [email.toLowerCase()]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: admin.id, type: 'admin', email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '12h' },
    );

    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (e) { next(e); }
});

// ─── Businesses ───────────────────────────────────────────────────────────────

router.get('/businesses', authAdmin, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT b.*,
              COUNT(s.id) FILTER (WHERE s.is_active) AS active_staff_count
       FROM businesses b
       LEFT JOIN staff s ON s.business_id = b.id
       GROUP BY b.id
       ORDER BY b.name`,
    );
    res.json(result.rows);
  } catch (e) { next(e); }
});

router.post('/businesses', authAdmin, async (req, res, next) => {
  try {
    const { name, category, address, description, logo_url, points_rate } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required' });

    const result = await db.query(
      `INSERT INTO businesses (name, category, address, description, logo_url, points_rate)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, category, address || null, description || null, logo_url || null, points_rate || 10],
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { next(e); }
});

router.patch('/businesses/:id', authAdmin, async (req, res, next) => {
  try {
    const existing = await db.query('SELECT * FROM businesses WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Business not found' });

    const b = existing.rows[0];
    const { name, category, address, description, logo_url, points_rate, is_active } = req.body;

    const result = await db.query(
      `UPDATE businesses
       SET name=$1, category=$2, address=$3, description=$4,
           logo_url=$5, points_rate=$6, is_active=$7
       WHERE id=$8 RETURNING *`,
      [
        name        ?? b.name,
        category    ?? b.category,
        address     ?? b.address,
        description ?? b.description,
        logo_url    ?? b.logo_url,
        points_rate ?? b.points_rate,
        is_active   ?? b.is_active,
        req.params.id,
      ],
    );
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

router.delete('/businesses/:id', authAdmin, async (req, res, next) => {
  try {
    const result = await db.query(
      'UPDATE businesses SET is_active=FALSE WHERE id=$1 RETURNING id',
      [req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Business not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ─── Staff ────────────────────────────────────────────────────────────────────

router.get('/businesses/:id/staff', authAdmin, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, phone_number, role, is_active, created_at
       FROM staff WHERE business_id=$1 ORDER BY name`,
      [req.params.id],
    );
    res.json(result.rows);
  } catch (e) { next(e); }
});

router.post('/businesses/:id/staff', authAdmin, async (req, res, next) => {
  try {
    const { name, phone_number, password, role } = req.body;
    if (!name || !phone_number || !password) {
      return res.status(400).json({ error: 'name, phone_number, and password required' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO staff (business_id, name, phone_number, password_hash, role)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, phone_number, role, is_active, created_at`,
      [req.params.id, name, phone_number, hash, role || 'cashier'],
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { next(e); }
});

router.patch('/staff/:id', authAdmin, async (req, res, next) => {
  try {
    const existing = await db.query('SELECT * FROM staff WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Staff not found' });

    const s = existing.rows[0];
    const { name, phone_number, role, is_active } = req.body;

    const result = await db.query(
      `UPDATE staff SET name=$1, phone_number=$2, role=$3, is_active=$4
       WHERE id=$5
       RETURNING id, name, phone_number, role, is_active, created_at`,
      [name ?? s.name, phone_number ?? s.phone_number, role ?? s.role, is_active ?? s.is_active, req.params.id],
    );
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

router.post('/staff/:id/reset-password', authAdmin, async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password required' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'UPDATE staff SET password_hash=$1 WHERE id=$2 RETURNING id',
      [hash, req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Staff not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/staff/:id', authAdmin, async (req, res, next) => {
  try {
    const result = await db.query(
      'UPDATE staff SET is_active=FALSE WHERE id=$1 RETURNING id',
      [req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Staff not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ─── Analytics ───────────────────────────────────────────────────────────────

router.get('/analytics', authAdmin, async (req, res, next) => {
  try {
    const [membersRes, pointsRes, txRes, topBizRes, memberDailyRes] = await Promise.all([
      db.query(`
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) AS this_month,
               COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week',  NOW())) AS this_week
        FROM members
      `),
      db.query(`SELECT COALESCE(SUM(points_balance), 0) AS in_circulation FROM members`),
      db.query(`
        SELECT COUNT(*) AS count
        FROM transactions t
        LEFT JOIN transactions rev ON rev.reversal_of = t.id
        WHERE t.type IN ('earn','redeem') AND rev.id IS NULL
          AND t.created_at >= NOW() - INTERVAL '30 days'
      `),
      db.query(`
        SELECT b.name, b.category,
               COUNT(t.id)              AS transactions,
               COALESCE(SUM(t.points), 0) AS points_issued,
               COUNT(DISTINCT t.member_id) AS unique_members
        FROM businesses b
        LEFT JOIN transactions t ON t.business_id = b.id
          AND t.type = 'earn'
          AND t.created_at >= NOW() - INTERVAL '30 days'
        WHERE b.is_active = TRUE
        GROUP BY b.id, b.name, b.category
        ORDER BY transactions DESC
        LIMIT 5
      `),
      db.query(`
        SELECT DATE(created_at) AS date, COUNT(*) AS count
        FROM members
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
    ]);

    const membersByDay = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = memberDailyRes.rows.find(r => r.date.toISOString().slice(0, 10) === key);
      membersByDay.push({ date: key, count: row ? parseInt(row.count) : 0 });
    }

    const m = membersRes.rows[0];
    res.json({
      members:               { total: +m.total, this_month: +m.this_month, this_week: +m.this_week },
      points_in_circulation: +pointsRes.rows[0].in_circulation,
      transactions_30d:      +txRes.rows[0].count,
      top_businesses:        topBizRes.rows.map(r => ({ ...r, transactions: +r.transactions, points_issued: +r.points_issued, unique_members: +r.unique_members })),
      members_by_day:        membersByDay,
    });
  } catch (e) { next(e); }
});

// ─── Members ──────────────────────────────────────────────────────────────────

router.get('/members', authAdmin, async (req, res, next) => {
  try {
    const q     = (req.query.q || '').trim();
    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20')));
    const offset = (page - 1) * limit;

    if (q.length > 0 && q.length < 2) {
      return res.json({ members: [], total: 0, page, limit });
    }

    let rows, countRes;
    if (q.length >= 2) {
      const pat = `%${q}%`;
      [rows, countRes] = await Promise.all([
        db.query(
          `SELECT id, name, phone_number, points_balance, tier, member_code, last_activity_at, created_at
           FROM members WHERE name ILIKE $1 OR phone_number ILIKE $1
           ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [pat, limit, offset],
        ),
        db.query(
          'SELECT COUNT(*) FROM members WHERE name ILIKE $1 OR phone_number ILIKE $1',
          [pat],
        ),
      ]);
    } else {
      [rows, countRes] = await Promise.all([
        db.query(
          `SELECT id, name, phone_number, points_balance, tier, member_code, last_activity_at, created_at
           FROM members ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
        db.query('SELECT COUNT(*) FROM members'),
      ]);
    }

    res.json({ members: rows.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (e) { next(e); }
});

router.get('/members/:id', authAdmin, async (req, res, next) => {
  try {
    const [memberRes, txRes] = await Promise.all([
      db.query(
        `SELECT id, name, phone_number, points_balance, tier, member_code, last_activity_at, created_at
         FROM members WHERE id=$1`,
        [req.params.id],
      ),
      db.query(
        `SELECT t.id, t.type, t.points, t.description, t.created_at,
                b.name AS business_name,
                s.name AS staff_name,
                t.reversal_of,
                EXISTS(SELECT 1 FROM transactions r WHERE r.reversal_of = t.id) AS is_reversed
         FROM transactions t
         LEFT JOIN businesses b ON t.business_id = b.id
         LEFT JOIN staff s ON t.staff_id = s.id
         WHERE t.member_id = $1
         ORDER BY t.created_at DESC
         LIMIT 100`,
        [req.params.id],
      ),
    ]);

    if (!memberRes.rows.length) return res.status(404).json({ error: 'Member not found' });
    res.json({ member: memberRes.rows[0], transactions: txRes.rows });
  } catch (e) { next(e); }
});

// ─── Transactions ─────────────────────────────────────────────────────────────

router.post('/transactions/:id/reverse', authAdmin, async (req, res, next) => {
  try {
    const result = await reverseTransaction(req.params.id, req.admin.sub, null);
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;
