CREATE TABLE IF NOT EXISTS referrals (
  id          UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID      NOT NULL REFERENCES members(id),
  referee_id  UUID      NOT NULL REFERENCES members(id),
  points      INTEGER   NOT NULL DEFAULT 150,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (referee_id)   -- each new member can only be referred once
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
