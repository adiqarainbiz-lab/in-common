ALTER TABLE transactions ADD COLUMN reversal_of UUID REFERENCES transactions(id);

ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('earn', 'redeem', 'expire', 'reversal'));
