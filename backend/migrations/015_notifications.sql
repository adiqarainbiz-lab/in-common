CREATE TABLE member_notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id  UUID REFERENCES members(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL,
  type       VARCHAR(50) NOT NULL DEFAULT 'general',
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_member_notifications_member ON member_notifications(member_id, created_at DESC);
