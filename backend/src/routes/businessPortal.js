const router = require('express').Router();
const db     = require('../config/database');
const { authStaff } = require('../middleware/auth');

function authManager(req, res, next) {
  if (req.staff.role !== 'manager') return res.status(403).json({ error: 'Manager role required.' });
  next();
}

// GET /api/business-portal/stats
router.get('/stats', authStaff, async (req, res, next) => {
  try {
    const bizId = req.staff.business_id;
    const { rows: [totals] } = await db.query(
      `SELECT
         COUNT(*)                                                         AS scans_total,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS scans_week,
         COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)              AS scans_today,
         COALESCE(SUM(points), 0)                                                          AS points_total,
         COALESCE(SUM(points) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 0)  AS points_week,
         COALESCE(SUM(points) FILTER (WHERE created_at >= CURRENT_DATE), 0)               AS points_today,
         COUNT(DISTINCT member_id)                                                         AS members_total,
         COUNT(DISTINCT member_id) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS members_week
       FROM transactions
       WHERE business_id = $1 AND type = 'earn'`,
      [bizId],
    );
    const { rows: dailyRaw } = await db.query(
      `SELECT DATE(created_at AT TIME ZONE 'Asia/Jerusalem') AS date, COUNT(*) AS scans, COALESCE(SUM(points),0) AS points
       FROM transactions WHERE business_id=$1 AND type='earn' AND created_at>=NOW()-INTERVAL '7 days'
       GROUP BY DATE(created_at AT TIME ZONE 'Asia/Jerusalem') ORDER BY date ASC`,
      [bizId],
    );
    const daily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = dailyRaw.find(r => r.date?.toISOString?.().slice(0,10) === dateStr || r.date === dateStr);
      daily.push({ date: dateStr, scans: parseInt(found?.scans||0), points: parseInt(found?.points||0) });
    }
    res.json({ scans_total: +totals.scans_total, scans_week: +totals.scans_week, scans_today: +totals.scans_today, points_total: +totals.points_total, points_week: +totals.points_week, points_today: +totals.points_today, members_total: +totals.members_total, members_week: +totals.members_week, daily });
  } catch (e) { next(e); }
});

// GET /api/business-portal/me
router.get('/me', authStaff, async (req, res, next) => {
  try {
    const { rows: [biz] } = await db.query(
      `SELECT id, name, category, address, description, logo_url, cover_url,
              hours, phone, website, instagram, menu_url, points_rate
       FROM businesses WHERE id=$1`,
      [req.staff.business_id],
    );
    if (!biz) return res.status(404).json({ error: 'Business not found.' });
    const { rows: offers } = await db.query(
      `SELECT * FROM offers WHERE business_id=$1 AND is_active=TRUE ORDER BY created_at DESC`,
      [req.staff.business_id],
    );
    const { rows: photos } = await db.query(
      `SELECT id, url, caption, sort_order FROM business_photos WHERE business_id=$1 ORDER BY sort_order ASC`,
      [req.staff.business_id],
    );
    const { rows: pendingRequests } = await db.query(
      `SELECT 'offer' AS kind, id, status, created_at FROM offer_requests WHERE business_id=$1 AND status='pending' ORDER BY created_at DESC`,
      [req.staff.business_id],
    );
    res.json({ business: biz, offers, photos, pendingRequests });
  } catch (e) { next(e); }
});

// PATCH /api/business-portal/profile — direct update, no approval needed
router.patch('/profile', authStaff, authManager, async (req, res, next) => {
  try {
    const { description, hours, phone, website, instagram, menu_url, logo_url, cover_url } = req.body;
    const allowed = { description, hours, phone, website, instagram, menu_url, logo_url, cover_url };
    const changed = Object.entries(allowed).filter(([, v]) => v !== undefined);
    if (!changed.length) return res.status(400).json({ error: 'Nothing to update.' });

    const sets  = changed.map(([k], i) => `${k}=$${i+1}`);
    const vals  = changed.map(([, v]) => v || null);
    vals.push(req.staff.business_id);

    const { rows: [biz] } = await db.query(
      `UPDATE businesses SET ${sets.join(',')} WHERE id=$${vals.length} RETURNING id,name,category,address,description,logo_url,cover_url,hours,phone,website,instagram,menu_url,points_rate`,
      vals,
    );

    // Log the change for admin notification
    const staffRes = await db.query('SELECT name FROM staff WHERE id=$1', [req.staff.sub]);
    await db.query(
      `INSERT INTO business_change_log (business_id, business_name, staff_name, changed_fields)
       VALUES ($1,$2,$3,$4)`,
      [req.staff.business_id, biz.name, staffRes.rows[0]?.name || 'Staff', changed.map(([k]) => k)],
    );

    res.json(biz);
  } catch (e) { next(e); }
});

// GET /api/business-portal/photos
router.get('/photos', authStaff, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, url, caption, sort_order FROM business_photos WHERE business_id=$1 ORDER BY sort_order ASC`,
      [req.staff.business_id],
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/business-portal/photos
router.post('/photos', authStaff, authManager, async (req, res, next) => {
  try {
    const { url, caption } = req.body;
    if (!url?.trim()) return res.status(400).json({ error: 'url required' });
    const { rows: [max] } = await db.query(
      `SELECT COALESCE(MAX(sort_order),0) AS m FROM business_photos WHERE business_id=$1`,
      [req.staff.business_id],
    );
    const { rows: [photo] } = await db.query(
      `INSERT INTO business_photos (business_id, url, caption, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.staff.business_id, url.trim(), caption||null, parseInt(max.m)+1],
    );

    // Log for admin
    const [bizRes, staffRes] = await Promise.all([
      db.query('SELECT name FROM businesses WHERE id=$1', [req.staff.business_id]),
      db.query('SELECT name FROM staff WHERE id=$1', [req.staff.sub]),
    ]);
    await db.query(
      `INSERT INTO business_change_log (business_id, business_name, staff_name, changed_fields) VALUES ($1,$2,$3,$4)`,
      [req.staff.business_id, bizRes.rows[0]?.name, staffRes.rows[0]?.name||'Staff', ['photos']],
    );

    res.status(201).json(photo);
  } catch (e) { next(e); }
});

// DELETE /api/business-portal/photos/:id
router.delete('/photos/:id', authStaff, authManager, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM business_photos WHERE id=$1 AND business_id=$2 RETURNING id`,
      [req.params.id, req.staff.business_id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Photo not found.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// PATCH /api/business-portal/photos/reorder — body: { orders: [{id, sort_order}] }
router.patch('/photos/reorder', authStaff, authManager, async (req, res, next) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders) || !orders.length) return res.status(400).json({ error: 'orders array required' });
    await Promise.all(orders.map(({ id, sort_order }) =>
      db.query('UPDATE business_photos SET sort_order=$1 WHERE id=$2 AND business_id=$3', [sort_order, id, req.staff.business_id])
    ));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/business-portal/offer-request — unchanged
router.post('/offer-request', authStaff, authManager, async (req, res, next) => {
  try {
    const { action, offer_id, title, description, image_url, valid_from, valid_until } = req.body;
    if (!['create','edit','delete'].includes(action)) return res.status(400).json({ error: 'Invalid action.' });
    if (action !== 'delete' && !title?.trim()) return res.status(400).json({ error: 'Title is required.' });
    if ((action === 'edit' || action === 'delete') && !offer_id) return res.status(400).json({ error: 'offer_id required for edit/delete.' });
    if (offer_id) {
      const { rows } = await db.query('SELECT id FROM offers WHERE id=$1 AND business_id=$2', [offer_id, req.staff.business_id]);
      if (!rows.length) return res.status(404).json({ error: 'Offer not found.' });
    }
    const { rows: [row] } = await db.query(
      `INSERT INTO offer_requests (business_id, offer_id, action, title, description, image_url, valid_from, valid_until, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [req.staff.business_id, offer_id||null, action, title||null, description||null, image_url||null, valid_from||null, valid_until||null, req.staff.sub],
    );
    res.status(201).json({ id: row.id, message: 'Offer request submitted for review.' });
  } catch (e) { next(e); }
});

module.exports = router;
