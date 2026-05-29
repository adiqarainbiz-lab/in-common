require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:4000'];

// Expo tunnel / dev domains — always allowed (no sensitive data exposed)
const EXPO_ORIGIN_RE = /^https?:\/\/([a-z0-9-]+\.)?(tunnel\.expo\.dev|exp\.direct|expo\.dev|localhost)(:\d+)?$/i;

app.use(cors({
  origin: (origin, callback) => {
    // No origin = native mobile app or server-to-server — always allow
    if (!origin) return callback(null, true);
    // Expo Go tunnel / dev client URLs
    if (EXPO_ORIGIN_RE.test(origin)) return callback(null, true);
    // Explicitly whitelisted origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(Object.assign(new Error('CORS: origin not allowed'), { status: 403 }));
  },
  credentials: true,
}));
app.use(express.json());

// Rate limiting — OTP endpoint is stricter
app.use('/api/auth/member/request-otp', rateLimit({ windowMs: 60_000, max: 3, message: { error: 'Too many OTP requests' } }));
app.use('/api/', rateLimit({ windowMs: 60_000, max: 120 }));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/member',     require('./routes/member'));
app.use('/api/staff',      require('./routes/staff'));
app.use('/api/businesses', require('./routes/businesses'));
app.use('/api/apply',           require('./routes/apply'));
app.use('/api/business-portal', require('./routes/businessPortal'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

app.get('/privacy', (_, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Privacy Policy — In Common</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F5F7F5;color:#1B4332;padding:0}
    .hero{background:linear-gradient(135deg,#1B4332,#2D6A4F);color:#fff;padding:48px 24px 36px;text-align:center}
    .hero h1{font-size:28px;font-weight:800;letter-spacing:-0.5px}
    .hero p{margin-top:8px;opacity:.75;font-size:14px}
    .body{max-width:680px;margin:0 auto;padding:40px 24px 80px}
    h2{font-size:17px;font-weight:700;margin:32px 0 10px;color:#1B4332}
    p,li{font-size:15px;color:#444;line-height:1.7;margin-bottom:8px}
    ul{padding-left:20px}
    a{color:#2D6A4F}
    .updated{font-size:13px;color:#888;margin-top:6px}
    .contact-box{background:#E8F5E9;border-radius:12px;padding:20px;margin-top:32px}
    .contact-box p{margin:0;color:#1B4332}
  </style>
</head>
<body>
  <div class="hero">
    <h1>🌿 In Common</h1>
    <p>Privacy Policy</p>
    <p class="updated">Last updated: May 2026</p>
  </div>
  <div class="body">

    <p>In Common ("we", "our", or "us") operates the In Common loyalty app. This policy explains what information we collect, how we use it, and your rights.</p>

    <h2>1. Information We Collect</h2>
    <ul>
      <li><strong>Phone number</strong> — used to create and identify your account</li>
      <li><strong>Name</strong> — displayed on your profile</li>
      <li><strong>Transaction history</strong> — points earned and redeemed at partner businesses</li>
      <li><strong>Device push token</strong> — used to send you offers and rewards notifications (optional)</li>
      <li><strong>Referral code</strong> — if you sign up via a friend's referral link</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <ul>
      <li>Operate your loyalty account and track your Common Points balance</li>
      <li>Send one-time login codes (OTP) via SMS to verify your phone number</li>
      <li>Send push notifications about offers, rewards, and app updates (you can disable these at any time in your phone settings)</li>
      <li>Calculate your tier status (Seedling, Olive, Cedar, Keffiyeh)</li>
      <li>Prevent fraud and abuse</li>
    </ul>

    <h2>3. Information We Do Not Collect</h2>
    <ul>
      <li>We do not collect payment card or bank account information</li>
      <li>We do not track your location</li>
      <li>We do not sell your data to third parties</li>
      <li>We do not use your data for advertising</li>
    </ul>

    <h2>4. Data Sharing</h2>
    <p>We share minimal data with trusted service providers solely to operate the app:</p>
    <ul>
      <li><strong>Twilio</strong> — to send OTP SMS messages (your phone number is transmitted to deliver the code)</li>
      <li><strong>Expo / Expo Push Service</strong> — to deliver push notifications to your device</li>
      <li><strong>Render</strong> — cloud hosting for our servers and database</li>
    </ul>
    <p>Partner businesses can see only that a member visited and the points awarded — they never see your name, phone number, or full transaction history.</p>

    <h2>5. Data Retention</h2>
    <p>Your account data is retained for as long as your account is active. Points expire after 18 months of inactivity in accordance with our programme rules. You may request deletion of your account at any time.</p>

    <h2>6. Security</h2>
    <p>All data is transmitted over HTTPS. Passwords are never stored — we use phone-based OTP authentication only. Your QR code is cryptographically signed and rotates every 60 seconds.</p>

    <h2>7. Children</h2>
    <p>In Common is not directed at children under 13. We do not knowingly collect data from children under 13.</p>

    <h2>8. Your Rights</h2>
    <ul>
      <li>Request a copy of the data we hold about you</li>
      <li>Request correction of inaccurate data</li>
      <li>Request deletion of your account and all associated data</li>
      <li>Opt out of push notifications at any time via your phone settings</li>
    </ul>

    <h2>9. Changes to This Policy</h2>
    <p>We may update this policy from time to time. The latest version will always be available at this URL. Continued use of the app after changes constitutes acceptance.</p>

    <div class="contact-box">
      <p>📬 <strong>Contact us</strong><br/>
      For any privacy questions or data requests, email us at:<br/>
      <a href="mailto:adiqarain.biz@gmail.com">adiqarain.biz@gmail.com</a></p>
    </div>

  </div>
</body>
</html>`);
});

app.use(errorHandler);

module.exports = app;
