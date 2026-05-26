const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const db      = require('../config/database');
const { sendOTP: sendSMS } = require('../services/smsService');

// ─── Phone normalisation ──────────────────────────────────────────────────────
// Accepts local Israeli format (05x…) and normalises to E.164 (+972…).
// Examples: 0512345678 → +972512345678 | +972512345678 → +972512345678
function normalizePhone(raw) {
  // Strip spaces, dashes, parentheses
  let p = raw.replace(/[\s\-().]/g, '');
  if (p.startsWith('00972')) p = '+972' + p.slice(5);
  else if (p.startsWith('0972'))  p = '+972' + p.slice(4);
  else if (p.startsWith('972'))   p = '+' + p;
  else if (p.startsWith('0'))     p = '+972' + p.slice(1);
  return p;
}

// ─── Member: request OTP ─────────────────────────────────────────────────────
router.post('/member/request-otp', async (req, res, next) => {
  try {
    const raw = req.body.phone_number;
    if (!raw) return res.status(400).json({ error: 'phone_number required' });
    const phone_number = normalizePhone(raw);

    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await db.query(
      `INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1,$2,$3)`,
      [phone_number, otp, expiresAt],
    );

    if (process.env.OTP_DELIVERY === 'sms') {
      await sendSMS(phone_number, otp);
      return res.json({ message: 'OTP sent to your phone' });
    }

    // Dev fallback: return OTP in response
    console.log(`[OTP] ${phone_number} → ${otp}`);
    res.json({ message: 'OTP sent', dev_otp: otp });
  } catch (e) { next(e); }
});

// ─── Member: verify OTP + register/login ─────────────────────────────────────
router.post('/member/verify-otp', async (req, res, next) => {
  try {
    const { otp, name, referral_code } = req.body;
    const phone_number = req.body.phone_number ? normalizePhone(req.body.phone_number) : null;
    if (!phone_number || !otp) return res.status(400).json({ error: 'phone_number and otp required' });

    const otpRes = await db.query(
      `SELECT * FROM otps
       WHERE phone_number=$1 AND otp=$2 AND used=FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone_number, otp],
    );
    if (!otpRes.rows.length) return res.status(401).json({ error: 'Invalid or expired OTP' });

    let member = (await db.query('SELECT * FROM members WHERE phone_number=$1', [phone_number])).rows[0];
    let is_new = false;

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
      is_new = true;

      // Process referral if a valid referral_code was provided
      if (referral_code) {
        const refRes = await db.query(
          'SELECT id FROM members WHERE member_code=$1 AND id!=$2',
          [referral_code.trim(), member.id],
        );
        const referrer = refRes.rows[0];
        if (referrer) {
          const client = await db.getClient();
          try {
            await client.query('BEGIN');
            // Record the referral
            await client.query(
              `INSERT INTO referrals (referrer_id, referee_id, points) VALUES ($1,$2,150)
               ON CONFLICT (referee_id) DO NOTHING`,
              [referrer.id, member.id],
            );
            // Award 150 pts to referrer
            await client.query(
              `INSERT INTO transactions (member_id, type, points, description) VALUES ($1,'earn',150,'Referral bonus — friend joined')`,
              [referrer.id],
            );
            await client.query(
              `UPDATE members SET points_balance=points_balance+150 WHERE id=$1`,
              [referrer.id],
            );
            // Award 150 pts to new member
            await client.query(
              `INSERT INTO transactions (member_id, type, points, description) VALUES ($1,'earn',150,'Welcome bonus — joined via referral')`,
              [member.id],
            );
            await client.query(
              `UPDATE members SET points_balance=points_balance+150 WHERE id=$1`,
              [member.id],
            );
            await client.query('COMMIT');
            // Refresh member row to reflect updated points
            member = (await db.query('SELECT * FROM members WHERE id=$1', [member.id])).rows[0];
          } catch (refErr) {
            await client.query('ROLLBACK');
            console.error('[referral] failed, skipping:', refErr.message);
          } finally {
            client.release();
          }
        }
      }
    }

    // Consume OTP only after we know auth will succeed
    await db.query('UPDATE otps SET used=TRUE WHERE id=$1', [otpRes.rows[0].id]);

    const token = jwt.sign(
      { sub: member.id, type: 'member', phone: member.phone_number },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );

    res.json({ token, member: sanitizeMember(member), is_new });
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

// ─── Test agent token (only available when TEST_SECRET env var is set) ────────
// Allows load-test agents to self-authenticate without going through OTP.
// Set TEST_SECRET on Render temporarily, remove after testing.
router.post('/dev/agent-token', async (req, res, next) => {
  const secret = process.env.TEST_SECRET;
  if (!secret) return res.status(404).json({ error: 'Not found' });
  if (req.headers['x-test-secret'] !== secret) return res.status(401).json({ error: 'Unauthorised' });

  try {
    const { phone_number, name } = req.body;
    if (!phone_number) return res.status(400).json({ error: 'phone_number required' });

    let member = (await db.query('SELECT * FROM members WHERE phone_number=$1', [phone_number])).rows[0];
    if (!member) {
      const qr_secret  = crypto.randomBytes(32).toString('hex');
      const memberCode = await generateUniqueMemberCode();
      const result = await db.query(
        `INSERT INTO members (phone_number, name, qr_secret, member_code)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [phone_number, name || `Agent ${phone_number}`, qr_secret, memberCode],
      );
      member = result.rows[0];
    }

    const token = jwt.sign(
      { sub: member.id, type: 'member' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );
    res.json({ token, member: sanitizeMember(member) });
  } catch (e) { next(e); }
});

module.exports = router;
