import { Client } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

import { PostgresBackpressureSnapshotReader, PostgresStateStoreAdapter } from '../src/index.js';
import { setTenantContextSql } from '../src/PostgresTenantIsolationPolicy.js';
import { quoteIdentifier } from '../src/sqlUtils.js';
import type { RunBootstrapInput } from '../src/types.js';

const NOW = '2026-03-19T12:00:00.000Z';
const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
const describeIfPg = runIntegration ? describe : describe.skip;

interface RecordedQuery {
  readonly text: string;
  readonly values: unknown[] | undefined;
  readonly signal?: unknown;
}

class RecordingClient {
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
  }): Promise<{ rows: T[] }>;
  public async query<T>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
  public async query<T>(
    input: string | { text: string; values?: unknown[]; signal?: unknown },
    values?: unknown[]
  ): Promise<{ rows: T[] }> {
    const recorded = typeof input === 'string' ? { text: input, values } : input;
    this.queries.push(recorded);
    if (
      recorded.text === 'BEGIN' ||
      recorded.text === 'COMMIT' ||
      recorded.text === 'ROLLBACK' ||
      recorded.text.includes("set_config('dvt.access_mode'")
    ) {
      return { rows: [] };
    }
    return { rows: this.rows as T[] };
  }

  public release(): void {
    return undefined;
  }
}

class RecordingPool {
  public readonly client: RecordingClient;

  public constructor(rows: unknown[]) {
    this.client = new RecordingClient(rows);
  }

  public get queries(): readonly RecordedQuery[] {
    return this.client.queries;
  }

  public async connect(): Promise<RecordingClient> {
    return this.client;
  }

  public async query(): Promise<never> {
    throw new Error('DIRECT_POOL_QUERY_FORBIDDEN');
  }

  public async end(): Promise<void> {
    return undefined;
  }
}

describe('PostgresBackpressureSnapshotReader', () => {
  it('fails fast when connection string sources are missing and no pool is provided', () => {
    const previousPgUrl = process.env.DVT_PG_URL;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DVT_PG_URL;
    delete process.env.DATABASE_URL;

    try {
      expect(
        () =>
          new PostgresBackpressureSnapshotReader({
            schema: 'dvt',
            now: () => NOW,
            stuckEventAgeThresholdMs: 60_000,
            localOverloadPendingThreshold: 2,
          })
      ).toThrow(/POSTGRES_CONNECTION_STRING_REQUIRED/);
    } finally {
      if (typeof previousPgUrl === 'undefined') {
        delete process.env.DVT_PG_URL;
      } else {
        process.env.DVT_PG_URL = previousPgUrl;
      }
      if (typeof previousDatabaseUrl === 'undefined') {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }
    }
  });

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

    const sqls = pool.queries.map((query) => query.text);
    const snapshotQuery = pool.queries.find((query) => query.text.includes('"dvt".outbox'));
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls.some((sql) => sql.includes("set_config('dvt.access_mode', 'service', true)"))).toBe(
      true
    );
    expect(snapshotQuery?.values).toEqual(['tenant-a', NOW, '2026-03-12T12:00:00.000Z', 20]);
    expect(snapshotQuery?.signal).toBeDefined();
    expect(sqls.at(-1)).toBe('COMMIT');
  });

  it('uses tenant-aware joins for backpressure aggregates', async () => {
    const pool = new RecordingPool([
      {
        tenant_active_pending_event_count: 0,
        tenant_stuck_pending_event_count: 0,
        global_active_pending_event_count: 0,
        global_healthy_tenant_oldest_active_age_ms: 0,
      },
    ]);
    const reader = new PostgresBackpressureSnapshotReader({
      pool: pool as never,
      schema: 'dvt',
      now: () => NOW,
      stuckEventAgeThresholdMs: 60_000,
      localOverloadPendingThreshold: 2,
    });

    await reader.getTenantSnapshot('tenant-a');

    const snapshotQuery = pool.queries.find((query) => query.text.includes('"dvt".outbox'));
    expect(snapshotQuery?.text).toContain('ON m.run_id = o.run_id');
    expect(snapshotQuery?.text).toContain('AND m.tenant_id = o.tenant_id');
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
    const snapshotQuery = pool.queries.find((query) => query.text.includes('"dvt".outbox'));
    expect(snapshotQuery?.signal).toBeUndefined();
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

      await setOutboxCreatedAt(
        client,
        schema,
        'tenant-noisy',
        'run-noisy-1',
        '2026-03-19T11:55:00.000Z'
      );
      await setOutboxCreatedAt(
        client,
        schema,
        'tenant-noisy',
        'run-noisy-2',
        '2026-03-19T11:56:00.000Z'
      );
      await setOutboxCreatedAt(
        client,
        schema,
        'tenant-noisy',
        'run-noisy-3',
        '2026-03-19T11:57:00.000Z'
      );
      await setOutboxCreatedAt(
        client,
        schema,
        'tenant-noisy',
        'run-noisy-stuck',
        '2026-03-01T12:00:00.000Z'
      );
      await setOutboxCreatedAt(
        client,
        schema,
        'tenant-healthy',
        'run-healthy-1',
        '2026-03-19T11:58:00.000Z'
      );

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
  }, 30000);
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
      providerRef: {
        provider: 'temporal',
        tenantId,
        namespace: 'default',
        workflowId: `wf-${runId}`,
        runId: `pr-${runId}`,
      },
    },
    firstEvents: [
      {
        eventId: `${runId}:queued`,
        payloadVersion: 1,
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
  tenantId: string,
  runId: string,
  createdAt: string
): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(setTenantContextSql(), [tenantId]);
    await client.query(
      `
        UPDATE ${quoteIdentifier(schema)}.outbox
        SET created_at = $3::timestamptz
        WHERE run_id = $1
          AND tenant_id = $2
      `,
      [runId, tenantId, createdAt]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
