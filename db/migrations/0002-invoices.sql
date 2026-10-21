CREATE TABLE invoice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES simulation (id) ON DELETE CASCADE,
  supplier text NOT NULL,
  total_cents integer NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invoice_simulation_id ON invoice (simulation_id);

CREATE TABLE invoice_line (
  invoice_id uuid NOT NULL REFERENCES invoice (id) ON DELETE CASCADE,
  position integer NOT NULL,
  reference text NOT NULL,
  designation text NOT NULL,
  quantity integer NOT NULL,
  unit_price_cents integer NOT NULL,
  amount_cents integer NOT NULL,
  vat_rate numeric,
  state text,
  reference_unit_price_cents integer,
  saving_cents integer,
  PRIMARY KEY (invoice_id, position)
);

ALTER TABLE simulation
  ADD COLUMN computed_at timestamptz,
  ADD COLUMN paid_cents integer,
  ADD COLUMN saving_cents integer,
  ADD COLUMN product_lines integer,
  ADD COLUMN compared_lines integer,
  ADD COLUMN to_study_lines integer,
  ADD COLUMN already_cheaper_lines integer;
