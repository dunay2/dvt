import { describe, expect, it } from 'vitest';

import {
  createRecordingLineageOutboxStore,
  NOW,
  makePayload,
  RecordingClient,
} from './helpers/lineageOutboxUnitSupport.js';

describe('PostgresLineageOutboxStore dead-letter operations', () => {
  it('listDeadLetter requires tenant scope', async () => {
    const client = new RecordingClient();
    const store = createRecordingLineageOutboxStore(client);

    await expect(store.listDeadLetter(10, '')).rejects.toThrow('TENANT_SCOPE_REQUIRED');
    await expect(store.listDeadLetter(10, '   ')).rejects.toThrow('TENANT_SCOPE_REQUIRED');
    await expect(store.listDeadLetter(10, undefined as unknown as string)).rejects.toThrow(
      'TENANT_SCOPE_REQUIRED'
    );
    await expect(store.listDeadLetter(10, null as unknown as string)).rejects.toThrow(
      'TENANT_SCOPE_REQUIRED'
    );
  });

  it('listDeadLetter filters by tenant and maps tenantId', async () => {
    const client = new RecordingClient();
    client.enqueueRows([
      {
        id: 'ldl-1',
        original_id: 'lox-1',
        tenant_id: 'tenant-a',
        run_id: 'run-1',
        event_type: 'StepStarted',
        payload: makePayload('evt-dl'),
        last_error: 'terminal failure',
        dead_lettered_at: NOW,
      },
    ]);
    const store = createRecordingLineageOutboxStore(client);

    const records = await store.listDeadLetter(10, 'tenant-a');

    expect(records).toEqual([
      {
        id: 'ldl-1',
        originalId: 'lox-1',
        tenantId: 'tenant-a',
        runId: 'run-1',
        eventType: 'StepStarted',
        payload: makePayload('evt-dl'),
        lastError: 'terminal failure',
        deadLetteredAt: NOW,
      },
    ]);
    expect(client.queries).toHaveLength(1);
    expect(client.queries[0]?.params).toEqual([10, 'tenant-a']);
  });

  it('listDeadLetter rejects invalid limits', async () => {
    const client = new RecordingClient();
    const store = createRecordingLineageOutboxStore(client);

    await expect(store.listDeadLetter(Number.NaN, 'tenant-a')).rejects.toThrow(
      'INVALID_LINEAGE_DEAD_LETTER_LIMIT'
    );
    await expect(store.listDeadLetter(-1, 'tenant-a')).rejects.toThrow(
      'INVALID_LINEAGE_DEAD_LETTER_LIMIT'
    );
    await expect(store.listDeadLetter(1.5, 'tenant-a')).rejects.toThrow(
      'INVALID_LINEAGE_DEAD_LETTER_LIMIT'
    );
  });

  it('countDeadLetter requires tenant scope', async () => {
    const client = new RecordingClient();
    const store = createRecordingLineageOutboxStore(client);

    await expect(store.countDeadLetter('')).rejects.toThrow('TENANT_SCOPE_REQUIRED');
    await expect(store.countDeadLetter('   ')).rejects.toThrow('TENANT_SCOPE_REQUIRED');
    await expect(store.countDeadLetter(undefined as unknown as string)).rejects.toThrow(
      'TENANT_SCOPE_REQUIRED'
    );
    await expect(store.countDeadLetter(null as unknown as string)).rejects.toThrow(
      'TENANT_SCOPE_REQUIRED'
    );
  });

  it('countDeadLetter returns tenant-scoped dead-letter count', async () => {
    const client = new RecordingClient();
    client.enqueueRows([{ dead_letter_count: 7 }]);
    const store = createRecordingLineageOutboxStore(client);

    const count = await store.countDeadLetter('tenant-a');

    expect(count).toBe(7);
    expect(client.queries).toHaveLength(1);
    expect(client.queries[0]?.sql).toContain('FROM "dvt".lineage_dead_letter');
    expect(client.queries[0]?.params).toEqual(['tenant-a']);
  });

  it('replayDeadLetters requeues dead-letter rows and clears them from lineage_dead_letter', async () => {
    const client = new RecordingClient();
    client.enqueueRows([{ moved_count: 2 }]);
    const store = createRecordingLineageOutboxStore(client);

    const moved = await store.replayDeadLetters({
      tenantId: 'tenant-a',
      limit: 10,
      runId: 'run-1',
      eventType: 'StepStarted',
    });

    expect(moved).toBe(2);
    expect(client.queries).toHaveLength(1);
    const query = client.queries[0];
    expect(query?.sql).toContain('INSERT INTO "dvt".lineage_outbox');
    expect(query?.sql).toContain('ON CONFLICT (id) DO UPDATE');
    expect(query?.sql).toContain('DELETE FROM "dvt".lineage_dead_letter');
    expect(query?.params).toEqual(['tenant-a', 10, 'run-1', 'StepStarted', NOW]);
  });

  it('replayDeadLetters validates required scopes and limits', async () => {
    const client = new RecordingClient();
    const store = createRecordingLineageOutboxStore(client);

    await expect(store.replayDeadLetters({ tenantId: '', limit: 10 })).rejects.toThrow(
      'TENANT_SCOPE_REQUIRED'
    );
    await expect(
      store.replayDeadLetters({ tenantId: undefined as unknown as string, limit: 10 })
    ).rejects.toThrow('TENANT_SCOPE_REQUIRED');
    await expect(
      store.replayDeadLetters({ tenantId: null as unknown as string, limit: 10 })
    ).rejects.toThrow('TENANT_SCOPE_REQUIRED');
    await expect(
      store.replayDeadLetters({ tenantId: 'tenant-a', limit: Number.NaN })
    ).rejects.toThrow('INVALID_LINEAGE_DEAD_LETTER_REPLAY_LIMIT');
    await expect(
      store.replayDeadLetters({ tenantId: 'tenant-a', limit: 10, runId: '   ' })
    ).rejects.toThrow('RUN_ID_SCOPE_REQUIRED');
    await expect(
      store.replayDeadLetters({ tenantId: 'tenant-a', limit: 10, eventType: '   ' })
    ).rejects.toThrow('EVENT_TYPE_SCOPE_REQUIRED');
  });
});
