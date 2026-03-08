import assert from 'node:assert/strict';
import test from 'node:test';

import type { OutboxRecord, RunEventPersisted } from '@dvt/engine';

import { OutboxWorkerMonitor } from '../../src/ops/OutboxWorkerMonitor.js';
import type { OutboxWorkerRuntimeLogger } from '../../src/runtime/OutboxWorkerRuntime.js';

function makeLogger(): {
  logger: OutboxWorkerRuntimeLogger;
  entries: Array<{ level: 'info' | 'warn' | 'error'; msg?: string; data: Record<string, unknown> }>;
} {
  const entries: Array<{
    level: 'info' | 'warn' | 'error';
    msg?: string;
    data: Record<string, unknown>;
  }> = [];
  return {
    logger: {
      info(data, msg) {
        entries.push({ level: 'info', data, msg });
      },
      warn(data, msg) {
        entries.push({ level: 'warn', data, msg });
      },
      error(data, msg) {
        entries.push({ level: 'error', data, msg });
      },
    },
    entries,
  };
}

function makeEvent(id: string): RunEventPersisted {
  return {
    eventId: `evt-${id}`,
    eventType: 'RunQueued',
    runId: 'run-1',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'dev',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-03-08T00:00:00.000Z',
    idempotencyKey: `key-${id}`,
    runSeq: 1,
    persistedAt: '2026-03-08T00:00:00.000Z',
  };
}

function makeRecord(
  id: string,
  createdAt = '2026-03-08T00:00:00.000Z',
  attempts = 0
): OutboxRecord {
  return {
    id,
    createdAt,
    idempotencyKey: `key-${id}`,
    payload: makeEvent(id),
    attempts,
  };
}

await test('OutboxWorkerMonitor tracks runtime state, metrics, and delivery transitions', () => {
  const clock = { nowMs: 1_741_392_000_000 };
  const { logger, entries } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => clock.nowMs,
  });

  monitor.onStarted();
  monitor.onBatchClaimed([makeRecord('1')]);
  monitor.onRecordDelivered(makeRecord('1'));
  monitor.onRecordFailed(makeRecord('2', '2026-03-08T00:00:00.000Z', 1), 'transient', 'retry');
  monitor.onTick({
    claimedCount: 2,
    deliveredCount: 1,
    retriedCount: 1,
    deadLetteredCount: 0,
    oldestClaimedAgeMs: 2_500,
  });

  const ready = monitor.getHealthSnapshot();
  assert.equal(ready.ready, true);
  assert.equal(ready.state, 'draining');
  assert.equal(ready.lastErrorMessage, null);

  monitor.onError(new Error('downstream broke'));
  const failing = monitor.getHealthSnapshot();
  assert.equal(failing.ready, false);
  assert.equal(failing.state, 'failing');
  assert.equal(failing.lastErrorMessage, 'downstream broke');

  monitor.onStopped();
  const stopped = monitor.getHealthSnapshot();
  assert.equal(stopped.ok, false);
  assert.equal(stopped.state, 'stopped');

  const metrics = monitor.renderMetrics();
  assert.match(metrics, /dvt_outbox_claimed_records_total 2/);
  assert.match(metrics, /dvt_outbox_retried_records_total 1/);
  assert.match(metrics, /dvt_outbox_oldest_claimed_lag_seconds 2.5/);
  assert.match(metrics, /dvt_outbox_runtime_state\{state="stopped"\} 1/);

  assert.ok(entries.some((entry) => entry.msg === 'outbox records claimed'));
  assert.ok(entries.some((entry) => entry.msg === 'outbox record delivered'));
  assert.ok(entries.some((entry) => entry.msg === 'outbox record scheduled for retry'));
});

await test('OutboxWorkerMonitor marks readiness false when a tick only retries records', () => {
  const clock = { nowMs: 1_741_392_000_000 };
  const { logger } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => clock.nowMs,
  });

  monitor.onStarted();
  monitor.onRecordFailed(
    makeRecord('1', '2026-03-08T00:00:00.000Z', 0),
    'downstream unavailable',
    'retry'
  );
  monitor.onTick({
    claimedCount: 1,
    deliveredCount: 0,
    retriedCount: 1,
    deadLetteredCount: 0,
    oldestClaimedAgeMs: 5_000,
  });

  const snapshot = monitor.getHealthSnapshot();
  assert.equal(snapshot.ready, false);
  assert.equal(snapshot.state, 'failing');
  assert.equal(snapshot.lastErrorMessage, 'downstream unavailable');

  monitor.onTick({
    claimedCount: 0,
    deliveredCount: 0,
    retriedCount: 0,
    deadLetteredCount: 0,
    oldestClaimedAgeMs: null,
  });

  const recovered = monitor.getHealthSnapshot();
  assert.equal(recovered.ready, true);
  assert.equal(recovered.state, 'idle');
  assert.equal(recovered.lastErrorMessage, null);
});
