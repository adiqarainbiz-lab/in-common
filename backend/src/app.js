require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:4000'];

app.use(cors({
  origin: (origin, callback) => {
    // No origin = mobile app or server-to-server — always allow
    if (!origin) return callback(null, true);
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
