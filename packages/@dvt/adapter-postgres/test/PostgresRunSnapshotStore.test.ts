import type { EventEnvelope } from '@dvt/contracts';
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
                payload: {},
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

    await store.pinTerminalSnapshot(archived);

    const upsert = client.queries.find((entry) =>
      entry.sql.includes('INSERT INTO "dvt".run_snapshots')
    );
    expect(upsert).toBeDefined();
    expect(upsert?.params).toEqual([
      'run-1',
      JSON.stringify(snapshot),
      2,
      '2026-03-20T00:00:01.000Z',
      'tb07_2026_03_19',
      archived.eventChecksumSha256,
      '2026-03-20T00:00:00.000Z',
    ]);
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

    await expect(store.pinTerminalSnapshot(archived)).rejects.toThrow(/RUN_NOT_FOUND: run-1/);
    expect(
      client.queries.some((entry) => entry.sql.includes('INSERT INTO "dvt".run_snapshots'))
    ).toBe(false);
  });

  it('reads pinned terminal snapshots tenant-safely', async () => {
    const snapshot = {
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
