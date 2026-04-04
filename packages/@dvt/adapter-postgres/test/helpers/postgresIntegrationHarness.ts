import { Client } from 'pg';
import { afterAll, describe } from 'vitest';

import { PostgresStateStoreAdapter } from '../../src/index.js';
import { quoteIdentifier } from '../../src/sqlUtils.js';

import { NOW } from './runEventFixtures.js';

const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
export const describeIfPg = runIntegration ? describe : describe.skip;

const schemaPrefix = `dvt_it_${Date.now()}`;
const createdSchemas = new Set<string>();
let schemaCounter = 0;

function allocateSchema(): string {
  schemaCounter += 1;
  const schema = `${schemaPrefix}_${schemaCounter}`;
  createdSchemas.add(schema);
  return schema;
}

afterAll(async () => {
  const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
  if (!connectionString) return;
  const client = new Client({ connectionString });
  await client.connect();
  try {
    for (const schema of createdSchemas) {
      await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    }
  } finally {
    await client.end();
  }
});

export async function withAdapter(
  fn: (adapter: PostgresStateStoreAdapter) => Promise<void>
): Promise<void> {
  const schema = allocateSchema();
  const adapter = new PostgresStateStoreAdapter({
    schema,
    now: () => NOW,
  });
  try {
    await adapter.migrate();
    await fn(adapter);
  } finally {
    await adapter.close();
  }
}
