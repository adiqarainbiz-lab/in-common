CREATE TABLE IF NOT EXISTS business_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  caption     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_business_photos_biz ON business_photos(business_id, sort_order);

CREATE TABLE IF NOT EXISTS business_change_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id    UUID REFERENCES businesses(id) ON DELETE CASCADE,
  business_name  TEXT NOT NULL,
  staff_name     TEXT NOT NULL,
  changed_fields TEXT[] NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  admin_seen     BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_bcl_seen ON business_change_log(admin_seen, created_at DESC);
