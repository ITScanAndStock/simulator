CREATE TABLE simulation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  practice text NOT NULL,
  practitioner text NOT NULL,
  phone text NOT NULL,
  csp_member boolean NOT NULL,
  scan_and_stock_user boolean NOT NULL,
  call_back boolean NOT NULL,
  data_information_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
