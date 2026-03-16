import { InvalidStateTransitionError } from '@dvt/run-domain';
import { describe, expect, it } from 'vitest';

import { PostgresRunSnapshotStore } from '../src/PostgresRunSnapshotStore.js';

interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
}

class RecordingClient {
  readonly queries: string[] = [];

  async query<T = unknown>(sql: string, _params?: unknown[]): Promise<QueryResult<T>> {
    this.queries.push(sql);

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
  }
}

describe('PostgresRunSnapshotStore', () => {
  it('reuses canonical projection guards during rebuildSnapshot', async () => {
    const client = new RecordingClient();
    const store = new PostgresRunSnapshotStore(
      'dvt',
      () => '2026-03-15T00:00:02.000Z',
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );

    await expect(store.rebuildSnapshot('tenant-1', 'run-1')).rejects.toBeInstanceOf(
      InvalidStateTransitionError
    );
    expect(client.queries.some((sql) => sql.includes('INSERT INTO "dvt".run_snapshots'))).toBe(
      false
    );
  });
});
