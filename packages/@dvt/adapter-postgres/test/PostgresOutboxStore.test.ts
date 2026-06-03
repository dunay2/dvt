import { describe, expect, it } from 'vitest';

import { PostgresOutboxStore } from '../src/PostgresOutboxStore.js';
import type { EventEnvelope } from '../src/types.js';

import { NOW, makeEvent, rid } from './helpers/runEventFixtures.js';

class RecordingClient {
  public readonly queries: Array<{ sql: string; params?: unknown[] }> = [];

  async query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }> {
    this.queries.push({ sql, params });
    return { rows: [], rowCount: 0 };
  }
}

describe('PostgresOutboxStore', () => {
  it('persists tenant_id on outbox rows from the event envelope', async () => {
    const client = new RecordingClient();
    const store = new PostgresOutboxStore(
      'dvt',
      () => NOW,
      1,
      300_000,
      async (fn) => fn(client as never),
      async (fn) => fn(client as never)
    );
    const event = {
      ...makeEvent({
        runId: 'run-1',
        tenantId: 'tenant-a',
        eventType: 'RunQueued',
        idempotencyKey: 'run-1:queued',
      }),
      runSeq: 1,
      persistedAt: NOW,
    } as EventEnvelope;

    await store.enqueueWithClient(client as never, rid('run-1'), [event]);

    expect(client.queries[0]?.sql).toContain('tenant_id');
    expect(client.queries[0]?.params).toContain('tenant-a');
  });
});
