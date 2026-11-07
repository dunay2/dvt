import type { Client } from 'pg';

export type SqlReadDataset = Readonly<{
  name: string;
  clients: readonly (readonly [string | null, string | null])[];
  orders: readonly (readonly [string | null, string | null, string | null])[];
  items: readonly (string | null)[];
}>;

const nullable: SqlReadDataset = {
  name: 'nulls-and-duplicates',
  clients: [
    ['C-001', 'ES'],
    ['C-002', 'US'],
    ['C-002', 'US'],
    [null, 'GB'],
    ['C-003', null],
  ],
  orders: [
    ['O-001', 'C-001', '10'],
    ['O-002', 'C-002', '20'],
    ['O-002', 'C-002', '20'],
    ['O-003', 'C-999', null],
    [null, null, '0'],
  ],
  items: [null, '-1', '0', '1', '2', '2', '3'],
};

function generated(seed: number): SqlReadDataset {
  let state = seed + 1;
  const next = (limit: number): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % limit;
  };
  const id = (): string | null => [null, 'C-001', 'C-002', 'C-003'][next(4)] ?? null;
  return {
    name: `generated-${seed}`,
    clients: Array.from({ length: 8 }, () => [id(), [null, 'ES', 'US', 'O-001'][next(4)] ?? null]),
    orders: Array.from({ length: 11 }, () => [
      ['O-001', 'O-002', null][next(3)] ?? null,
      id(),
      [null, '0', '1.25', '-3', '20'][next(5)] ?? null,
    ]),
    items: Array.from({ length: 12 }, () => [null, '-1', '0', '1', '2', '2', '3'][next(7)] ?? null),
  };
}

export const sqlReadDatasets: readonly SqlReadDataset[] = [
  { name: 'empty', clients: [], orders: [], items: [] },
  nullable,
  {
    name: 'empty-right',
    clients: [
      ['C-001', 'ES'],
      ['C-001', 'ES'],
    ],
    orders: [],
    items: ['1'],
  },
  {
    name: 'newly-exposed-name',
    clients: [
      ['C-001', 'O-001'],
      ['C-002', 'O-001'],
    ],
    orders: [['O-001', 'DIFFERENT', '1']],
    items: ['1', '1'],
  },
  ...[0, 1, 2, 3].map(generated),
];

export async function createSqlReadTables(client: Client): Promise<void> {
  await client.query(`CREATE SCHEMA raw;
    CREATE TABLE raw.client(client_id text, country text);
    CREATE TABLE raw.orders(order_id text, client_id text, amount numeric);
    CREATE TABLE raw.items(value bigint)`);
}

export async function seedSqlReadDataset(client: Client, dataset: SqlReadDataset): Promise<void> {
  await client.query('DELETE FROM raw.client; DELETE FROM raw.orders; DELETE FROM raw.items');
  for (const row of dataset.clients)
    await client.query('INSERT INTO raw.client VALUES ($1,$2)', [...row]);
  for (const row of dataset.orders)
    await client.query('INSERT INTO raw.orders VALUES ($1,$2,$3)', [...row]);
  for (const value of dataset.items)
    await client.query('INSERT INTO raw.items VALUES ($1)', [value]);
}
