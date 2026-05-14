# In Common — Claude Code Guide

## Project Overview
Community loyalty platform for Palestinian-owned businesses in Jerusalem. Members earn "Common Points" at partner businesses by scanning a rotating QR code and redeem them as in-store credit.

**Monorepo structure:**
- `backend/` — Node.js/Express REST API
- `apps/member/` — React Native member app (Expo)
- `apps/staff/` — React Native staff scanner app (Expo)

---

## Running the Project

**Start backend + database (Docker):**
```
docker-compose up
```
Backend runs on port 3000, PostgreSQL on 5432.

**Run database migrations manually:**
```
cd backend && node scripts/migrate.js
```

**Start member app:**
```
cd apps/member && npx expo start
```

**Start staff app:**
```
cd apps/staff && npx expo start
```

---

## Backend

**Entry point:** `backend/server.js` → `backend/src/app.js`

**Key source files:**
| File | Purpose |
|------|---------|
| `src/config/database.js` | PostgreSQL connection pool |
| `src/middleware/auth.js` | JWT verification middleware |
| `src/middleware/errorHandler.js` | Global error handler |
| `src/routes/auth.js` | OTP login for members and staff |
| `src/routes/member.js` | Member profile, QR tokens, transactions, businesses |
| `src/routes/staff.js` | QR scanning, earn/redeem points |
| `src/routes/businesses.js` | Partner business endpoints |
| `src/services/pointsService.js` | Points math, tier calculation |
| `src/services/qrService.js` | Rotating QR token generation (60s TTL) |
| `src/services/breakageService.js` | Scheduled point expiry (18-month inactivity) |

**Environment variables** (copy from `backend/.env.example`):
- `PORT`, `NODE_ENV`, DB credentials
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `QR_JWT_EXPIRES_IN`
- `OTP_DELIVERY` — `console` in dev, `sms` in production

**Tech stack:** Node.js 20, Express 4, PostgreSQL 16, JWT, bcryptjs, node-cron, uuid, express-rate-limit

---

## Database Schema

Tables: `members`, `businesses`, `staff`, `transactions`, `otps`

Migrations live in `backend/migrations/`:
- `001_initial.sql` — schema
- `002_seed.sql` — sample data

Docker auto-runs migrations on first start via the `db` service init.

**Key relationships:**
- `staff.business_id` → `businesses.id`
- `transactions.member_id` → `members.id`
- `transactions.business_id` → `businesses.id`

---

## Mobile Apps

Both apps share the same structure and stack:

| Layer | File |
|-------|------|
| Root | `App.js` |
| Auth state | `src/context/AuthContext.js` |
| Navigation | `src/navigation/AppNavigator.js` |
| API client | `src/services/api.js` (Axios) |
| Screens | `src/screens/` |

**API URL:** Set `EXPO_PUBLIC_API_URL` in each app's `.env`.

**Member app screens:** Auth, Home, QR (rotating QR display), History, Businesses

**Staff app screens:** Login, Scanner (QR reader), Member (post-scan), Transactions

**Tech stack:** React Native 0.74, Expo 51, React Navigation, Axios, AsyncStorage

---

## Auth Flow

- **Members:** Phone number → OTP → JWT
- **Staff:** Phone + password → JWT
- **QR tokens:** Short-lived JWTs (60s rotation) signed with `QR_JWT_EXPIRES_IN`; staff app scans and validates against backend

---

## Points System

- Members earn points at a per-business rate when staff scans their QR
- Points expire after 18 months of inactivity (cron job in `breakageService.js`)
- Tiers are calculated in `pointsService.js` based on cumulative balance

---

## Docker Services

| Service | Image | Port |
|---------|-------|------|
| `db` | postgres:16-alpine | 5432 |
| `backend` | built from `backend/Dockerfile` | 3000 |

Volume `pgdata` persists database data between restarts.
