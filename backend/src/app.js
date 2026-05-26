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

app.use(errorHandler);

module.exports = app;
