import { Client } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

import { PostgresStateStoreAdapter } from '../src/index.js';
import { enterPostgresMaintenanceContext } from '../src/PostgresMaintenanceAccess.js';
import { POSTGRES_SERVICE_ACCESS } from '../src/PostgresServiceAccessCapability.js';
import { setTenantContextSql } from '../src/PostgresTenantIsolationPolicy.js';
import { quoteIdentifier } from '../src/sqlUtils.js';
import type { EventInput, RunBootstrapInput, RunId } from '../src/types.js';

const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
const describeIfPg = runIntegration ? describe : describe.skip;
const NOW = '2026-04-25T00:00:00.000Z';
const DEFAULT_CONNECTION_STRING = 'postgresql://dvt:dvt@localhost:5432/dvt';

describeIfPg('Postgres RLS tenant isolation enforcement', () => {
  const connectionString =
    process.env.DVT_PG_URL ?? process.env.DATABASE_URL ?? DEFAULT_CONNECTION_STRING;
  const schemaPrefix = `dvt_rls_it_${Date.now()}`;
  const createdSchemas = new Set<string>();
  let schemaCounter = 0;

  afterAll(async () => {
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

  it('returns zero cross-tenant rows under direct SQL with RLS active', async () => {
    const schema = allocateSchema();
    const adapter = new PostgresStateStoreAdapter({
      connectionString,
      schema,
      now: () => NOW,
    });

    try {
      await adapter.migrate();
      await adapter.bootstrapRunTx(makeBootstrap('run-rls-a', 'tenant-a'));
      await adapter.bootstrapRunTx(makeBootstrap('run-rls-b', 'tenant-b'));

      await withRawClient(async (client) => {
        await assertCurrentRoleCannotBypassRls(client);

        await client.query('BEGIN');
        await client.query(setTenantContextSql(), ['tenant-a']);
        const tenantRows = await client.query<{ run_id: string; tenant_id: string }>(
          `
              SELECT run_id, tenant_id
              FROM ${quoteIdentifier(schema)}.run_metadata
              ORDER BY run_id
            `
        );
        await client.query('COMMIT');

        expect(tenantRows.rows).toEqual([{ run_id: 'run-rls-a', tenant_id: 'tenant-a' }]);

        await client.query('BEGIN');
        const missingContextRows = await client.query(
          `SELECT run_id FROM ${quoteIdentifier(schema)}.run_metadata`
        );
        await client.query('COMMIT');

        expect(missingContextRows.rows).toEqual([]);

        await client.query('BEGIN');
        await enterPostgresMaintenanceContext(
          client,
          POSTGRES_SERVICE_ACCESS.runMetadataTenantResolver
        );
        const serviceRows = await client.query<{ run_id: string }>(
          `
              SELECT run_id
              FROM ${quoteIdentifier(schema)}.run_metadata
              ORDER BY run_id
            `
        );
        await client.query('COMMIT');

        expect(serviceRows.rows.map((row) => row.run_id)).toEqual(['run-rls-a', 'run-rls-b']);
      });
    } finally {
      await adapter.close();
    }
  }, 30000);

  function allocateSchema(): string {
    schemaCounter += 1;
    const schema = `${schemaPrefix}_${schemaCounter}`;
    createdSchemas.add(schema);
    return schema;
  }

  async function withRawClient(fn: (client: Client) => Promise<void>): Promise<void> {
    const client = new Client({ connectionString });
    await client.connect();
    try {
      await fn(client);
    } finally {
      await client.end();
    }
  }
});

async function assertCurrentRoleCannotBypassRls(client: Client): Promise<void> {
  const result = await client.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
    `
      SELECT rolsuper, rolbypassrls
      FROM pg_roles
      WHERE rolname = current_user
    `
  );
  const role = result.rows[0];
  if (role?.rolsuper === true || role?.rolbypassrls === true) {
    throw new Error('RLS_DIRECT_TEST_REQUIRES_NON_BYPASS_ROLE');
  }
}

function rid(value: string): RunId {
  return value as RunId;
}

function makeBootstrap(runId: string, tenantId: string): RunBootstrapInput {
  return {
    metadata: {
      tenantId,
      projectId: 'project-1',
      environmentId: 'dev',
      runId,
      planId: 'plan-1',
      planVersion: '1.0',
      logicalAttemptId: 1,
      providerRef: {
        provider: 'temporal',
        tenantId,
        namespace: 'default',
        workflowId: `wf-${runId}`,
        runId: `provider-${runId}`,
      },
    },
    firstEvents: [
      makeEvent({
        runId,
        tenantId,
        eventType: 'RunQueued',
        idempotencyKey: `${runId}:queued`,
      }),
    ],
  };
}

function makeEvent(
  input: Pick<EventInput, 'runId' | 'tenantId' | 'eventType' | 'idempotencyKey'>
): EventInput {
  return {
    eventId: input.idempotencyKey,
    eventType: input.eventType,
    runId: rid(input.runId),
    tenantId: input.tenantId,
    projectId: 'project-1',
    environmentId: 'dev',
    planId: 'plan-1',
    planVersion: '1.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    emittedAt: NOW,
    idempotencyKey: input.idempotencyKey,
    payloadVersion: 1,
    payload: {},
  };
}
