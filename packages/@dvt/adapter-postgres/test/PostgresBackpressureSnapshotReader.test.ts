import { Client } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

import { PostgresBackpressureSnapshotReader, PostgresStateStoreAdapter } from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';
import type { RunBootstrapInput } from '../src/types.js';

const NOW = '2026-03-19T12:00:00.000Z';
const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
const describeIfPg = runIntegration ? describe : describe.skip;

class RecordingPool {
  public readonly queries: Array<{
    readonly text: string;
    readonly values: unknown[] | undefined;
    readonly signal?: unknown;
  }> = [];

  public constructor(private readonly rows: unknown[]) {}

  public async query<T>(input: {
    text: string;
    values?: unknown[];
    signal?: unknown;
  }): Promise<{ rows: T[] }> {
    this.queries.push(input);
    return { rows: this.rows as T[] };
  }

  public async end(): Promise<void> {
    return undefined;
  }
}

describe('PostgresBackpressureSnapshotReader', () => {
  it('rejects empty tenant scope before querying storage', async () => {
    const pool = new RecordingPool([]);
    const reader = new PostgresBackpressureSnapshotReader({
      pool: pool as never,
      schema: 'dvt',
      now: () => NOW,
      stuckEventAgeThresholdMs: 60_000,
      localOverloadPendingThreshold: 2,
    });

    await expect(reader.getTenantSnapshot('   ')).rejects.toThrow(/TENANT_SCOPE_REQUIRED/);
    expect(pool.queries).toHaveLength(0);
  });

  it('maps snapshot rows and applies timeout signal when configured', async () => {
    const pool = new RecordingPool([
      {
        tenant_active_pending_event_count: '3',
        tenant_stuck_pending_event_count: '1',
        global_active_pending_event_count: '8',
        global_healthy_tenant_oldest_active_age_ms: '1200',
      },
    ]);
    const reader = new PostgresBackpressureSnapshotReader({
      pool: pool as never,
      schema: 'dvt',
      now: () => NOW,
      queryTimeoutMs: 250,
      stuckEventAgeThresholdMs: 7 * 24 * 60 * 60 * 1000,
      localOverloadPendingThreshold: 20,
    });

    await expect(reader.getTenantSnapshot('tenant-a')).resolves.toEqual({
      tenantActivePendingEventCount: 3,
      tenantStuckPendingEventCount: 1,
      globalActivePendingEventCount: 8,
      globalHealthyTenantOldestActiveAgeMs: 1200,
    });

    expect(pool.queries).toHaveLength(1);
    expect(pool.queries[0]?.text).toContain('"dvt".outbox');
    expect(pool.queries[0]?.values).toEqual(['tenant-a', NOW, '2026-03-12T12:00:00.000Z', 20]);
    expect(pool.queries[0]?.signal).toBeDefined();
  });

  it('returns zero-valued snapshot when aggregates are absent', async () => {
    const pool = new RecordingPool([
      {
        tenant_active_pending_event_count: null,
        tenant_stuck_pending_event_count: null,
        global_active_pending_event_count: null,
        global_healthy_tenant_oldest_active_age_ms: null,
      },
    ]);
    const reader = new PostgresBackpressureSnapshotReader({
      pool: pool as never,
      schema: 'dvt',
      now: () => NOW,
      stuckEventAgeThresholdMs: 60_000,
      localOverloadPendingThreshold: 2,
    });

    await expect(reader.getTenantSnapshot('tenant-a')).resolves.toEqual({
      tenantActivePendingEventCount: 0,
      tenantStuckPendingEventCount: 0,
      globalActivePendingEventCount: 0,
      globalHealthyTenantOldestActiveAgeMs: 0,
    });
    expect(pool.queries[0]?.signal).toBeUndefined();
  });
});

describeIfPg('PostgresBackpressureSnapshotReader integration', () => {
  const schema = `dvt_backpressure_it_${Date.now()}`;

  afterAll(async () => {
    const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
    if (!connectionString) return;
    const client = new Client({ connectionString });
    await client.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    } finally {
      await client.end();
    }
  });

  it('separates active and stuck backlog while excluding noisy tenants from shared age', async () => {
    const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DVT_PG_URL or DATABASE_URL is required for integration tests');
    }

    const adapter = new PostgresStateStoreAdapter({
      connectionString,
      schema,
      now: () => NOW,
    });
    const reader = new PostgresBackpressureSnapshotReader({
      connectionString,
      schema,
      now: () => NOW,
      stuckEventAgeThresholdMs: 7 * 24 * 60 * 60 * 1000,
      localOverloadPendingThreshold: 2,
    });
    const client = new Client({ connectionString });

    await client.connect();
    try {
      await adapter.migrate();

      await bootstrapRun(adapter, 'tenant-noisy', 'run-noisy-1');
      await bootstrapRun(adapter, 'tenant-noisy', 'run-noisy-2');
      await bootstrapRun(adapter, 'tenant-noisy', 'run-noisy-3');
      await bootstrapRun(adapter, 'tenant-noisy', 'run-noisy-stuck');
      await bootstrapRun(adapter, 'tenant-healthy', 'run-healthy-1');

      await setOutboxCreatedAt(client, schema, 'run-noisy-1', '2026-03-19T11:55:00.000Z');
      await setOutboxCreatedAt(client, schema, 'run-noisy-2', '2026-03-19T11:56:00.000Z');
      await setOutboxCreatedAt(client, schema, 'run-noisy-3', '2026-03-19T11:57:00.000Z');
      await setOutboxCreatedAt(client, schema, 'run-noisy-stuck', '2026-03-01T12:00:00.000Z');
      await setOutboxCreatedAt(client, schema, 'run-healthy-1', '2026-03-19T11:58:00.000Z');

      await expect(reader.getTenantSnapshot('tenant-noisy')).resolves.toEqual({
        tenantActivePendingEventCount: 3,
        tenantStuckPendingEventCount: 1,
        globalActivePendingEventCount: 4,
        globalHealthyTenantOldestActiveAgeMs: 120000,
      });

      await expect(reader.getTenantSnapshot('tenant-healthy')).resolves.toEqual({
        tenantActivePendingEventCount: 1,
        tenantStuckPendingEventCount: 0,
        globalActivePendingEventCount: 4,
        globalHealthyTenantOldestActiveAgeMs: 120000,
      });
    } finally {
      await client.end();
      await reader.close();
      await adapter.close();
    }
  });
});

async function bootstrapRun(
  adapter: PostgresStateStoreAdapter,
  tenantId: string,
  runId: string
): Promise<void> {
  const input: RunBootstrapInput = {
    metadata: {
      tenantId,
      projectId: 'project-1',
      environmentId: 'dev',
      runId,
      planId: 'plan-1',
      planVersion: '1.0.0',
      logicalAttemptId: 1,
      provider: 'mock',
      providerWorkflowId: `wf-${runId}`,
      providerRunId: `pr-${runId}`,
    },
    firstEvents: [
      {
        eventId: `${runId}:queued`,
        eventType: 'RunQueued',
        runId,
        tenantId,
        projectId: 'project-1',
        environmentId: 'dev',
        planId: 'plan-1',
        planVersion: '1.0.0',
        engineAttemptId: 1,
        logicalAttemptId: 1,
        emittedAt: NOW,
        idempotencyKey: `${runId}:queued`,
        payload: {},
      },
    ],
  };

  await adapter.bootstrapRunTx(input);
}

async function setOutboxCreatedAt(
  client: Client,
  schema: string,
  runId: string,
  createdAt: string
): Promise<void> {
  await client.query(
    `UPDATE ${quoteIdentifier(schema)}.outbox SET created_at = $2::timestamptz WHERE run_id = $1`,
    [runId, createdAt]
  );
}
