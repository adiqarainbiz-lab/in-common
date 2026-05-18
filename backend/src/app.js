require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Rate limiting — OTP endpoint is stricter
app.use('/api/auth/member/request-otp', rateLimit({ windowMs: 60_000, max: 3, message: { error: 'Too many OTP requests' } }));
app.use('/api/', rateLimit({ windowMs: 60_000, max: 120 }));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/member',     require('./routes/member'));
app.use('/api/staff',      require('./routes/staff'));
app.use('/api/businesses', require('./routes/businesses'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

app.use(errorHandler);

module.exports = app;
