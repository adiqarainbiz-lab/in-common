const router = require('express').Router();
const db     = require('../config/database');

// GET /api/businesses — public list
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    const params = [];
    let where = 'WHERE is_active=TRUE';
    if (category) { params.push(category); where += ` AND category=$${params.length}`; }

    const result = await db.query(
      `SELECT id, name, category, address, description, logo_url, points_rate
       FROM businesses ${where} ORDER BY name`,
      params,
    );
    res.json(result.rows);
  } catch (e) { next(e); }
});

module.exports = router;
