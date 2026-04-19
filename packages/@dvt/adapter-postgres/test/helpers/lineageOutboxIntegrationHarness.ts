import { Client } from 'pg';
import { describe } from 'vitest';

import { PostgresStateStoreAdapter } from '../../src/PostgresStateStoreAdapter.js';
import { quoteIdentifier } from '../../src/sqlUtils.js';

import { NOW } from './lineageOutboxUnitSupport.js';

const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
export const describeIfPg = runIntegration ? describe : describe.skip;

const schemaPrefix = `dvt_lineage_it_${Date.now()}`;
let schemaCounter = 0;

function allocateSchema(): string {
  schemaCounter += 1;
  return `${schemaPrefix}_${schemaCounter}`;
}

export async function withLineageStores(
  options: { nowA: { value: string }; nowB?: { value: string }; claimTimeoutMs?: number },
  fn: (args: {
    storeA: ReturnType<PostgresStateStoreAdapter['getLineageOutboxStore']>;
    storeB: ReturnType<PostgresStateStoreAdapter['getLineageOutboxStore']>;
  }) => Promise<void>
): Promise<void> {
  const schema = allocateSchema();
  const connectionString = resolveIntegrationConnectionString();
  const nowB = options.nowB ?? options.nowA;
  const adapterA = new PostgresStateStoreAdapter({
    connectionString,
    schema,
    now: () => options.nowA.value,
    lineageOutboxClaimTimeoutMs: options.claimTimeoutMs,
  });
  const adapterB = new PostgresStateStoreAdapter({
    connectionString,
    schema,
    now: () => nowB.value,
    assumeSchemaReady: true,
    lineageOutboxClaimTimeoutMs: options.claimTimeoutMs,
  });

  try {
    await adapterA.migrate();
    await fn({
      storeA: adapterA.getLineageOutboxStore(),
      storeB: adapterB.getLineageOutboxStore(),
    });
  } finally {
    await adapterA.close();
    await adapterB.close();
    await dropIntegrationSchema(connectionString, schema);
  }
}

export { NOW };

function resolveIntegrationConnectionString(): string | undefined {
  return process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
}

async function dropIntegrationSchema(
  connectionString: string | undefined,
  schema: string
): Promise<void> {
  if (!connectionString) {
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
  } finally {
    await client.end();
  }
}
