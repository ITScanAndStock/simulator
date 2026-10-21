ALTER TABLE simulation ADD COLUMN products_paid_cents integer;

UPDATE simulation s
SET products_paid_cents = (
  SELECT coalesce(sum(l.unit_price_cents * l.quantity), 0)::int
  FROM invoice i JOIN invoice_line l ON l.invoice_id = i.id
  WHERE i.simulation_id = s.id AND l.state IS NOT NULL
)
WHERE computed_at IS NOT NULL;
