CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number    VARCHAR(20) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  points_balance  INTEGER DEFAULT 0 CHECK (points_balance >= 0),
  tier            VARCHAR(20) DEFAULT 'Seedling',
  qr_secret       VARCHAR(64) NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE businesses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50) NOT NULL,
  address     TEXT,
  description TEXT,
  logo_url    TEXT,
  points_rate INTEGER DEFAULT 10,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE staff (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  phone_number  VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) DEFAULT 'cashier',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id   UUID REFERENCES members(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  staff_id    UUID REFERENCES staff(id) ON DELETE SET NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('earn','redeem','expire')),
  amount_jd   DECIMAL(10,2),
  points      INTEGER NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE otps (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL,
  otp          VARCHAR(6) NOT NULL,
  expires_at   TIMESTAMP NOT NULL,
  used         BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_member ON transactions(member_id, created_at DESC);
CREATE INDEX idx_transactions_business ON transactions(business_id, created_at DESC);
CREATE INDEX idx_members_phone ON members(phone_number);
CREATE INDEX idx_otps_phone ON otps(phone_number);
