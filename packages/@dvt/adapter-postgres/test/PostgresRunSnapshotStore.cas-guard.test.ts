import { buildArchivedTerminalSnapshot, buildPinnedTerminalSnapshot } from '@dvt/state-store';
import { describe, expect, it } from 'vitest';

import { PostgresRunSnapshotStore } from '../src/PostgresRunSnapshotStore.js';
import type { EventEnvelope, WorkflowSnapshot } from '../src/types.js';

interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
}

class SnapshotUpsertClient {
  readonly queries: Array<{ sql: string; params?: unknown[] }> = [];

  constructor(
    private readonly state: {
      snapshot: WorkflowSnapshot;
      lastRunSeq: number;
      archiveUnitKey: string | null;
      eventChecksumSha256: string | null;
      archivedAt: string | null;
    }
  ) {}

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    this.queries.push({ sql, params });

    if (sql.includes('FROM "dvt".run_metadata')) {
      return { rows: [{ run_id: 'run-1' }] as T[], rowCount: 1 };
    }

    if (sql.includes('INSERT INTO "dvt".run_snapshots')) {
      const [, snapshotJson, lastRunSeq, , archiveUnitKey, eventChecksumSha256, archivedAt] =
        params ?? [];
      const incomingSeq = Number(lastRunSeq);
      const hasCasGuard = sql.includes('WHERE run_snapshots.last_run_seq <= EXCLUDED.last_run_seq');
      const shouldUpdate = !hasCasGuard || this.state.lastRunSeq <= incomingSeq;

      if (shouldUpdate) {
        this.state.snapshot = JSON.parse(snapshotJson as string) as WorkflowSnapshot;
        this.state.lastRunSeq = incomingSeq;
        if (archiveUnitKey !== undefined) {
          this.state.archiveUnitKey = (archiveUnitKey as string | null | undefined) ?? null;
        }
        if (eventChecksumSha256 !== undefined) {
          this.state.eventChecksumSha256 =
            (eventChecksumSha256 as string | null | undefined) ?? null;
        }
        if (archivedAt !== undefined) {
          this.state.archivedAt = (archivedAt as string | null | undefined) ?? null;
        }
      }

      return { rows: [] as T[], rowCount: shouldUpdate ? 1 : 0 };
    }

    if (
      sql.includes('FROM "dvt".run_snapshots s') &&
      sql.includes('s.archive_unit_key IS NOT NULL')
    ) {
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

    return { rows: [] as T[], rowCount: 0 };
  }

  get currentState() {
    return this.state;
  }
}

describe('PostgresRunSnapshotStore CAS guard', () => {
  it('does not regress snapshot state when persistWithClient receives a stale seq', async () => {
    const initialSnapshot = makeSnapshot('run-1', 'RUNNING');
    const client = new SnapshotUpsertClient({
      snapshot: initialSnapshot,
      lastRunSeq: 5,
      archiveUnitKey: null,
      eventChecksumSha256: null,
      archivedAt: null,
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-22T00:00:00.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );
    const staleSnapshot = makeSnapshot('run-1', 'FAILED');

    await store.persistWithClient(client as never, 'run-1', staleSnapshot, 4);

    expect(client.queries[0]?.sql).toContain(
      'WHERE run_snapshots.last_run_seq <= EXCLUDED.last_run_seq'
    );
    expect(client.currentState.lastRunSeq).toBe(5);
    expect(client.currentState.snapshot).toEqual(initialSnapshot);
  });

  it('allows equal seq to refresh snapshot state and archive metadata', async () => {
    const terminalSnapshot = makeSnapshot('run-1', 'COMPLETED');
    const pinned = buildPinnedTerminalSnapshot({
      snapshot: terminalSnapshot,
      events: [makeEvent({ runId: 'run-1', runSeq: 1 }), makeEvent({ runId: 'run-1', runSeq: 5 })],
    });
    const archived = buildArchivedTerminalSnapshot({
      tenantId: 'tenant-1',
      archiveUnitKey: 'tb07_2026_03_22',
      archivedAtIso: '2026-03-22T00:00:00.000Z',
      pinned,
    });
    const client = new SnapshotUpsertClient({
      snapshot: terminalSnapshot,
      lastRunSeq: 5,
      archiveUnitKey: null,
      eventChecksumSha256: null,
      archivedAt: null,
    });
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-22T00:00:01.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );

    await store.pinTerminalSnapshot(archived);

    expect(
      client.queries.some((entry) =>
        entry.sql.includes('WHERE run_snapshots.last_run_seq <= EXCLUDED.last_run_seq')
      )
    ).toBe(true);
    expect(client.currentState.lastRunSeq).toBe(5);
    expect(client.currentState.snapshot).toEqual(terminalSnapshot);
    expect(client.currentState.archiveUnitKey).toBe('tb07_2026_03_22');
    expect(client.currentState.eventChecksumSha256).toBe(pinned.eventChecksumSha256);
  });
});

function makeSnapshot(runId: string, status: WorkflowSnapshot['status']): WorkflowSnapshot {
  return {
    runId,
    status,
    paused: false,
    cancelling: false,
    gatewayDecisions: {},
    steps: {},
  };
}

function makeEvent(overrides: Partial<EventEnvelope> = {}): EventEnvelope {
  return {
    eventId: 'evt-1',
    eventType: 'RunQueued',
    runId: 'run-1',
    emittedAt: '2026-03-22T00:00:00.000Z',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    planId: 'plan-1',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: `run-1:${overrides.runSeq ?? 1}`,
    runSeq: 1,
    persistedAt: '2026-03-22T00:00:00.000Z',
    ...overrides,
  };
}
