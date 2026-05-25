-- Add 'adjust' transaction type for admin manual point corrections
ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('earn', 'redeem', 'expire', 'reversal', 'adjust'));

-- Add is_active flag to members for deactivation/banning
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
