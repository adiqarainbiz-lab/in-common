const router = require('express').Router();
const db     = require('../config/database');
const { authStaff } = require('../middleware/auth');

// All routes require staff auth — manager role enforced per route
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

    // Daily breakdown — last 7 days (fills in zeros for missing days)
    const { rows: dailyRaw } = await db.query(
      `SELECT
         DATE(created_at AT TIME ZONE 'Asia/Jerusalem') AS date,
         COUNT(*)                                       AS scans,
         COALESCE(SUM(points), 0)                       AS points
       FROM transactions
       WHERE business_id = $1 AND type = 'earn'
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at AT TIME ZONE 'Asia/Jerusalem')
       ORDER BY date ASC`,
      [bizId],
    );

    // Build full 7-day array, filling zeros for days with no scans
    const daily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = dailyRaw.find(r => r.date?.toISOString?.().slice(0, 10) === dateStr || r.date === dateStr);
      daily.push({ date: dateStr, scans: parseInt(found?.scans || 0), points: parseInt(found?.points || 0) });
    }

    res.json({
      scans_total:   parseInt(totals.scans_total),
      scans_week:    parseInt(totals.scans_week),
      scans_today:   parseInt(totals.scans_today),
      points_total:  parseInt(totals.points_total),
      points_week:   parseInt(totals.points_week),
      points_today:  parseInt(totals.points_today),
      members_total: parseInt(totals.members_total),
      members_week:  parseInt(totals.members_week),
      daily,
    });
  } catch (e) { next(e); }
});

// GET /api/business-portal/me
router.get('/me', authStaff, async (req, res, next) => {
  try {
    const { rows: [biz] } = await db.query(
      `SELECT id, name, category, address, description, logo_url, cover_url,
              hours, phone, website, instagram, points_rate
       FROM businesses WHERE id = $1`,
      [req.staff.business_id],
    );
    if (!biz) return res.status(404).json({ error: 'Business not found.' });

    const { rows: offers } = await db.query(
      `SELECT * FROM offers WHERE business_id = $1 AND is_active = TRUE ORDER BY created_at DESC`,
      [req.staff.business_id],
    );

    const { rows: pendingRequests } = await db.query(
      `SELECT 'profile' AS kind, id, status, created_at FROM business_profile_requests
         WHERE business_id = $1 AND status = 'pending'
       UNION ALL
       SELECT 'offer' AS kind, id, status, created_at FROM offer_requests
         WHERE business_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [req.staff.business_id],
    );

    res.json({ business: biz, offers, pendingRequests });
  } catch (e) { next(e); }
});

// POST /api/business-portal/profile-request
router.post('/profile-request', authStaff, authManager, async (req, res, next) => {
  try {
    const { logo_url, cover_url, description, hours, phone, website, instagram } = req.body;
    if (!logo_url && !cover_url && !description && !hours && !phone && !website && !instagram) {
      return res.status(400).json({ error: 'At least one field is required.' });
    }
    const { rows: [row] } = await db.query(
      `INSERT INTO business_profile_requests
         (business_id, logo_url, cover_url, description, hours, phone, website, instagram, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [req.staff.business_id, logo_url||null, cover_url||null, description||null,
       hours||null, phone||null, website||null, instagram||null, req.staff.sub],
    );
    res.status(201).json({ id: row.id, message: 'Profile update request submitted for review.' });
  } catch (e) { next(e); }
});

// POST /api/business-portal/offer-request
router.post('/offer-request', authStaff, authManager, async (req, res, next) => {
  try {
    const { action, offer_id, title, description, image_url, valid_from, valid_until } = req.body;
    if (!['create','edit','delete'].includes(action)) return res.status(400).json({ error: 'Invalid action.' });
    if (action !== 'delete' && !title?.trim()) return res.status(400).json({ error: 'Title is required.' });
    if ((action === 'edit' || action === 'delete') && !offer_id) return res.status(400).json({ error: 'offer_id required for edit/delete.' });

    // Verify offer belongs to this business
    if (offer_id) {
      const { rows } = await db.query('SELECT id FROM offers WHERE id=$1 AND business_id=$2', [offer_id, req.staff.business_id]);
      if (!rows.length) return res.status(404).json({ error: 'Offer not found.' });
    }

    const { rows: [row] } = await db.query(
      `INSERT INTO offer_requests
         (business_id, offer_id, action, title, description, image_url, valid_from, valid_until, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [req.staff.business_id, offer_id||null, action, title||null, description||null,
       image_url||null, valid_from||null, valid_until||null, req.staff.sub],
    );
    res.status(201).json({ id: row.id, message: 'Offer request submitted for review.' });
  } catch (e) { next(e); }
});

module.exports = router;
