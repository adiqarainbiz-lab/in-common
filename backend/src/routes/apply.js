const router = require('express').Router();
const db     = require('../config/database');

const VALID_CATEGORIES = [
  'Restaurant', 'Café', 'Grocery', 'Bakery', 'Pharmacy',
  'Clothing', 'Bookstore', 'Electronics', 'Salon', 'Other',
];

// POST /api/apply  — public, no auth
router.post('/', async (req, res, next) => {
  try {
    const { name, category, address, description, owner_name, phone, email, website, instagram } = req.body;

    if (!name?.trim())       return res.status(400).json({ error: 'Business name is required.' });
    if (!category?.trim())   return res.status(400).json({ error: 'Category is required.' });
    if (!owner_name?.trim()) return res.status(400).json({ error: 'Owner name is required.' });
    if (!phone?.trim())      return res.status(400).json({ error: 'Phone number is required.' });

    const { rows: [app] } = await db.query(
      `INSERT INTO business_applications
         (name, category, address, description, owner_name, phone, email, website, instagram)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        name.trim(), category.trim(),
        address?.trim() || null, description?.trim() || null,
        owner_name.trim(), phone.trim(),
        email?.trim() || null, website?.trim() || null, instagram?.trim() || null,
      ]
    );

    res.status(201).json({
      id: app.id,
      message: "Application received — we'll review it and be in touch soon. شكراً!",
    });
  } catch (e) { next(e); }
});

module.exports = router;
