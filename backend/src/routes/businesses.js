const router = require('express').Router();
const db     = require('../config/database');

const FIELDS = `id, name, category, address, description, logo_url, cover_url,
                points_rate, phone, website, instagram, menu_url, hours, discounts`;

// GET /api/businesses
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    const params = [];
    let where = 'WHERE is_active=TRUE';
    if (category) { params.push(category); where += ` AND category=$${params.length}`; }

    const result = await db.query(
      `SELECT ${FIELDS} FROM businesses ${where} ORDER BY name`,
      params,
    );
    res.json(result.rows);
  } catch (e) { next(e); }
});

// GET /api/businesses/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ${FIELDS} FROM businesses WHERE id=$1 AND is_active=TRUE`,
      [req.params.id],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Business not found' });
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

// GET /api/businesses/:id/offers
router.get('/:id/offers', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, description, image_url, valid_from, valid_until
       FROM offers
       WHERE business_id = $1 AND is_active = TRUE
         AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
       ORDER BY created_at DESC`,
      [req.params.id],
    );
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
