CREATE TABLE IF NOT EXISTS business_applications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50)  NOT NULL,
  address     TEXT,
  description TEXT,
  owner_name  VARCHAR(100) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  email       VARCHAR(100),
  website     TEXT,
  instagram   TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  notes       TEXT,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  business_id UUID REFERENCES businesses(id)
);

CREATE INDEX IF NOT EXISTS idx_business_applications_status ON business_applications(status);
