ALTER TABLE invoice_line
  ADD COLUMN unsure text[] NOT NULL DEFAULT '{}',
  ADD COLUMN proposed_reference text;
