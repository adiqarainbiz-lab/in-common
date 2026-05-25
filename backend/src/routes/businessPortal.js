const router = require('express').Router();
const db     = require('../config/database');
const { authStaff } = require('../middleware/auth');

// All routes require staff auth — manager role enforced per route
function authManager(req, res, next) {
  if (req.staff.role !== 'manager') return res.status(403).json({ error: 'Manager role required.' });
  next();
}

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
