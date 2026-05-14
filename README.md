# In Common — Community Loyalty Platform

A community loyalty platform for Palestinian-owned businesses in Jerusalem.
Members earn Common Points at partner businesses by showing a rotating QR code,
and redeem them as in-store credit. No bank account required.

---

## Structure

```
in-common/
├── backend/          Node.js + Express + PostgreSQL API
├── apps/
│   ├── member/       React Native (Expo) — member-facing app
│   └── staff/        React Native (Expo) — business staff scanner app
└── docker-compose.yml
```

---

## Quick Start

### 1. Start the database + backend with Docker

```bash
cd in-common
docker compose up --build
```

The backend runs on `http://localhost:3000`. The Postgres database is initialized
with the schema and sample businesses on first boot.

### 2. Without Docker (manual)

```bash
# Create a Postgres database named 'incommon'
cd backend
cp .env.example .env          # edit with your DB credentials and a strong JWT_SECRET
npm install
node scripts/migrate.js       # runs migrations + seed
npm run dev                   # starts server with nodemon
```

### 3. Run the member app

```bash
cd apps/member
npm install
# Set EXPO_PUBLIC_API_URL in a .env file or export it:
# EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000/api
npx expo start
```

### 4. Run the staff app

```bash
cd apps/staff
npm install
# Same EXPO_PUBLIC_API_URL setting as above
npx expo start
```

> **Note:** When testing on a physical device, use your machine's local network IP
> (e.g. `http://192.168.x.x:3000/api`), not `localhost`.

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/member/request-otp` | Send OTP to phone |
| POST | `/api/auth/member/verify-otp` | Verify OTP, register/login |
| POST | `/api/auth/staff/login` | Staff login with password |

### Member (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/member/profile` | Profile + balance + tier |
| GET | `/api/member/qr-token` | Rotating QR token (valid 90s) |
| GET | `/api/member/transactions` | Transaction history |
| GET | `/api/member/businesses` | Partner business list |

### Staff (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/staff/scan` | Validate QR, return member info |
| POST | `/api/staff/earn` | Award points for purchase |
| POST | `/api/staff/redeem` | Redeem points as credit |
| GET | `/api/staff/transactions` | Daily transaction log |

---

## Points & Tiers

| Earn rate | 10 pts per 1 JD spent |
|-----------|----------------------|
| Redeem rate | 10 pts = 1 JD credit |
| Point expiry | 18 months of inactivity |

| Tier | Points Required |
|------|----------------|
| 🌱 Seedling | 0 |
| 🫒 Olive | 500 |
| 🌲 Cedar | 2,000 |
| 🏅 Keffiyeh | 5,000 |

---

## Security Notes

- QR codes rotate every **60 seconds** using time-windowed JWTs
- OTP codes expire after **10 minutes** and are single-use
- Staff tokens expire after **24 hours**; member tokens after **7 days**
- All point mutations run inside **database transactions**
- Rate limiting on OTP endpoint: 3 requests/minute per IP

---

## Production Checklist

- [ ] Set a strong `JWT_SECRET` (32+ random chars)
- [ ] Set `OTP_DELIVERY=sms` and configure Twilio credentials
- [ ] Use HTTPS / TLS termination in front of the backend
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up database backups
