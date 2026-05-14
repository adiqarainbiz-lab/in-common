const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const db      = require('../config/database');

// ─── Member: request OTP ─────────────────────────────────────────────────────
router.post('/member/request-otp', async (req, res, next) => {
  try {
    const { phone_number } = req.body;
    if (!phone_number) return res.status(400).json({ error: 'phone_number required' });

    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await db.query(
      `INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1,$2,$3)`,
      [phone_number, otp, expiresAt],
    );

    // In production: send via SMS gateway. In dev: return in response.
    if (process.env.OTP_DELIVERY === 'console' || process.env.NODE_ENV !== 'production') {
      console.log(`[OTP] ${phone_number} → ${otp}`);
      return res.json({ message: 'OTP sent', dev_otp: otp });
    }
    res.json({ message: 'OTP sent to your phone' });
  } catch (e) { next(e); }
});

// ─── Member: verify OTP + register/login ─────────────────────────────────────
router.post('/member/verify-otp', async (req, res, next) => {
  try {
    const { phone_number, otp, name } = req.body;
    if (!phone_number || !otp) return res.status(400).json({ error: 'phone_number and otp required' });

    const otpRes = await db.query(
      `SELECT * FROM otps
       WHERE phone_number=$1 AND otp=$2 AND used=FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone_number, otp],
    );
    if (!otpRes.rows.length) return res.status(401).json({ error: 'Invalid or expired OTP' });

    let member = (await db.query('SELECT * FROM members WHERE phone_number=$1', [phone_number])).rows[0];

    if (!member) {
      // Don't consume the OTP yet — let the client re-submit with a name
      if (!name) return res.status(400).json({ error: 'name required for new members' });
      const secret = crypto.randomBytes(32).toString('hex');
      const memberCode = await generateUniqueMemberCode();
      const result = await db.query(
        `INSERT INTO members (phone_number, name, qr_secret, member_code) VALUES ($1,$2,$3,$4) RETURNING *`,
        [phone_number, name, secret, memberCode],
      );
      member = result.rows[0];
    }

    // Consume OTP only after we know auth will succeed
    await db.query('UPDATE otps SET used=TRUE WHERE id=$1', [otpRes.rows[0].id]);

    const token = jwt.sign(
      { sub: member.id, type: 'member', phone: member.phone_number },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );

    res.json({ token, member: sanitizeMember(member) });
  } catch (e) { next(e); }
});

// ─── Staff: login ─────────────────────────────────────────────────────────────
router.post('/staff/login', async (req, res, next) => {
  try {
    const { phone_number, password } = req.body;
    if (!phone_number || !password) return res.status(400).json({ error: 'phone_number and password required' });

    const staffRes = await db.query(
      `SELECT s.*, b.name AS business_name, b.category AS business_category
       FROM staff s JOIN businesses b ON s.business_id = b.id
       WHERE s.phone_number=$1 AND s.is_active=TRUE`,
      [phone_number],
    );
    if (!staffRes.rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const staff = staffRes.rows[0];
    const valid = await bcrypt.compare(password, staff.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: staff.id, type: 'staff', business_id: staff.business_id, role: staff.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );

    res.json({
      token,
      staff: {
        id: staff.id, name: staff.name, role: staff.role,
        business_id: staff.business_id, business_name: staff.business_name,
      },
    });
  } catch (e) { next(e); }
});

async function generateUniqueMemberCode() {
  for (let i = 0; i < 10; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const existing = await db.query('SELECT id FROM members WHERE member_code=$1', [code]);
    if (!existing.rows.length) return code;
  }
  throw new Error('Could not generate unique member code');
}

function sanitizeMember(m) {
  const { qr_secret, ...rest } = m;
  return rest;
}

module.exports = router;
