CREATE TABLE group_price (
  list text NOT NULL,
  reference text NOT NULL,
  designation text NOT NULL,
  range text NOT NULL,
  catalogue_price_cents integer NOT NULL CHECK (catalogue_price_cents > 0),
  vat_rate numeric(3, 1),
  price_list_year integer NOT NULL,
  PRIMARY KEY (list, reference)
);

CREATE INDEX group_price_reference ON group_price (reference);
