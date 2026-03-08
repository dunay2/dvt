import { describe, expect, it } from 'vitest';
import { SubscriberRegistry } from '../src/delivery/SubscriberRegistry.js';
import { SubscriberResolver } from '../src/delivery/SubscriberResolver.js';
import { SetBasedIdempotentSink, TestSubscriber } from '../src/testing/TestSubscriber.js';

const subscriber = new TestSubscriber(
  {
    subscriberKey: 'snapshot-projector',
    topic: 'workflow.run.events',
    deliveryChannel: 'internal_projection',
    sideEffectKind: 'snapshot_projection',
    maxConcurrency: 4,
  },
  new SetBasedIdempotentSink(),
);

describe('SubscriberResolver', () => {
  it('resolves by topic + deliveryChannel + sideEffectKind', () => {
    const resolver = new SubscriberResolver(new SubscriberRegistry([subscriber]));

    const resolved = resolver.resolve({
      recordId: 'rec-1',
      topic: 'workflow.run.events',
      deliveryChannel: 'internal_projection',
      sideEffectKind: 'snapshot_projection',
      payload: {},
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
    });

    expect(resolved.registration.subscriberKey).toBe('snapshot-projector');
  });
});
