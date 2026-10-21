ALTER TABLE invoice
  ADD COLUMN tax_basis text NOT NULL DEFAULT 'inclusive',
  ADD COLUMN other_charges_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN listed boolean NOT NULL DEFAULT false;

ALTER TABLE invoice ALTER COLUMN tax_basis DROP DEFAULT;
ALTER TABLE invoice ALTER COLUMN other_charges_cents DROP DEFAULT;
