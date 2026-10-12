/**
 * Owned concern: prepare deterministic external PostgreSQL source fixtures.
 * @baseline GH-3021: PCV1 authoring must consume real inputs, never seeded graph or Run state.
 * @decision Keep the default source SQL unchanged; require explicit PCV1 preparation by the LIVE owner.
 * @consequence Only the claimed proof lease receives the additional acceptance inputs.
 * @version 1.0.0
 */
module.exports = () =>
  `
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
  order_id text PRIMARY KEY,
  client_id text NOT NULL,
  customer text NOT NULL,
  amount numeric(12, 2) NOT NULL
);
INSERT INTO raw.orders (order_id, client_id, customer, amount) VALUES
  ('1', 'C-001', 'Ada', 125.50),
  ('2', 'C-014', 'Grace', 98.00),
  ('3', 'C-001', 'Linus', 212.75);
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
  order_id text NOT NULL,
  product text NOT NULL
);
INSERT INTO raw.order_details (order_id, product) VALUES
  ('1', 'Book'),
  ('2', 'Pen'),
  ('3', 'Laptop');
ANALYZE raw.order_details;
`.trim();

async function seedPcv1PostgresProofData(databaseUrl, { Client = require('pg').Client } = {}) {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query(`
BEGIN;
CREATE SCHEMA pcv1;
CREATE TABLE pcv1.customers (
  customer_id bigint PRIMARY KEY,
  customer_name text
);
INSERT INTO pcv1.customers (customer_id, customer_name) VALUES
  (10, ' Ana '),
  (20, ' Luis '),
  (30, NULL);
CREATE TABLE pcv1.orders (
  order_id bigint PRIMARY KEY,
  customer_id bigint NOT NULL,
  amount bigint NOT NULL
);
INSERT INTO pcv1.orders (order_id, customer_id, amount) VALUES
  (1, 10, 100),
  (2, 20, 200),
  (3, 30, 300),
  (4, 99, 400);
ANALYZE pcv1.customers;
ANALYZE pcv1.orders;
COMMIT;
`);
  } finally {
    await client.end();
  }
}

module.exports.seedPcv1PostgresProofData = seedPcv1PostgresProofData;
