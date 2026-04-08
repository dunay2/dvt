import {
  CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
  type EventEnvelope,
  type WorkflowSnapshot,
} from '@dvt/contracts';
import { RunNotFoundError } from '@dvt/engine';
import { InvalidStateTransitionError } from '@dvt/run-domain';
import { buildArchivedTerminalSnapshot, buildPinnedTerminalSnapshot } from '@dvt/state-store';
import { describe, expect, it } from 'vitest';

import { PostgresRunSnapshotStore } from '../src/PostgresRunSnapshotStore.js';

interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
}

class ScriptedClient {
  readonly queries: Array<{ sql: string; params?: unknown[] }> = [];

  constructor(
    private readonly responder: <T>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>
  ) {}

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    this.queries.push({ sql, params });
    return this.responder<T>(sql, params);
  }
}

interface SnapshotState {
  snapshot: WorkflowSnapshot;
  lastRunSeq: number;
  archiveUnitKey: string | null;
  eventChecksumSha256: string | null;
  archivedAt: string | null;
}

class SnapshotUpsertClient {
  readonly queries: Array<{ sql: string; params?: unknown[] }> = [];

  constructor(private readonly state: SnapshotState) {}

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    this.queries.push({ sql, params });

    return (
      this.handleRunMetadataQuery<T>(sql) ??
      this.handleSnapshotUpsert<T>(sql, params) ??
      this.handleSnapshotSeqQuery<T>(sql) ??
      this.handlePinnedSnapshotQuery<T>(sql) ?? { rows: [] as T[], rowCount: 0 }
    );
  }

  private handleRunMetadataQuery<T>(sql: string): QueryResult<T> | undefined {
    if (!sql.includes('FROM "dvt".run_metadata')) {
      return undefined;
    }

    return { rows: [{ run_id: 'run-1' }] as T[], rowCount: 1 };
  }

  private handleSnapshotUpsert<T>(sql: string, params?: unknown[]): QueryResult<T> | undefined {
    if (!sql.includes('INSERT INTO "dvt".run_snapshots')) {
      return undefined;
    }

    const [, snapshotJson, lastRunSeq, , archiveUnitKey, eventChecksumSha256, archivedAt] =
      params ?? [];
    const incomingSeq = Number(lastRunSeq);
    const hasCasGuard = sql.includes('WHERE run_snapshots.last_run_seq <= EXCLUDED.last_run_seq');
    const shouldUpdate = !hasCasGuard || this.state.lastRunSeq <= incomingSeq;

    if (shouldUpdate) {
      this.state.snapshot = JSON.parse(snapshotJson as string) as WorkflowSnapshot;
      this.state.lastRunSeq = incomingSeq;
      this.updateArchiveMetadata(archiveUnitKey, eventChecksumSha256, archivedAt);
    }

    return { rows: [] as T[], rowCount: shouldUpdate ? 1 : 0 };
  }

  private handleSnapshotSeqQuery<T>(sql: string): QueryResult<T> | undefined {
    if (!(sql.includes('SELECT s.last_run_seq') && sql.includes('FROM "dvt".run_snapshots s'))) {
      return undefined;
    }

    return {
      rows: [{ last_run_seq: this.state.lastRunSeq }] as T[],
      rowCount: 1,
    };
  }

  private handlePinnedSnapshotQuery<T>(sql: string): QueryResult<T> | undefined {
    if (
      !sql.includes('FROM "dvt".run_snapshots s') ||
      !sql.includes('s.archive_unit_key IS NOT NULL')
    ) {
      return undefined;
    }

    if (this.state.archiveUnitKey === null) {
      return { rows: [] as T[], rowCount: 0 };
    }

    return {
      rows: [
        {
          snapshot: this.state.snapshot,
          last_run_seq: this.state.lastRunSeq,
          archive_unit_key: this.state.archiveUnitKey,
          event_checksum_sha256: this.state.eventChecksumSha256,
          archived_at: this.state.archivedAt,
        },
      ] as T[],
      rowCount: 1,
    };
  }

  private updateArchiveMetadata(
    archiveUnitKey: unknown,
    eventChecksumSha256: unknown,
    archivedAt: unknown
  ): void {
    if (archiveUnitKey !== undefined) {
      this.state.archiveUnitKey = (archiveUnitKey as string | null | undefined) ?? null;
    }
    if (eventChecksumSha256 !== undefined) {
      this.state.eventChecksumSha256 = (eventChecksumSha256 as string | null | undefined) ?? null;
    }
    if (archivedAt !== undefined) {
      this.state.archivedAt = (archivedAt as string | null | undefined) ?? null;
    }
  }

  get currentState(): SnapshotState {
    return this.state;
  }
}

describe('PostgresRunSnapshotStore', () => {
  it('reuses canonical projection guards during rebuildSnapshot', async () => {
    const client = new ScriptedClient(async <T>(sql: string) => {
      if (sql.includes('FROM "dvt".run_metadata')) {
        return { rows: [{ run_id: 'run-1' }] as T[], rowCount: 1 };
      }

      if (sql.includes('pg_advisory_xact_lock')) {
        return { rows: [] as T[], rowCount: 1 };
      }

      if (sql.includes('FROM "dvt".run_events') && sql.includes('ORDER BY run_seq ASC')) {
        return {
          rows: [
            {
              payload: {
                eventId: 'evt-1',
                runId: 'run-1',
                tenantId: 'tenant-1',
                eventType: 'RunCompleted',
                emittedAt: '2026-03-15T00:00:00.000Z',
                runSeq: 1,
                payload: {},
              },
            },
            {
              payload: {
                eventId: 'evt-2',
                runId: 'run-1',
                tenantId: 'tenant-1',
                eventType: 'RunFailed',
                emittedAt: '2026-03-15T00:00:01.000Z',
                runSeq: 2,
                payload: { reason: 'WORKFLOW_FAILURE' },
              },
            },
          ] as T[],
          rowCount: 2,
        };
      }

      if (sql.includes('COALESCE(MAX(run_seq), 0)')) {
        return { rows: [{ max_seq: 2 }] as T[], rowCount: 1 };
      }

      if (sql.includes('INSERT INTO "dvt".run_snapshots')) {
        throw new Error('persist should not be reached after invalid replay');
      }

      return { rows: [] as T[], rowCount: 0 };
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-15T00:00:02.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );

    await expect(store.rebuildSnapshot('tenant-1', 'run-1')).rejects.toBeInstanceOf(
      InvalidStateTransitionError
    );
    expect(
      client.queries.some((entry) => entry.sql.includes('INSERT INTO "dvt".run_snapshots'))
    ).toBe(false);
  });

  it('throws a typed run not found error when rebuildSnapshot misses tenant ownership', async () => {
    const client = new ScriptedClient(async <T>(sql: string) => {
      if (sql.includes('FROM "dvt".run_metadata')) {
        return { rows: [] as T[], rowCount: 0 };
      }

      if (sql.includes('pg_advisory_xact_lock')) {
        throw new Error('lock should not be acquired after tenant mismatch');
      }

      return { rows: [] as T[], rowCount: 0 };
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-15T00:00:02.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );

    await expect(store.rebuildSnapshot('tenant-2', 'run-404')).rejects.toMatchObject({
      name: 'RunNotFoundError',
      runId: 'run-404',
    });
    expect(client.queries.some((entry) => entry.sql.includes('pg_advisory_xact_lock'))).toBe(false);
  });

  it('rebuilds snapshot when persisted schemaVersion is outdated', async () => {
    const client = new ScriptedClient(async <T>(sql: string) => {
      if (isSnapshotReadQuery(sql)) {
        return {
          rows: [
            {
              snapshot: {
                schemaVersion: 0,
                runId: 'run-1',
                status: 'PENDING',
                paused: false,
                cancelling: false,
                gatewayDecisions: {},
                steps: {},
              } satisfies WorkflowSnapshot,
              last_run_seq: 0,
              latest_run_seq: 0,
            },
          ] as T[],
          rowCount: 1,
        };
      }

      if (sql.includes('FROM "dvt".run_metadata')) {
        return { rows: [{ run_id: 'run-1' }] as T[], rowCount: 1 };
      }

      if (sql.includes('pg_advisory_xact_lock')) {
        return { rows: [] as T[], rowCount: 1 };
      }

      if (sql.includes('FROM "dvt".run_events') && sql.includes('ORDER BY run_seq ASC')) {
        return { rows: [] as T[], rowCount: 0 };
      }

      if (sql.includes('COALESCE(MAX(run_seq), 0)')) {
        return { rows: [{ max_seq: 0 }] as T[], rowCount: 1 };
      }

      if (sql.includes('INSERT INTO "dvt".run_snapshots')) {
        return { rows: [] as T[], rowCount: 1 };
      }

      return { rows: [] as T[], rowCount: 0 };
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-20T00:00:01.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );

    const snapshot = await store.getSnapshot('tenant-1', 'run-1');

    expect(snapshot).not.toBeNull();
    expect(snapshot?.schemaVersion).toBe(CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION);
    expect(client.queries.some((entry) => entry.sql.includes('ORDER BY run_seq ASC'))).toBe(true);
  });

  it('rebuilds snapshot when persisted rows still use legacy flat outcome fields', async () => {
    const client = new ScriptedClient(async <T>(sql: string) => {
      if (isSnapshotReadQuery(sql)) {
        return {
          rows: [
            {
              snapshot: {
                schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
                runId: 'run-1',
                status: 'RUNNING',
                paused: false,
                cancelling: false,
                currentStepId: 'step-legacy',
                errorReason: 'LEGACY_SHAPE',
                gatewayDecisions: {},
                steps: {},
              } as T,
              last_run_seq: 0,
              latest_run_seq: 0,
            },
          ],
          rowCount: 1,
        };
      }

      if (sql.includes('FROM "dvt".run_metadata')) {
        return { rows: [{ run_id: 'run-1' }] as T[], rowCount: 1 };
      }

      if (sql.includes('pg_advisory_xact_lock')) {
        return { rows: [] as T[], rowCount: 1 };
      }

      if (sql.includes('FROM "dvt".run_events') && sql.includes('ORDER BY run_seq ASC')) {
        return { rows: [] as T[], rowCount: 0 };
      }

      if (sql.includes('COALESCE(MAX(run_seq), 0)')) {
        return { rows: [{ max_seq: 0 }] as T[], rowCount: 1 };
      }

      if (sql.includes('INSERT INTO "dvt".run_snapshots')) {
        return { rows: [] as T[], rowCount: 1 };
      }

      return { rows: [] as T[], rowCount: 0 };
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-20T00:00:01.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );

    const snapshot = await store.getSnapshot('tenant-1', 'run-1');

    expect(snapshot).not.toBeNull();
    expect(snapshot?.schemaVersion).toBe(CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION);
    expect(client.queries.some((entry) => entry.sql.includes('ORDER BY run_seq ASC'))).toBe(true);
  });

  it('applies tail events when the persisted snapshot lags without persisting inline', async () => {
    const client = new ScriptedClient(async <T>(sql: string) => {
      if (isSnapshotReadQuery(sql)) {
        return {
          rows: [
            {
              snapshot: {
                schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
                runId: 'run-1',
                status: 'PENDING',
                paused: false,
                cancelling: false,
                gatewayDecisions: {},
                steps: {},
              } satisfies WorkflowSnapshot,
              last_run_seq: 1,
              latest_run_seq: 3,
            },
          ] as T[],
          rowCount: 1,
        };
      }

      if (sql.includes('FROM "dvt".run_events') && sql.includes('run_seq > $3')) {
        return {
          rows: [
            {
              payload: makeEvent({
                runId: 'run-1',
                runSeq: 2,
                eventType: 'RunStarted',
              }),
            },
            {
              payload: makeEvent({
                runId: 'run-1',
                runSeq: 3,
                eventType: 'RunCancelRequested',
              }),
            },
          ] as T[],
          rowCount: 2,
        };
      }

      if (sql.includes('INSERT INTO "dvt".run_snapshots')) {
        throw new Error('getSnapshot should not persist inline catch-up');
      }

      return { rows: [] as T[], rowCount: 0 };
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-20T00:00:01.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );

    const snapshot = await store.getSnapshot('tenant-1', 'run-1');

    expect(snapshot).toMatchObject({
      schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
      runId: 'run-1',
      status: 'RUNNING',
      cancelling: true,
    });
    expect(client.queries.some((entry) => entry.sql.includes('run_seq > $3'))).toBe(true);
    expect(
      client.queries.some((entry) => entry.sql.includes('INSERT INTO "dvt".run_snapshots'))
    ).toBe(false);
  });

  it('pins terminal snapshots into run_snapshots with archive metadata', async () => {
    const client = new ScriptedClient(async <T>(sql: string) => {
      if (sql.includes('FROM "dvt".run_metadata')) {
        return { rows: [{ run_id: 'run-1' }] as T[], rowCount: 1 };
      }

      if (sql.includes('INSERT INTO "dvt".run_snapshots')) {
        return { rows: [] as T[], rowCount: 1 };
      }

      return { rows: [] as T[], rowCount: 0 };
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-20T00:00:01.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );
    const snapshot = {
      schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
      runId: 'run-1',
      status: 'COMPLETED' as const,
      startedAt: '2026-03-19T00:00:00.000Z',
      completedAt: '2026-03-19T00:10:00.000Z',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };
    const pinned = buildPinnedTerminalSnapshot({
      snapshot,
      events: [makeEvent({ runId: 'run-1', runSeq: 1 }), makeEvent({ runId: 'run-1', runSeq: 2 })],
    });
    const archived = buildArchivedTerminalSnapshot({
      tenantId: 'tenant-1',
      archiveUnitKey: 'tb07_2026_03_19',
      archivedAtIso: '2026-03-20T00:00:00.000Z',
      pinned,
    });

    const result = await store.pinTerminalSnapshot(archived);

    const upsert = client.queries.find((entry) =>
      entry.sql.includes('INSERT INTO "dvt".run_snapshots')
    );
    expect(upsert).toBeDefined();
    expect(upsert?.sql).toContain('WHERE run_snapshots.last_run_seq <= EXCLUDED.last_run_seq');
    expect(upsert?.params).toEqual([
      'run-1',
      JSON.stringify(snapshot),
      2,
      '2026-03-20T00:00:01.000Z',
      'tb07_2026_03_19',
      archived.eventChecksumSha256,
      '2026-03-20T00:00:00.000Z',
    ]);
    expect(result).toEqual({
      outcome: 'APPLIED',
      tenantId: 'tenant-1',
      runId: 'run-1',
      archiveUnitKey: 'tb07_2026_03_19',
      incomingLastRunSeq: 2,
      storedLastRunSeq: 2,
    });
  });

  it('surfaces a discarded terminal snapshot pin when the stored seq is newer', async () => {
    const existingSnapshot = {
      schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
      runId: 'run-1',
      status: 'COMPLETED' as const,
      startedAt: '2026-03-19T00:00:00.000Z',
      completedAt: '2026-03-19T00:10:00.000Z',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };
    const client = new SnapshotUpsertClient({
      snapshot: existingSnapshot,
      lastRunSeq: 5,
      archiveUnitKey: 'tb07_2026_03_19',
      eventChecksumSha256: 'c'.repeat(64),
      archivedAt: '2026-03-20T00:00:00.000Z',
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-20T00:00:01.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );
    const staleSnapshot = buildArchivedTerminalSnapshot({
      tenantId: 'tenant-1',
      archiveUnitKey: 'tb07_2026_03_19',
      archivedAtIso: '2026-03-20T00:00:00.000Z',
      pinned: buildPinnedTerminalSnapshot({
        snapshot: {
          schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
          runId: 'run-1',
          status: 'FAILED',
          startedAt: '2026-03-19T00:00:00.000Z',
          completedAt: '2026-03-19T00:11:00.000Z',
          paused: false,
          cancelling: false,
          gatewayDecisions: {},
          steps: {},
        },
        events: [
          makeEvent({ runId: 'run-1', runSeq: 1 }),
          makeEvent({ runId: 'run-1', runSeq: 4 }),
        ],
      }),
    });

    const result = await store.pinTerminalSnapshot(staleSnapshot);

    expect(result).toEqual({
      outcome: 'DISCARDED_STALE_SEQUENCE',
      tenantId: 'tenant-1',
      runId: 'run-1',
      archiveUnitKey: 'tb07_2026_03_19',
      incomingLastRunSeq: 4,
      storedLastRunSeq: 5,
    });
    expect(client.currentState.lastRunSeq).toBe(5);
    expect(client.currentState.snapshot).toEqual(existingSnapshot);
  });

  it('fails loudly when a discarded pin cannot read the stored seq', async () => {
    const client = new ScriptedClient(async <T>(sql: string) => {
      if (sql.includes('FROM "dvt".run_metadata')) {
        return { rows: [{ run_id: 'run-1' }] as T[], rowCount: 1 };
      }

      if (sql.includes('INSERT INTO "dvt".run_snapshots')) {
        return { rows: [] as T[], rowCount: 0 };
      }

      if (sql.includes('SELECT s.last_run_seq') && sql.includes('FROM "dvt".run_snapshots s')) {
        return { rows: [] as T[], rowCount: 0 };
      }

      return { rows: [] as T[], rowCount: 0 };
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-20T00:00:01.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );
    const staleSnapshot = buildArchivedTerminalSnapshot({
      tenantId: 'tenant-1',
      archiveUnitKey: 'tb07_2026_03_19',
      archivedAtIso: '2026-03-20T00:00:00.000Z',
      pinned: buildPinnedTerminalSnapshot({
        snapshot: {
          schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
          runId: 'run-1',
          status: 'FAILED',
          startedAt: '2026-03-19T00:00:00.000Z',
          completedAt: '2026-03-19T00:11:00.000Z',
          paused: false,
          cancelling: false,
          gatewayDecisions: {},
          steps: {},
        },
        events: [
          makeEvent({ runId: 'run-1', runSeq: 1 }),
          makeEvent({ runId: 'run-1', runSeq: 4 }),
        ],
      }),
    });

    await expect(store.pinTerminalSnapshot(staleSnapshot)).rejects.toThrow(
      /ARCHIVE_TERMINAL_SNAPSHOT_PIN_DISCARDED_WITHOUT_ROW: run-1/
    );
  });

  it('rejects pinning when the tenant does not own the run', async () => {
    const client = new ScriptedClient(async <T>(sql: string) => {
      if (sql.includes('FROM "dvt".run_metadata')) {
        return { rows: [] as T[], rowCount: 0 };
      }

      if (sql.includes('INSERT INTO "dvt".run_snapshots')) {
        throw new Error('pin should not upsert after tenant mismatch');
      }

      return { rows: [] as T[], rowCount: 0 };
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-20T00:00:01.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );
    const archived = buildArchivedTerminalSnapshot({
      tenantId: 'tenant-2',
      archiveUnitKey: 'tb07_2026_03_19',
      archivedAtIso: '2026-03-20T00:00:00.000Z',
      pinned: buildPinnedTerminalSnapshot({
        snapshot: {
          schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
          runId: 'run-1',
          status: 'FAILED',
          startedAt: '2026-03-19T00:00:00.000Z',
          completedAt: '2026-03-19T00:01:00.000Z',
          paused: false,
          cancelling: false,
          gatewayDecisions: {},
          steps: {},
        },
        events: [makeEvent({ runId: 'run-1', runSeq: 1 })],
      }),
    });

    await expect(store.pinTerminalSnapshot(archived)).rejects.toBeInstanceOf(RunNotFoundError);
    expect(
      client.queries.some((entry) => entry.sql.includes('INSERT INTO "dvt".run_snapshots'))
    ).toBe(false);
  });

  it('reads pinned terminal snapshots tenant-safely', async () => {
    const snapshot = {
      schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
      runId: 'run-1',
      status: 'CANCELLED' as const,
      startedAt: '2026-03-19T00:00:00.000Z',
      completedAt: '2026-03-19T00:04:00.000Z',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };
    const pinned = buildPinnedTerminalSnapshot({
      snapshot,
      events: [makeEvent({ runId: 'run-1', runSeq: 1 }), makeEvent({ runId: 'run-1', runSeq: 2 })],
    });
    const client = new ScriptedClient(async <T>(sql: string) => {
      if (
        sql.includes('FROM "dvt".run_snapshots s') &&
        sql.includes('s.archive_unit_key IS NOT NULL')
      ) {
        return {
          rows: [
            {
              snapshot,
              last_run_seq: 2,
              archive_unit_key: 'tb07_2026_03_19',
              event_checksum_sha256: pinned.eventChecksumSha256,
              archived_at: '2026-03-20T00:00:00.000Z',
            },
          ] as T[],
          rowCount: 1,
        };
      }

      return { rows: [] as T[], rowCount: 0 };
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-20T00:00:01.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );

    await expect(store.getPinnedTerminalSnapshot('tenant-1', 'run-1')).resolves.toEqual({
      tenantId: 'tenant-1',
      archiveUnitKey: 'tb07_2026_03_19',
      archivedAt: '2026-03-20T00:00:00.000Z',
      runId: 'run-1',
      status: 'CANCELLED',
      lastRunSeq: 2,
      eventChecksumSha256: pinned.eventChecksumSha256,
      snapshot,
    });
  });
});

function makeEvent(overrides: Partial<EventEnvelope> = {}): EventEnvelope {
  return {
    eventId: 'evt-1',
    eventType: 'RunQueued',
    runId: 'run-default',
    emittedAt: '2026-03-19T00:00:00.000Z',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    planId: 'plan-1',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: `${overrides.runId ?? 'run-default'}:${overrides.runSeq ?? 1}`,
    runSeq: 1,
    persistedAt: '2026-03-19T00:00:00.000Z',
    ...overrides,
  };
}

function isSnapshotReadQuery(sql: string): boolean {
  return (
    sql.includes('s.snapshot') &&
    sql.includes('FROM "dvt".run_metadata m') &&
    sql.includes('LEFT JOIN "dvt".run_snapshots s ON s.run_id = m.run_id')
  );
}
