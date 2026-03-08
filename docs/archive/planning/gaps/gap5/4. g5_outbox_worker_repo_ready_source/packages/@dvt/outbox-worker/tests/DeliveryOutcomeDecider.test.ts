import { describe, expect, it } from 'vitest';
import { DeliveryOutcomeDecider } from '../src/delivery/DeliveryOutcomeDecider.js';
import type { ClaimedOutboxRecord } from '../src/types.js';

const baseRecord: ClaimedOutboxRecord = {
  recordId: 'rec-1',
  topic: 'workflow.run.events',
  deliveryChannel: 'internal_projection',
  sideEffectKind: 'snapshot_projection',
  payload: { runId: 'run-1' },
  headers: {},
  idempotencyKey: 'idem-1',
  partitionKey: null,
  orderingKey: null,
  createdAt: new Date('2026-03-08T00:00:00.000Z'),
  dueAt: new Date('2026-03-08T00:00:00.000Z'),
  attemptCount: 1,
  maxAttempts: 3,
  status: 'leased',
  leaseOwnerId: 'worker-a',
  leaseExpiresAt: new Date('2026-03-08T00:01:00.000Z'),
};

describe('DeliveryOutcomeDecider', () => {
  it('schedules retry when retry budget remains', () => {
    const decider = new DeliveryOutcomeDecider();

    const command = decider.decide(baseRecord, {
      kind: 'RETRYABLE_FAILURE',
      reasonCode: 'HTTP_503',
    });

    expect(command.kind).toBe('SCHEDULE_RETRY');
  });

  it('moves to DLQ when retry budget is exhausted', () => {
    const decider = new DeliveryOutcomeDecider();

    const command = decider.decide(
      {
        ...baseRecord,
        attemptCount: 3,
      },
      {
        kind: 'RETRYABLE_FAILURE',
        reasonCode: 'HTTP_503',
      },
    );

    expect(command.kind).toBe('MOVE_TO_DLQ');
  });
});
