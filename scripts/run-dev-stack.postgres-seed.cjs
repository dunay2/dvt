/** Owns deterministic PostgreSQL source fixtures used by the local product stack. */

function buildLocalPostgresProofSeedSql() {
  return `
CREATE SCHEMA IF NOT EXISTS raw;

DROP TABLE IF EXISTS public.source_1;
CREATE TABLE public.source_1 (
  order_id integer PRIMARY KEY,
  customer text NOT NULL,
  amount numeric(12, 2) NOT NULL
);
INSERT INTO public.source_1 (order_id, customer, amount) VALUES
  (1, 'Ada', 125.50),
  (2, 'Grace', 98.00),
  (3, 'Linus', 212.75);
ANALYZE public.source_1;

DROP TABLE IF EXISTS raw.orders;
CREATE TABLE raw.orders (
  order_id integer PRIMARY KEY,
  client_id text NOT NULL,
  customer text NOT NULL,
  amount numeric(12, 2) NOT NULL
);
INSERT INTO raw.orders (order_id, client_id, customer, amount) VALUES
  (1, 'C-001', 'Ada', 125.50),
  (2, 'C-014', 'Grace', 98.00),
  (3, 'C-001', 'Linus', 212.75);
ANALYZE raw.orders;

DROP TABLE IF EXISTS raw.client;
CREATE TABLE raw.client (
  client_id text PRIMARY KEY,
  country text NOT NULL
);
INSERT INTO raw.client (client_id, country) VALUES
  ('C-001', 'ES'),
  ('C-014', 'US');
ANALYZE raw.client;

DROP TABLE IF EXISTS raw.order_details;
CREATE TABLE raw.order_details (
  order_id integer NOT NULL,
  product text NOT NULL
);
INSERT INTO raw.order_details (order_id, product) VALUES
  (1, 'Book'),
  (2, 'Pen'),
  (3, 'Laptop');
ANALYZE raw.order_details;
`.trim();
}

module.exports = { buildLocalPostgresProofSeedSql };
