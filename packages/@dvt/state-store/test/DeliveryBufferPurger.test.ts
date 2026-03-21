import { describe, expect, it } from 'vitest';

import { DeliveryBufferPurger } from '../src/lifecycle/DeliveryBufferPurger.js';
import type {
  BufferPurgeResult,
  DeliveryBufferPurgeTelemetry,
  DeliveryBufferRetentionPolicy,
  IDeliveryBufferPurgeStore,
} from '../src/lifecycle/deliveryBufferRuntime.js';
import { subtractDaysFromIso } from '../src/lifecycle/deliveryBufferRuntime.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = '2026-04-20T00:00:00.000Z';

const POLICY: DeliveryBufferRetentionPolicy = {
  deliveredOutboxRetentionDays: 7,
  outboxDeadLetterRetentionDays: 30,
  lineageDeadLetterRetentionDays: 30,
  maxRowsPerRun: 1_000,
};

// ---------------------------------------------------------------------------
// Stub store
// ---------------------------------------------------------------------------

function buildStubStore(
  config: {
    deliveredOutboxCount?: number;
    outboxDeadLetterCount?: number;
    lineageDeadLetterCount?: number;
    purgeDeliveredOutboxResult?: number;
    purgeOutboxDeadLetterResult?: number;
    purgeLineageDeadLetterResult?: number;
    purgeDeliveredOutboxError?: Error;
    purgeOutboxDeadLetterError?: Error;
    purgeLineageDeadLetterError?: Error;
    countError?: Error;
  } = {}
): IDeliveryBufferPurgeStore & {
  purgeDeliveredOutboxCalls: Array<{ olderThanIso: string; limit: number }>;
  purgeOutboxDeadLetterCalls: Array<{ olderThanIso: string; limit: number }>;
  purgeLineageDeadLetterCalls: Array<{ olderThanIso: string; limit: number }>;
} {
  const purgeDeliveredOutboxCalls: Array<{ olderThanIso: string; limit: number }> = [];
  const purgeOutboxDeadLetterCalls: Array<{ olderThanIso: string; limit: number }> = [];
  const purgeLineageDeadLetterCalls: Array<{ olderThanIso: string; limit: number }> = [];

  return {
    purgeDeliveredOutboxCalls,
    purgeOutboxDeadLetterCalls,
    purgeLineageDeadLetterCalls,

    async purgeDeliveredOutbox(olderThanIso, limit) {
      purgeDeliveredOutboxCalls.push({ olderThanIso, limit });
      if (config.purgeDeliveredOutboxError) throw config.purgeDeliveredOutboxError;
      return config.purgeDeliveredOutboxResult ?? 0;
    },
    async purgeOutboxDeadLetter(olderThanIso, limit) {
      purgeOutboxDeadLetterCalls.push({ olderThanIso, limit });
      if (config.purgeOutboxDeadLetterError) throw config.purgeOutboxDeadLetterError;
      return config.purgeOutboxDeadLetterResult ?? 0;
    },
    async purgeLineageDeadLetter(olderThanIso, limit) {
      purgeLineageDeadLetterCalls.push({ olderThanIso, limit });
      if (config.purgeLineageDeadLetterError) throw config.purgeLineageDeadLetterError;
      return config.purgeLineageDeadLetterResult ?? 0;
    },
    async countDeliveredOutbox() {
      if (config.countError) throw config.countError;
      return config.deliveredOutboxCount ?? 0;
    },
    async countOutboxDeadLetter() {
      if (config.countError) throw config.countError;
      return config.outboxDeadLetterCount ?? 0;
    },
    async countLineageDeadLetter() {
      if (config.countError) throw config.countError;
      return config.lineageDeadLetterCount ?? 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Recording telemetry
// ---------------------------------------------------------------------------

function buildRecordingTelemetry(): DeliveryBufferPurgeTelemetry & {
  counters: Record<string, number>;
  histograms: Record<string, number[]>;
  infoMessages: string[];
  errorMessages: string[];
} {
  const counters: Record<string, number> = {};
  const histograms: Record<string, number[]> = {};
  const infoMessages: string[] = [];
  const errorMessages: string[] = [];

  return {
    counters,
    histograms,
    infoMessages,
    errorMessages,
    metrics: {
      addCounter(name, value) {
        counters[name] = (counters[name] ?? 0) + value;
      },
      recordHistogram(name, value) {
        if (!histograms[name]) histograms[name] = [];
        histograms[name].push(value);
      },
    },
    logger: {
      info(_data, msg) {
        if (msg) infoMessages.push(msg);
      },
      error(_data, msg) {
        if (msg) errorMessages.push(msg);
      },
    },
  };
}

// ---------------------------------------------------------------------------
// subtractDaysFromIso
// ---------------------------------------------------------------------------

describe('subtractDaysFromIso', () => {
  it('subtracts exact number of days', () => {
    const result = subtractDaysFromIso('2026-04-20T00:00:00.000Z', 7);
    expect(result).toBe('2026-04-13T00:00:00.000Z');
  });

  it('subtracts 30 days correctly across months', () => {
    const result = subtractDaysFromIso('2026-04-20T00:00:00.000Z', 30);
    expect(result).toBe('2026-03-21T00:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// DeliveryBufferPurger.purge — happy path
// ---------------------------------------------------------------------------

describe('DeliveryBufferPurger.purge', () => {
  it('returns zeros when buffers are empty', async () => {
    const store = buildStubStore();
    const purger = new DeliveryBufferPurger({ store, nowIso: () => NOW });

    const result: BufferPurgeResult = await purger.purge(POLICY);

    expect(result.purgedDeliveredOutbox).toBe(0);
    expect(result.purgedOutboxDeadLetter).toBe(0);
    expect(result.purgedLineageDeadLetter).toBe(0);
  });

  it('calls each purge method with correct cutoff and limit', async () => {
    const store = buildStubStore();
    const purger = new DeliveryBufferPurger({ store, nowIso: () => NOW });

    await purger.purge(POLICY);

    expect(store.purgeDeliveredOutboxCalls).toHaveLength(1);
    expect(store.purgeDeliveredOutboxCalls[0].olderThanIso).toBe(
      subtractDaysFromIso(NOW, POLICY.deliveredOutboxRetentionDays)
    );
    expect(store.purgeDeliveredOutboxCalls[0].limit).toBe(POLICY.maxRowsPerRun);

    expect(store.purgeOutboxDeadLetterCalls[0].olderThanIso).toBe(
      subtractDaysFromIso(NOW, POLICY.outboxDeadLetterRetentionDays)
    );
    expect(store.purgeLineageDeadLetterCalls[0].olderThanIso).toBe(
      subtractDaysFromIso(NOW, POLICY.lineageDeadLetterRetentionDays)
    );
  });

  it('returns correct row counts from each purge', async () => {
    const store = buildStubStore({
      purgeDeliveredOutboxResult: 42,
      purgeOutboxDeadLetterResult: 15,
      purgeLineageDeadLetterResult: 7,
    });
    const purger = new DeliveryBufferPurger({ store, nowIso: () => NOW });

    const result = await purger.purge(POLICY);

    expect(result.purgedDeliveredOutbox).toBe(42);
    expect(result.purgedOutboxDeadLetter).toBe(15);
    expect(result.purgedLineageDeadLetter).toBe(7);
  });

  it('emits purged_rows_total metrics for each buffer', async () => {
    const store = buildStubStore({
      purgeDeliveredOutboxResult: 10,
      purgeOutboxDeadLetterResult: 5,
      purgeLineageDeadLetterResult: 3,
    });
    const telemetry = buildRecordingTelemetry();
    const purger = new DeliveryBufferPurger({ store, telemetry, nowIso: () => NOW });

    await purger.purge(POLICY);

    expect(telemetry.counters['dvt.outbox.purged_rows_total']).toBe(10);
    // outbox DL + lineage DL both add to dvt.dead_letter.purged_rows_total
    expect(telemetry.counters['dvt.dead_letter.purged_rows_total']).toBe(8);
  });

  it('does not emit purged_rows_total when zero rows purged', async () => {
    const store = buildStubStore();
    const telemetry = buildRecordingTelemetry();
    const purger = new DeliveryBufferPurger({ store, telemetry, nowIso: () => NOW });

    await purger.purge(POLICY);

    expect(telemetry.counters['dvt.outbox.purged_rows_total']).toBeUndefined();
    expect(telemetry.counters['dvt.dead_letter.purged_rows_total']).toBeUndefined();
  });

  it('emits retained_rows histograms from count queries', async () => {
    const store = buildStubStore({
      deliveredOutboxCount: 200,
      outboxDeadLetterCount: 30,
      lineageDeadLetterCount: 10,
    });
    const telemetry = buildRecordingTelemetry();
    const purger = new DeliveryBufferPurger({ store, telemetry, nowIso: () => NOW });

    await purger.purge(POLICY);

    expect(telemetry.histograms['dvt.outbox.retained_rows']).toEqual([200]);
    expect(telemetry.histograms['dvt.dead_letter.retained_rows']).toEqual([40]);
  });

  it('emits log messages for each buffer on success', async () => {
    const store = buildStubStore({
      purgeDeliveredOutboxResult: 1,
      purgeOutboxDeadLetterResult: 1,
      purgeLineageDeadLetterResult: 1,
    });
    const telemetry = buildRecordingTelemetry();
    const purger = new DeliveryBufferPurger({ store, telemetry, nowIso: () => NOW });

    await purger.purge(POLICY);

    expect(telemetry.infoMessages).toContain('delivered outbox purge complete');
    expect(telemetry.infoMessages).toContain('outbox dead-letter purge complete');
    expect(telemetry.infoMessages).toContain('lineage dead-letter purge complete');
  });
});

// ---------------------------------------------------------------------------
// Fail-soft behaviour
// ---------------------------------------------------------------------------

describe('DeliveryBufferPurger.purge — fail-soft', () => {
  it('continues with remaining buffers when delivered outbox purge fails', async () => {
    const store = buildStubStore({
      purgeDeliveredOutboxError: new Error('db error'),
      purgeOutboxDeadLetterResult: 5,
      purgeLineageDeadLetterResult: 3,
    });
    const telemetry = buildRecordingTelemetry();
    const purger = new DeliveryBufferPurger({ store, telemetry, nowIso: () => NOW });

    const result = await purger.purge(POLICY);

    expect(result.purgedDeliveredOutbox).toBe(0);
    expect(result.purgedOutboxDeadLetter).toBe(5);
    expect(result.purgedLineageDeadLetter).toBe(3);
    expect(telemetry.counters['dvt.outbox.purge_failures_total']).toBe(1);
    expect(telemetry.errorMessages).toContain('delivered outbox purge failed');
  });

  it('continues with lineage when outbox dead-letter purge fails', async () => {
    const store = buildStubStore({
      purgeOutboxDeadLetterError: new Error('constraint'),
      purgeLineageDeadLetterResult: 7,
    });
    const telemetry = buildRecordingTelemetry();
    const purger = new DeliveryBufferPurger({ store, telemetry, nowIso: () => NOW });

    const result = await purger.purge(POLICY);

    expect(result.purgedOutboxDeadLetter).toBe(0);
    expect(result.purgedLineageDeadLetter).toBe(7);
    expect(telemetry.counters['dvt.dead_letter.purge_failures_total']).toBe(1);
    expect(telemetry.errorMessages).toContain('outbox dead-letter purge failed');
  });

  it('count errors do not abort purge', async () => {
    const store = buildStubStore({
      countError: new Error('count query failed'),
      purgeDeliveredOutboxResult: 10,
    });
    const purger = new DeliveryBufferPurger({ store, nowIso: () => NOW });

    // Should not throw despite count failures
    const result = await purger.purge(POLICY);
    expect(result.purgedDeliveredOutbox).toBe(10);
  });

  it('all three failures are independent — none abort the others', async () => {
    const store = buildStubStore({
      purgeDeliveredOutboxError: new Error('e1'),
      purgeOutboxDeadLetterError: new Error('e2'),
      purgeLineageDeadLetterError: new Error('e3'),
    });
    const telemetry = buildRecordingTelemetry();
    const purger = new DeliveryBufferPurger({ store, telemetry, nowIso: () => NOW });

    const result = await purger.purge(POLICY);

    expect(result.purgedDeliveredOutbox).toBe(0);
    expect(result.purgedOutboxDeadLetter).toBe(0);
    expect(result.purgedLineageDeadLetter).toBe(0);
    expect(telemetry.counters['dvt.outbox.purge_failures_total']).toBe(1);
    expect(telemetry.counters['dvt.dead_letter.purge_failures_total']).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Policy validation
// ---------------------------------------------------------------------------

describe('DeliveryBufferPurger.purge — policy validation', () => {
  it('rejects deliveredOutboxRetentionDays < 1', async () => {
    const store = buildStubStore();
    const purger = new DeliveryBufferPurger({ store, nowIso: () => NOW });

    await expect(purger.purge({ ...POLICY, deliveredOutboxRetentionDays: 0 })).rejects.toThrow(
      /DELIVERY_BUFFER_RETENTION_DAYS_INVALID/
    );
  });

  it('rejects outboxDeadLetterRetentionDays < 1', async () => {
    const store = buildStubStore();
    const purger = new DeliveryBufferPurger({ store, nowIso: () => NOW });

    await expect(purger.purge({ ...POLICY, outboxDeadLetterRetentionDays: -1 })).rejects.toThrow(
      /DELIVERY_BUFFER_RETENTION_DAYS_INVALID/
    );
  });

  it('rejects lineageDeadLetterRetentionDays < 1', async () => {
    const store = buildStubStore();
    const purger = new DeliveryBufferPurger({ store, nowIso: () => NOW });

    await expect(purger.purge({ ...POLICY, lineageDeadLetterRetentionDays: 0 })).rejects.toThrow(
      /DELIVERY_BUFFER_RETENTION_DAYS_INVALID/
    );
  });

  it('rejects maxRowsPerRun < 1', async () => {
    const store = buildStubStore();
    const purger = new DeliveryBufferPurger({ store, nowIso: () => NOW });

    await expect(purger.purge({ ...POLICY, maxRowsPerRun: 0 })).rejects.toThrow(
      /DELIVERY_BUFFER_MAX_ROWS_INVALID/
    );
  });
});
