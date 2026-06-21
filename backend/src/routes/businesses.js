const router = require('express').Router();
const db     = require('../config/database');

const FIELDS = `id, name, category, address, description, logo_url, cover_url,
                points_rate, phone, website, instagram, menu_url, hours, discounts,
                lat, lng`;

// ── In-memory cache for the heavy all-offers JOIN ─────────────────────────────
// Uses promise coalescing: if 100 requests arrive simultaneously on a cold cache,
// only ONE DB query fires — the rest await the same pending promise.
const OFFERS_TTL   = 60_000; // 60 seconds
let offersCache    = null;
let offersCacheAt  = 0;
let offersPending  = null; // in-flight DB promise — prevents stampede

function clearOffersCache() {
  offersCache   = null;
  offersCacheAt = 0;
  // don't null offersPending — let any in-flight query finish and repopulate
}
module.exports._clearOffersCache = clearOffersCache;

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

// GET /api/businesses/offers — all active offers across all businesses (must be before /:id)
router.get('/offers', async (req, res, next) => {
  try {
    // Serve from cache if still warm
    if (offersCache && Date.now() - offersCacheAt < OFFERS_TTL) {
      return res.json(offersCache);
    }
    // Coalesce concurrent cold-cache requests into a single DB query
    if (!offersPending) {
      offersPending = db.query(
        `SELECT o.id, o.title, o.description, o.image_url, o.valid_from, o.valid_until,
                b.id AS business_id, b.name AS business_name,
                b.logo_url AS business_logo, b.category AS business_category
         FROM offers o
         JOIN businesses b ON b.id = o.business_id
         WHERE o.is_active = TRUE
           AND b.is_active = TRUE
           AND (o.valid_until IS NULL OR o.valid_until >= CURRENT_DATE)
         ORDER BY o.created_at DESC`,
      ).then(({ rows }) => {
        offersCache   = rows;
        offersCacheAt = Date.now();
        offersPending = null;
        return rows;
      }).catch((err) => {
        offersPending = null; // reset so next request retries
        throw err;
      });
    }
    const rows = await offersPending;
    res.json(rows);
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
    const biz = result.rows[0];
    const { rows: photoRows } = await db.query(
      `SELECT id, url, caption, sort_order FROM business_photos WHERE business_id=$1 ORDER BY sort_order ASC`,
      [req.params.id],
    );
    res.json({ ...biz, photos: photoRows });
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
