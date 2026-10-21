ALTER TABLE invoice_line
  ADD COLUMN added boolean NOT NULL DEFAULT false,
  ADD COLUMN removed boolean NOT NULL DEFAULT false,
  ADD COLUMN corrected_reference text,
  ADD COLUMN corrected_quantity integer,
  ADD COLUMN corrected_unit_price_cents integer;
