-- Live approved offers per business
CREATE TABLE IF NOT EXISTS offers (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  image_url   TEXT,
  valid_from  DATE,
  valid_until DATE,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_business ON offers(business_id);

-- Offer change requests (create / edit / delete)
CREATE TABLE IF NOT EXISTS offer_requests (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID        NOT NULL REFERENCES businesses(id),
  offer_id     UUID        REFERENCES offers(id),   -- NULL = new offer
  action       VARCHAR(20) NOT NULL CHECK (action IN ('create','edit','delete')),
  title        VARCHAR(200),
  description  TEXT,
  image_url    TEXT,
  valid_from   DATE,
  valid_until  DATE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  notes        TEXT,
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMP,
  submitted_by UUID        REFERENCES staff(id)
);

-- Business profile change requests (photos, description, contact)
CREATE TABLE IF NOT EXISTS business_profile_requests (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID        NOT NULL REFERENCES businesses(id),
  logo_url     TEXT,
  cover_url    TEXT,
  description  TEXT,
  hours        TEXT,
  phone        TEXT,
  website      TEXT,
  instagram    TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  notes        TEXT,
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMP,
  submitted_by UUID        REFERENCES staff(id)
);
