import { MAX_LINEAGE_ATTEMPTS } from '@dvt/traceability-service';
import { describe, expect, it } from 'vitest';

import {
  createRecordingLineageOutboxStore,
  NOW,
  makePayload,
  RecordingClient,
} from './helpers/lineageOutboxUnitSupport.js';

describe('PostgresLineageOutboxStore failure handling', () => {
  it('markFailed increments attempts atomically and schedules exponential backoff', async () => {
    const client = new RecordingClient();
    client.enqueueRows([
      {
        id: 'lox-evt-2',
        tenant_id: 'tenant-a',
        run_id: 'run-1',
        event_type: 'StepStarted',
        payload: makePayload('evt-2'),
        attempts: 3,
      },
    ]);
    const store = createRecordingLineageOutboxStore(client);

    const disposition = await store.markFailed('lox-evt-2', 'sink timeout');

    expect(disposition).toBe('retry_scheduled');
    expect(client.queries).toHaveLength(1);
    const query = client.queries[0];
    expect(query?.sql).toContain('attempts = attempts + 1');
    expect(query?.sql).toContain(`WHEN attempts + 1 >= ${MAX_LINEAGE_ATTEMPTS} THEN NULL`);
    expect(query?.sql).toContain(
      'make_interval(secs => LEAST(60, POWER(2, GREATEST(0, attempts))))'
    );
    expect(query?.sql).toContain('claimed_at = NULL');
    expect(query?.params).toEqual(['lox-evt-2', 'sink timeout', NOW, 60_000]);
  });

  it('markFailed returns not_found when lineage row is already missing', async () => {
    const client = new RecordingClient();
    client.enqueueRows([]);
    const store = createRecordingLineageOutboxStore(client);

    const disposition = await store.markFailed('lox-missing', 'sink timeout');

    expect(disposition).toBe('not_found');
    expect(client.queries).toHaveLength(1);
    expect(client.queries[0]?.sql).toContain('UPDATE "dvt".lineage_outbox');
  });

  it('markFailed dead-letters and removes the row when max attempts is reached', async () => {
    const client = new RecordingClient();
    client.enqueueRows([
      {
        id: 'lox-evt-3',
        tenant_id: 'tenant-a',
        run_id: 'run-1',
        event_type: 'StepStarted',
        payload: makePayload('evt-3'),
        attempts: MAX_LINEAGE_ATTEMPTS,
      },
    ]);

    const store = createRecordingLineageOutboxStore(client);

    const disposition = await store.markFailed('lox-evt-3', 'terminal failure');

    expect(disposition).toBe('dead_lettered');
    expect(client.queries).toHaveLength(3);
    expect(client.queries[1]?.sql).toContain('INSERT INTO "dvt".lineage_dead_letter');
    expect(client.queries[2]?.sql).toContain('DELETE FROM "dvt".lineage_outbox');
  });
});
