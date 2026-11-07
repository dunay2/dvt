export type SqlReadScenario = Readonly<{
  name: string;
  sql: string;
  retained?: boolean;
  ordered?: boolean;
}>;

const clients = '(SELECT c.client_id AS id, c.country AS country FROM raw.client c)';
const orders =
  '(SELECT o.order_id AS oid, o.client_id AS cid, o.amount AS amount FROM raw.orders o)';
const joined = `${clients} q JOIN ${orders} r ON q.id = r.cid`;

export const sqlReadScenarios: readonly SqlReadScenario[] = [
  {
    name: 'nested-rename-reorder',
    sql: `SELECT result.c0 AS country, result.c1 AS "client_id 2" FROM (SELECT i0.country AS c0, i0.id AS c1 FROM ${clients} i0) result`,
  },
  {
    name: 'nested-same-alias',
    sql: 'SELECT c.id AS id FROM (SELECT c.client_id AS id FROM raw.client c) c',
  },
  {
    name: 'unqualified-input',
    sql: 'SELECT q.id AS id FROM (SELECT client_id AS id FROM raw.client c) q',
  },
  {
    name: 'quoted-alias-label',
    sql: `SELECT "outer.alias".id AS "Client Id" FROM (SELECT "input alias".client_id AS id FROM raw.client "input alias") "outer.alias"`,
  },
  {
    name: 'join-and-filter',
    sql: `SELECT r.oid AS order_id, q.id AS "client_id 2" FROM ${joined} WHERE q.id <> 'C-001'`,
  },
  {
    name: 'two-and-owners',
    sql: `SELECT r.oid AS order_id, q.id AS client_id FROM ${joined} WHERE q.id <> 'C-001' AND r.amount > 0`,
  },
  {
    name: 'one-input-or',
    sql: `SELECT r.oid AS order_id, q.id AS client_id FROM ${joined} WHERE q.id = 'C-002' OR q.id IS NULL`,
  },
  {
    name: 'mixed-input-or',
    sql: `SELECT r.oid AS order_id, q.id AS client_id FROM ${joined} WHERE q.id = 'C-002' OR r.oid = 'O-001'`,
  },
  {
    name: 'not-null-term',
    sql: `SELECT r.oid AS order_id, q.id AS client_id FROM ${joined} WHERE NOT (q.country IS NULL)`,
  },
  {
    name: 'where-needed-pruning',
    sql: `SELECT r.oid AS order_id FROM ${joined} WHERE q.country = 'US'`,
  },
  { name: 'join-needed-pruning', sql: `SELECT r.oid AS order_id FROM ${joined}` },
  { name: 'unused-cross-rows', sql: `SELECT q.id AS id FROM ${clients} q CROSS JOIN ${orders} r` },
  {
    name: 'comma-cross',
    sql: `SELECT q.id AS id FROM ${clients} q, ${orders} r WHERE q.country IS NOT NULL`,
  },
  {
    name: 'unqualified-new-exposure',
    sql: `SELECT client_id FROM (SELECT c.country AS country FROM raw.client c) q JOIN raw.orders o ON q.country = o.order_id`,
  },
  {
    name: 'duplicate-projected-values',
    sql: 'SELECT q.a AS a, q.b AS b FROM (SELECT c.client_id AS a, c.client_id AS b FROM raw.client c) q',
  },
  {
    name: 'filtered-base-wrapper',
    sql: `SELECT r.oid AS order_id, q.id AS id FROM (SELECT c.client_id AS id FROM raw.client c WHERE c.country IS NOT NULL) q JOIN ${orders} r ON q.id = r.cid`,
  },
  {
    name: 'literal-bigint-cast',
    sql: 'SELECT q.value AS value FROM (SELECT i.value AS value FROM raw.items i WHERE i.value > 1::bigint) q',
  },
  {
    name: 'qualified-builtin-comparison',
    sql: `SELECT q.id AS id FROM ${clients} q WHERE q.id OPERATOR(pg_catalog.<>) 'C-001'`,
  },
  {
    name: 'three-inputs',
    sql: `SELECT q.id AS id, r.oid AS oid FROM ${joined} CROSS JOIN (SELECT i.value AS value FROM raw.items i) third WHERE third.value > 0 AND q.country IS NOT NULL`,
  },
  { name: 'boolean-constant', sql: `SELECT q.id AS id FROM ${clients} q WHERE FALSE` },
  ...(['LEFT', 'RIGHT', 'FULL'] as const).map((kind) => ({
    name: `retained-${kind.toLowerCase()}-join`,
    sql: `SELECT q.id AS id, r.oid AS oid FROM ${clients} q ${kind} JOIN ${orders} r ON q.id = r.cid`,
    retained: true,
  })),
  {
    name: 'retained-distinct',
    sql: `SELECT DISTINCT q.id AS id FROM ${clients} q`,
    retained: true,
  },
  {
    name: 'retained-order',
    sql: `SELECT q.id AS id FROM ${clients} q ORDER BY q.id NULLS LAST`,
    retained: true,
    ordered: true,
  },
  {
    name: 'retained-limit-offset',
    sql: `SELECT q.id AS id FROM ${clients} q ORDER BY q.id NULLS LAST LIMIT 2 OFFSET 1`,
    retained: true,
    ordered: true,
  },
  {
    name: 'retained-aggregate',
    sql: `SELECT count(q.id) AS count FROM ${clients} q GROUP BY q.country`,
    retained: true,
  },
  {
    name: 'retained-window',
    sql: `SELECT q.id AS id, row_number() OVER (ORDER BY q.id NULLS LAST) AS position FROM ${clients} q`,
    retained: true,
  },
  {
    name: 'retained-cte',
    sql: `WITH selected AS (SELECT c.client_id AS id FROM raw.client c) SELECT selected.id FROM selected`,
    retained: true,
  },
  {
    name: 'retained-using',
    sql: `SELECT q.id AS id FROM ${clients} q JOIN (SELECT o.client_id AS id FROM raw.orders o) r USING (id)`,
    retained: true,
  },
  {
    name: 'retained-natural',
    sql: `SELECT q.id AS id FROM ${clients} q NATURAL JOIN (SELECT o.client_id AS id FROM raw.orders o) r`,
    retained: true,
  },
  {
    name: 'retained-lateral-correlation',
    sql: 'SELECT c.client_id AS id FROM raw.client c CROSS JOIN LATERAL (SELECT o.client_id AS id FROM raw.orders o WHERE o.client_id = c.client_id) q',
    retained: true,
  },
  {
    name: 'retained-column-cast',
    sql: 'SELECT q.id AS id FROM (SELECT c.client_id::text AS id FROM raw.client c) q',
    retained: true,
  },
  {
    name: 'retained-calculation',
    sql: 'SELECT q.value AS value FROM (SELECT i.value + 1 AS value FROM raw.items i) q',
    retained: true,
  },
  {
    name: 'retained-whole-row',
    sql: 'SELECT q.row AS row FROM (SELECT c AS row FROM raw.client c) q',
    retained: true,
  },
  { name: 'retained-star', sql: `SELECT q.* FROM ${clients} q`, retained: true },
];
