import { CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION, type WorkflowSnapshot } from '@dvt/contracts';
import { Client } from 'pg';
import { expect, test } from 'vitest';

import {
  PostgresRunArchiveStore,
  PostgresRunSnapshotStore,
  PostgresStateStoreAdapter,
} from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

import { describeIfPg } from './helpers/postgresIntegrationHarness.js';

const NOW = '2026-05-22T00:00:00.000Z';

function requireConnectionString(): string {
  const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DVT_PG_URL or DATABASE_URL is required for integration tests');
  }
  return connectionString;
}

function makeSchemaName(): string {
  return `dvt_ar_d5_it_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

async function withArchiveStore(
  fn: (ctx: { schema: string; client: Client; store: PostgresRunArchiveStore }) => Promise<void>
): Promise<void> {
  const schema = makeSchemaName();
  const connectionString = requireConnectionString();
  const client = new Client({ connectionString });
  const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });

  await client.connect();
  try {
    await adapter.migrate();
    const withClient = async <T>(callback: (poolClient: Client) => Promise<T>): Promise<T> =>
      callback(client);
    const withTransaction = async <T>(callback: (poolClient: Client) => Promise<T>): Promise<T> => {
      await client.query('BEGIN');
      try {
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    };
    const snapshotStore = new PostgresRunSnapshotStore(
      schema,
      () => NOW,
      withTransaction,
      withClient
    );
    const store = new PostgresRunArchiveStore(schema, withTransaction, withClient, snapshotStore);

    await fn({ schema, client, store });
  } finally {
    await adapter.close();
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    await client.end();
  }
}

describeIfPg('PostgresRunArchiveStore tenant retention integration', () => {
  test('waits for every tenant in a shared archive unit to satisfy its own policy', () =>
    withArchiveStore(async ({ schema, client, store }) => {
      const quotedSchema = quoteIdentifier(schema);
      const persistedAt = '2026-05-12T00:00:00.000Z';

      await insertTerminalRun({
        client,
        quotedSchema,
        tenantId: 'free-tier',
        runId: 'run-free',
        persistedAt,
      });
      await insertTerminalRun({
        client,
        quotedSchema,
        tenantId: 'enterprise',
        runId: 'run-enterprise',
        persistedAt,
      });

      await expect(
        store.listEligibleArchiveUnits(
          {
            hotRetentionDays: 7,
            archiveBucketCount: 1,
            pinTerminalSnapshots: true,
            tenantHotRetentionDays: [{ tenantId: 'enterprise', hotRetentionDays: 30 }],
          },
          NOW
        )
      ).resolves.toEqual([]);

      await expect(
        store.listEligibleArchiveUnits(
          {
            hotRetentionDays: 7,
            archiveBucketCount: 1,
            pinTerminalSnapshots: true,
            tenantHotRetentionDays: [{ tenantId: 'enterprise', hotRetentionDays: 9 }],
          },
          NOW
        )
      ).resolves.toMatchObject([
        {
          tenantBucket: 'tb00',
          tenantIds: ['enterprise', 'free-tier'],
          rowCount: 2,
          state: 'ELIGIBLE',
        },
      ]);
    }));
});

async function insertTerminalRun(input: {
  client: Client;
  quotedSchema: string;
  tenantId: string;
  runId: string;
  persistedAt: string;
}): Promise<void> {
  const { client, quotedSchema, tenantId, runId, persistedAt } = input;
  await client.query(
    `
      INSERT INTO ${quotedSchema}.run_metadata (
        run_id,
        tenant_id,
        project_id,
        environment_id,
        plan_id,
        plan_version,
        provider,
        provider_workflow_id,
        provider_run_id,
        logical_attempt_id,
        origin_run_id
      )
      VALUES ($1, $2, 'project-1', 'dev', 'plan-1', '1.0.0', 'mock', $3, $4, 1, $1)
    `,
    [runId, tenantId, `wf-${runId}`, `provider-${runId}`]
  );
  await client.query(
    `
      INSERT INTO ${quotedSchema}.run_events (
        run_id,
        run_seq,
        event_type,
        emitted_at,
        tenant_id,
        project_id,
        environment_id,
        engine_attempt_id,
        logical_attempt_id,
        plan_id,
        plan_version,
        persisted_at,
        idempotency_key,
        payload
      )
      VALUES (
        $1,
        1,
        'RunCompleted',
        $3::timestamptz,
        $2,
        'project-1',
        'dev',
        1,
        1,
        'plan-1',
        '1.0.0',
        $3::timestamptz,
        $1 || ':completed',
        jsonb_build_object('status', 'completed')
      )
    `,
    [runId, tenantId, persistedAt]
  );
  await client.query(
    `
      INSERT INTO ${quotedSchema}.run_snapshots (
        run_id,
        tenant_id,
        snapshot,
        last_run_seq,
        updated_at
      )
      VALUES ($1, $2, $3::jsonb, 1, $4::timestamptz)
    `,
    [runId, tenantId, JSON.stringify(makeTerminalSnapshot(runId)), NOW]
  );
}

function makeTerminalSnapshot(runId: string): WorkflowSnapshot {
  return {
    schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
    runId,
    status: 'COMPLETED',
    paused: false,
    cancelling: false,
    steps: {},
  };
}
