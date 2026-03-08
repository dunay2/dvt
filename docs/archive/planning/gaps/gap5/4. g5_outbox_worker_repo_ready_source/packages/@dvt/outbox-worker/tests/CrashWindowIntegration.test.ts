import { describe, expect, it } from 'vitest';
import { NoopLogger } from '../src/contracts/ILogger.js';
import { DeliveryCoordinator } from '../src/delivery/DeliveryCoordinator.js';
import { DeliveryOutcomeDecider } from '../src/delivery/DeliveryOutcomeDecider.js';
import { DeliveryOutcomeWriter } from '../src/delivery/DeliveryOutcomeWriter.js';
import { DeliveryTelemetry } from '../src/delivery/DeliveryTelemetry.js';
import { SubscriberInvoker } from '../src/delivery/SubscriberInvoker.js';
import { SubscriberRegistry } from '../src/delivery/SubscriberRegistry.js';
import { SubscriberResolver } from '../src/delivery/SubscriberResolver.js';
import { BatchProcessor } from '../src/engine/BatchProcessor.js';
import { OutboxWorkerEngine } from '../src/engine/OutboxWorkerEngine.js';
import { ExponentialBackoffCalculator } from '../src/policies/ExponentialBackoffCalculator.js';
import { CrashWindowInjectedError } from '../src/delivery/CrashWindowInjectedError.js';
import { CollectingMetrics } from '../src/testing/CollectingMetrics.js';
import { CrashAfterSuccessHook } from '../src/testing/CrashAfterSuccessHook.js';
import { FakeClock } from '../src/testing/FakeClock.js';
import { InMemoryOutboxStore } from '../src/testing/InMemoryOutboxStore.js';
import { SetBasedIdempotentSink, TestSubscriber } from '../src/testing/TestSubscriber.js';
import { NoopCrashWindowTestHook } from '../src/contracts/ICrashWindowTestHook.js';

function buildEngine(
  store: InMemoryOutboxStore,
  crashHook: CrashAfterSuccessHook | NoopCrashWindowTestHook,
  clock: FakeClock,
  sink: SetBasedIdempotentSink
): OutboxWorkerEngine {
  const subscriber = new TestSubscriber(
    {
      subscriberKey: 'snapshot-projector',
      topic: 'workflow.run.events',
      deliveryChannel: 'internal_projection',
      sideEffectKind: 'snapshot_projection',
      maxConcurrency: 1,
    },
    sink
  );

  const metrics = new CollectingMetrics();
  const telemetry = new DeliveryTelemetry(new NoopLogger(), metrics);
  const writer = new DeliveryOutcomeWriter(
    store,
    clock,
    new ExponentialBackoffCalculator({ baseDelayMs: 1000, maxDelayMs: 10000 })
  );
  const coordinator = new DeliveryCoordinator(
    new SubscriberResolver(new SubscriberRegistry([subscriber])),
    new SubscriberInvoker(),
    new DeliveryOutcomeDecider(),
    writer,
    telemetry,
    crashHook
  );

  return new OutboxWorkerEngine(store, new BatchProcessor(coordinator, 1), telemetry, clock, {
    leaseOwnerId: 'worker-a',
    batchSize: 10,
    leaseDurationMs: 1000,
  });
}

describe('Crash window integration', () => {
  it('re-applies delivery attempt but idempotent sink commits only once', async () => {
    const store = new InMemoryOutboxStore();
    const clock = new FakeClock(new Date('2026-03-08T00:00:00.000Z'));
    const sink = new SetBasedIdempotentSink();

    store.append({
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
      attemptCount: 0,
      maxAttempts: 3,
      status: 'pending',
    });

    const crashEngine = buildEngine(store, new CrashAfterSuccessHook(), clock, sink);

    await expect(crashEngine.processBatch()).rejects.toBeInstanceOf(CrashWindowInjectedError);
    expect(sink.appliedCount()).toBe(1);
    expect(store.getRecord('rec-1')?.status).toBe('leased');

    clock.advanceByMs(1001);

    const recoveryEngine = buildEngine(store, new NoopCrashWindowTestHook(), clock, sink);
    const report = await recoveryEngine.processBatch();

    expect(report.processedCount).toBe(1);
    expect(sink.appliedCount()).toBe(1);
    expect(store.getRecord('rec-1')?.status).toBe('delivered');
    expect(store.getRecord('rec-1')?.attemptCount).toBe(2);
  });
});
