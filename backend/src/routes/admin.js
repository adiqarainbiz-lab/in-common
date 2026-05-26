const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/database');
const { authAdmin } = require('../middleware/auth');
const { reverseTransaction } = require('../services/pointsService');
const { sendBulkPushNotifications } = require('../services/notificationService');
const { _clearOffersCache } = require('./businesses');

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
    const { name, category, address, description, logo_url, cover_url, points_rate,
            phone, website, instagram, menu_url, hours, discounts } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category required' });

    const result = await db.query(
      `INSERT INTO businesses
         (name, category, address, description, logo_url, cover_url, points_rate,
          phone, website, instagram, menu_url, hours, discounts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, category, address || null, description || null, logo_url || null,
       cover_url || null, points_rate || 10, phone || null, website || null,
       instagram || null, menu_url || null, hours || null, discounts || null],
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { next(e); }
});

router.patch('/businesses/:id', authAdmin, async (req, res, next) => {
  try {
    const existing = await db.query('SELECT * FROM businesses WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Business not found' });

    const b = existing.rows[0];
    const { name, category, address, description, logo_url, cover_url, points_rate,
            phone, website, instagram, menu_url, hours, discounts, is_active } = req.body;

    const result = await db.query(
      `UPDATE businesses
       SET name=$1, category=$2, address=$3, description=$4,
           logo_url=$5, cover_url=$6, points_rate=$7, is_active=$8,
           phone=$9, website=$10, instagram=$11, menu_url=$12, hours=$13, discounts=$14
       WHERE id=$15 RETURNING *`,
      [
        name        ?? b.name,
        category    ?? b.category,
        address     ?? b.address,
        description ?? b.description,
        logo_url    ?? b.logo_url,
        cover_url   ?? b.cover_url,
        points_rate ?? b.points_rate,
        is_active   ?? b.is_active,
        phone       ?? b.phone,
        website     ?? b.website,
        instagram   ?? b.instagram,
        menu_url    ?? b.menu_url,
        hours       ?? b.hours,
        discounts   ?? b.discounts,
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
    const result = await reverseTransaction(req.params.id, null, null);
    res.json(result);
  } catch (e) { next(e); }
});

// ─── Member management ────────────────────────────────────────────────────────

// Edit member name / phone
router.patch('/members/:id', authAdmin, async (req, res, next) => {
  try {
    const { name, phone_number } = req.body;
    const existing = await db.query('SELECT * FROM members WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Member not found' });
    const m = existing.rows[0];

    if (phone_number && phone_number !== m.phone_number) {
      const conflict = await db.query('SELECT id FROM members WHERE phone_number=$1 AND id!=$2', [phone_number, req.params.id]);
      if (conflict.rows.length) return res.status(409).json({ error: 'Phone number already in use' });
    }

    const result = await db.query(
      `UPDATE members SET name=$1, phone_number=$2 WHERE id=$3
       RETURNING id, name, phone_number, points_balance, tier, member_code, is_active, last_activity_at, created_at`,
      [name ?? m.name, phone_number ?? m.phone_number, req.params.id],
    );
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

// Activate / deactivate a member
router.patch('/members/:id/status', authAdmin, async (req, res, next) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active (boolean) required' });
    const result = await db.query(
      'UPDATE members SET is_active=$1 WHERE id=$2 RETURNING id, name, is_active',
      [is_active, req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

// Manual points adjustment (admin correction / promo)
router.post('/members/:id/adjust', authAdmin, async (req, res, next) => {
  try {
    const { points, description } = req.body;
    if (!Number.isInteger(points) || points === 0)
      return res.status(400).json({ error: 'points must be a non-zero integer' });
    if (!description?.trim())
      return res.status(400).json({ error: 'description required' });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const memberRes = await client.query('SELECT points_balance FROM members WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!memberRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Member not found' }); }

      const current = memberRes.rows[0].points_balance;
      if (current + points < 0)
        return res.status(400).json({ error: `Cannot subtract ${Math.abs(points)} pts — member only has ${current}` });

      await client.query(
        `INSERT INTO transactions (member_id, type, points, description)
         VALUES ($1, 'adjust', $2, $3)`,
        [req.params.id, points, description.trim()],
      );

      const updated = await client.query(
        `UPDATE members
         SET points_balance   = points_balance + $1,
             last_activity_at = NOW(),
             tier = CASE
               WHEN points_balance + $1 >= 5000 THEN 'Keffiyeh'
               WHEN points_balance + $1 >= 2000 THEN 'Cedar'
               WHEN points_balance + $1 >= 500  THEN 'Olive'
               ELSE 'Seedling'
             END
         WHERE id = $2
         RETURNING points_balance, tier`,
        [points, req.params.id],
      );

      await client.query('COMMIT');
      res.json({ adjusted: points, newBalance: updated.rows[0].points_balance, tier: updated.rows[0].tier });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) { next(e); }
});

// Filtered transaction history for a member
router.get('/members/:id/transactions', authAdmin, async (req, res, next) => {
  try {
    const { from, to, type, page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));

    const conditions = ['t.member_id = $1'];
    const params = [req.params.id];
    let i = 2;

    if (from)  { conditions.push(`t.created_at >= $${i++}`); params.push(from); }
    if (to)    { conditions.push(`t.created_at <  $${i++}`); params.push(to); }
    if (type)  { conditions.push(`t.type = $${i++}`);        params.push(type); }

    const where = conditions.join(' AND ');

    const [rows, countRes] = await Promise.all([
      db.query(
        `SELECT t.id, t.type, t.points, t.description, t.created_at,
                b.name AS business_name, s.name AS staff_name,
                t.reversal_of,
                EXISTS(SELECT 1 FROM transactions r WHERE r.reversal_of = t.id) AS is_reversed
         FROM transactions t
         LEFT JOIN businesses b ON t.business_id = b.id
         LEFT JOIN staff s ON t.staff_id = s.id
         WHERE ${where}
         ORDER BY t.created_at DESC
         LIMIT ${Math.min(100, parseInt(limit))} OFFSET ${offset}`,
        params,
      ),
      db.query(`SELECT COUNT(*) FROM transactions t WHERE ${where}`, params),
    ]);

    res.json({ transactions: rows.rows, total: parseInt(countRes.rows[0].count) });
  } catch (e) { next(e); }
});

// ─── CSV exports ──────────────────────────────────────────────────────────────

function toCsv(headers, rows) {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

router.get('/export/members', authAdmin, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, phone_number, points_balance, tier, member_code,
              is_active, last_activity_at, created_at
       FROM members ORDER BY created_at DESC`,
    );
    const csv = toCsv(
      ['id','name','phone_number','points_balance','tier','member_code','is_active','last_activity_at','created_at'],
      result.rows,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="in-common-members.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});

router.get('/export/transactions', authAdmin, async (req, res, next) => {
  try {
    const { from, to, type, member_id } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let i = 1;

    if (from)      { conditions.push(`t.created_at >= $${i++}`); params.push(from); }
    if (to)        { conditions.push(`t.created_at <  $${i++}`); params.push(to); }
    if (type)      { conditions.push(`t.type = $${i++}`);        params.push(type); }
    if (member_id) { conditions.push(`t.member_id = $${i++}`);   params.push(member_id); }

    const result = await db.query(
      `SELECT t.id, t.type, t.points, t.description, t.created_at,
              m.name AS member_name, m.phone_number AS member_phone,
              b.name AS business_name, s.name AS staff_name,
              t.reversal_of
       FROM transactions t
       LEFT JOIN members    m ON t.member_id   = m.id
       LEFT JOIN businesses b ON t.business_id = b.id
       LEFT JOIN staff      s ON t.staff_id    = s.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.created_at DESC
       LIMIT 50000`,
      params,
    );
    const csv = toCsv(
      ['id','type','points','description','created_at','member_name','member_phone','business_name','staff_name','reversal_of'],
      result.rows,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="in-common-transactions.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});

// ─── Business Change Requests ────────────────────────────────────────────────

// GET /admin/requests?status=pending  — all profile + offer requests combined
router.get('/requests', authAdmin, async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const { rows: profileReqs } = await db.query(
      `SELECT pr.*, b.name AS business_name, s.name AS submitted_by_name
       FROM business_profile_requests pr
       JOIN businesses b ON b.id = pr.business_id
       LEFT JOIN staff s ON s.id = pr.submitted_by
       WHERE pr.status = $1 ORDER BY pr.created_at DESC`,
      [status],
    );
    const { rows: offerReqs } = await db.query(
      `SELECT orq.*, b.name AS business_name, s.name AS submitted_by_name,
              o.title AS current_title
       FROM offer_requests orq
       JOIN businesses b ON b.id = orq.business_id
       LEFT JOIN staff s ON s.id = orq.submitted_by
       LEFT JOIN offers o ON o.id = orq.offer_id
       WHERE orq.status = $1 ORDER BY orq.created_at DESC`,
      [status],
    );
    res.json({ profileRequests: profileReqs, offerRequests: offerReqs });
  } catch (e) { next(e); }
});

// GET /admin/requests/pending-count
router.get('/requests/pending-count', authAdmin, async (req, res, next) => {
  try {
    const { rows: [pr] } = await db.query(`SELECT COUNT(*) AS c FROM business_profile_requests WHERE status='pending'`);
    const { rows: [or] } = await db.query(`SELECT COUNT(*) AS c FROM offer_requests WHERE status='pending'`);
    res.json({ count: parseInt(pr.c) + parseInt(or.c) });
  } catch (e) { next(e); }
});

// PATCH /admin/profile-requests/:id/approve
router.patch('/profile-requests/:id/approve', authAdmin, async (req, res, next) => {
  try {
    const { rows: [req_] } = await db.query(`SELECT * FROM business_profile_requests WHERE id=$1`, [req.params.id]);
    if (!req_) return res.status(404).json({ error: 'Request not found.' });
    if (req_.status !== 'pending') return res.status(409).json({ error: `Already ${req_.status}.` });

    const updates = [];
    const params  = [];
    const fields  = ['logo_url','cover_url','description','hours','phone','website','instagram'];
    fields.forEach(f => { if (req_[f]) { params.push(req_[f]); updates.push(`${f}=$${params.length}`); } });

    if (updates.length) {
      params.push(req_.business_id);
      await db.query(`UPDATE businesses SET ${updates.join(',')} WHERE id=$${params.length}`, params);
    }
    await db.query(`UPDATE business_profile_requests SET status='approved', reviewed_at=NOW() WHERE id=$1`, [req_.id]);
    res.json({ message: 'Profile updated.' });
  } catch (e) { next(e); }
});

// PATCH /admin/profile-requests/:id/reject
router.patch('/profile-requests/:id/reject', authAdmin, async (req, res, next) => {
  try {
    const { notes } = req.body;
    const { rows: [req_] } = await db.query(`SELECT id, status FROM business_profile_requests WHERE id=$1`, [req.params.id]);
    if (!req_) return res.status(404).json({ error: 'Request not found.' });
    if (req_.status !== 'pending') return res.status(409).json({ error: `Already ${req_.status}.` });
    await db.query(`UPDATE business_profile_requests SET status='rejected', notes=$1, reviewed_at=NOW() WHERE id=$2`, [notes||null, req_.id]);
    res.json({ message: 'Request rejected.' });
  } catch (e) { next(e); }
});

// PATCH /admin/offer-requests/:id/approve
router.patch('/offer-requests/:id/approve', authAdmin, async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows: [orq] } = await client.query(`SELECT * FROM offer_requests WHERE id=$1 FOR UPDATE`, [req.params.id]);
    if (!orq) return res.status(404).json({ error: 'Request not found.' });
    if (orq.status !== 'pending') return res.status(409).json({ error: `Already ${orq.status}.` });

    if (orq.action === 'create') {
      await client.query(
        `INSERT INTO offers (business_id, title, description, image_url, valid_from, valid_until)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orq.business_id, orq.title, orq.description, orq.image_url, orq.valid_from, orq.valid_until],
      );
    } else if (orq.action === 'edit') {
      await client.query(
        `UPDATE offers SET title=$1, description=$2, image_url=$3, valid_from=$4, valid_until=$5 WHERE id=$6`,
        [orq.title, orq.description, orq.image_url, orq.valid_from, orq.valid_until, orq.offer_id],
      );
    } else if (orq.action === 'delete') {
      await client.query(`UPDATE offers SET is_active=FALSE WHERE id=$1`, [orq.offer_id]);
    }

    await client.query(`UPDATE offer_requests SET status='approved', reviewed_at=NOW() WHERE id=$1`, [orq.id]);
    await client.query('COMMIT');
    _clearOffersCache(); // bust the 60s cache so the new offer shows immediately
    res.json({ message: `Offer ${orq.action} approved.` });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally { client.release(); }
});

// PATCH /admin/offer-requests/:id/reject
router.patch('/offer-requests/:id/reject', authAdmin, async (req, res, next) => {
  try {
    const { notes } = req.body;
    const { rows: [orq] } = await db.query(`SELECT id, status FROM offer_requests WHERE id=$1`, [req.params.id]);
    if (!orq) return res.status(404).json({ error: 'Request not found.' });
    if (orq.status !== 'pending') return res.status(409).json({ error: `Already ${orq.status}.` });
    await db.query(`UPDATE offer_requests SET status='rejected', notes=$1, reviewed_at=NOW() WHERE id=$2`, [notes||null, orq.id]);
    res.json({ message: 'Request rejected.' });
  } catch (e) { next(e); }
});

// ─── Business Applications ────────────────────────────────────────────────────

// GET /admin/applications?status=pending|approved|rejected
router.get('/applications', authAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    const conditions = [];
    const params = [];
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `SELECT * FROM business_applications ${where} ORDER BY created_at DESC`,
      params,
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /admin/applications/pending-count  — for sidebar badge
router.get('/applications/pending-count', authAdmin, async (req, res, next) => {
  try {
    const { rows: [row] } = await db.query(
      `SELECT COUNT(*) AS count FROM business_applications WHERE status = 'pending'`,
    );
    res.json({ count: parseInt(row.count, 10) });
  } catch (e) { next(e); }
});

// PATCH /admin/applications/:id/approve
router.patch('/applications/:id/approve', authAdmin, async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows: [app] } = await client.query(
      `SELECT * FROM business_applications WHERE id = $1 FOR UPDATE`,
      [req.params.id],
    );
    if (!app)                    return res.status(404).json({ error: 'Application not found.' });
    if (app.status !== 'pending') return res.status(409).json({ error: `Application is already ${app.status}.` });

    const { points_rate = 10 } = req.body; // admin can optionally override

    const { rows: [biz] } = await client.query(
      `INSERT INTO businesses (name, category, address, description, points_rate)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [app.name, app.category, app.address, app.description, points_rate],
    );

    await client.query(
      `UPDATE business_applications
         SET status = 'approved', reviewed_at = NOW(), business_id = $1
       WHERE id = $2`,
      [biz.id, app.id],
    );

    await client.query('COMMIT');
    res.json({ business_id: biz.id, message: 'Business created and application approved.' });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
});

// PATCH /admin/applications/:id/reject
router.patch('/applications/:id/reject', authAdmin, async (req, res, next) => {
  try {
    const { notes } = req.body;
    const { rows: [app] } = await db.query(
      `SELECT * FROM business_applications WHERE id = $1`,
      [req.params.id],
    );
    if (!app)                    return res.status(404).json({ error: 'Application not found.' });
    if (app.status !== 'pending') return res.status(409).json({ error: `Application is already ${app.status}.` });

    await db.query(
      `UPDATE business_applications
         SET status = 'rejected', notes = $1, reviewed_at = NOW()
       WHERE id = $2`,
      [notes || null, app.id],
    );
    res.json({ message: 'Application rejected.' });
  } catch (e) { next(e); }
});

// ─── Push Notification Campaigns ─────────────────────────────────────────────

router.post('/notifications/send', authAdmin, async (req, res, next) => {
  try {
    const { title, body, tier } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
    if (!body?.trim())  return res.status(400).json({ error: 'body is required' });

    const VALID_TIERS = ['Seedling', 'Olive', 'Cedar', 'Keffiyeh'];
    let query = `SELECT push_token FROM members WHERE is_active = TRUE AND push_token IS NOT NULL`;
    const params = [];
    if (tier && VALID_TIERS.includes(tier)) {
      params.push(tier);
      query += ` AND tier = $1`;
    }

    const { rows } = await db.query(query, params);
    const tokens = rows.map(r => r.push_token);

    if (!tokens.length) {
      return res.json({ sent: 0, failed: 0, no_token: 0, message: 'No eligible members with push tokens.' });
    }

    const result = await sendBulkPushNotifications(tokens, title.trim(), body.trim(), { type: 'campaign' });
    console.log(`[admin] Push campaign sent by ${req.admin?.email}: "${title}" → ${JSON.stringify(result)}`);
    res.json({ ...result, total_eligible: tokens.length });
  } catch (e) { next(e); }
});

// ─── Referral Analytics ───────────────────────────────────────────────────────

router.get('/referrals', authAdmin, async (req, res, next) => {
  try {
    // Summary stats
    const { rows: [summary] } = await db.query(`
      SELECT
        COUNT(*)                     AS total_referrals,
        COALESCE(SUM(points) * 2, 0) AS total_points_awarded,
        COUNT(DISTINCT referrer_id)  AS total_referrers
      FROM referrals
    `);

    // Top referrers
    const { rows: topReferrers } = await db.query(`
      SELECT
        m.id, m.name, m.phone_number,
        COUNT(r.id)        AS referral_count,
        SUM(r.points)      AS points_earned,
        MAX(r.created_at)  AS last_referral_at
      FROM referrals r
      JOIN members m ON m.id = r.referrer_id
      GROUP BY m.id, m.name, m.phone_number
      ORDER BY referral_count DESC, last_referral_at DESC
      LIMIT 20
    `);

    // Full referral list (most recent first)
    const { rows: referrals } = await db.query(`
      SELECT
        r.id, r.points, r.created_at,
        ref.name  AS referrer_name,  ref.phone_number  AS referrer_phone,
        ref2.name AS referee_name,   ref2.phone_number AS referee_phone
      FROM referrals r
      JOIN members ref  ON ref.id  = r.referrer_id
      JOIN members ref2 ON ref2.id = r.referee_id
      ORDER BY r.created_at DESC
      LIMIT 200
    `);

    res.json({
      summary: {
        total_referrals:    parseInt(summary.total_referrals),
        total_points_awarded: parseInt(summary.total_points_awarded),
        total_referrers:    parseInt(summary.total_referrers),
      },
      topReferrers,
      referrals,
    });
  } catch (e) { next(e); }
});

module.exports = router;
