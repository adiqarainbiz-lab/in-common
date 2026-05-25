# In Common — Claude Code Guide

---

## 🔖 WHERE WE LEFT OFF
> **Update this section at the end of every session.**

**Last session:** 2026-05-25
**Last commit:** `7e41ef1` — feat: admin tools — points adjustment, member edit/deactivation, tx filtering, CSV export

**Current status:**
- Backend + admin dashboard deployed to Render: https://in-common-1.onrender.com
- All 4 apps exist (backend, member app, staff app, admin dashboard)
- Core feature set is complete — auth, QR scanning, points, tiers, transactions, reversals, push notifications, analytics, admin CRUD
- ✅ Member onboarding flow (4-slide carousel, shows once per device, routes to QR tab after)
- ✅ New-member cold start UX (nudge cards on Home/History/QR screens, empty states)
- ✅ Render deploy race condition fixed (server starts first, migrations async)
- ✅ All 4 admin tools: manual points adjustment, member edit+deactivation, tx filtering, CSV export

**Admin tools summary:**
- `PATCH /admin/members/:id` — edit name/phone
- `PATCH /admin/members/:id/status` — toggle is_active (deactivate/reactivate)
- `POST /admin/members/:id/adjust` — manual ⚡ points adjust with description + tier recalc (DB transaction)
- `GET /admin/members/:id/transactions` — filtered by date range + type
- `GET /admin/export/members` — download all members as CSV
- `GET /admin/export/transactions` — download transactions as CSV (date/type/member filters, max 50k rows)
- Migration 009 adds `adjust` tx type + `is_active` column (runs automatically on next deploy)

**Next up:**
- App store prep (EAS Build for member app)
- Business self-signup flow (businesses apply, admin approves)
- Push notification campaigns from admin

**Known issues / notes:**
- Render free tier spins down — first request after inactivity is slow
- Android Studio project at `C:\Users\adiqa\AndroidStudioProjects\InCommon` is an old abandoned prototype — ignore it
- `is_new` flag returned from `/auth/member/verify-otp` — used to trigger onboarding

---

## Project Overview
Community loyalty platform for Palestinian-owned businesses in Jerusalem. Members earn "Common Points" at partner businesses by scanning a rotating QR code and redeem them as in-store credit. No bank account required.

**Monorepo structure:**
- `backend/` — Node.js/Express REST API
- `apps/member/` — React Native member app (Expo)
- `apps/staff/` — React Native staff scanner app (Expo)
- `apps/admin/` — React (Vite) admin dashboard (web)

**Live URLs:**
- Backend API: https://in-common-1.onrender.com
- Carrd landing page: https://in-common.carrd.co
- GitHub: https://github.com/adiqarainbiz-lab/in-common

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

**Start admin app:**
```
cd apps/admin && npm install && npm run dev   # runs on http://localhost:4000
```

**Create first admin account:**
```
cd backend && node scripts/create-admin.js admin@example.com password123 "Admin Name"
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

**Admin routes** (`/api/admin/*`): login, business CRUD, staff CRUD per business, password reset — all protected by `authAdmin` middleware (JWT `type: 'admin'`).

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

**Tiers:** Seedling (0 pts) → Olive (500) → Cedar (2,000) → Keffiyeh (5,000+)
**Earn rate:** 10 points per 1 JD spent
**Redeem rate:** 10 points = 1 JD credit

---

## Docker Services

| Service | Image | Port |
|---------|-------|------|
| `db` | postgres:16-alpine | 5432 |
| `backend` | built from `backend/Dockerfile` | 3000 |

Volume `pgdata` persists database data between restarts.
