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
        entries.push(msg === undefined ? { level: 'info', data } : { level: 'info', data, msg });
      },
      warn(data, msg) {
        entries.push(msg === undefined ? { level: 'warn', data } : { level: 'warn', data, msg });
      },
      error(data, msg) {
        entries.push(msg === undefined ? { level: 'error', data } : { level: 'error', data, msg });
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
    retryBacklogActive: true,
  });

  const ready = monitor.getHealthSnapshot();
  assert.equal(ready.ready, false);
  assert.equal(ready.state, 'failing');
  assert.equal(ready.lastErrorMessage, 'transient');

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

await test('OutboxWorkerMonitor logs the oldest claimed record across the full batch', () => {
  const clock = { nowMs: Date.parse('2026-03-08T00:00:10.000Z') };
  const { logger, entries } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => clock.nowMs,
  });

  monitor.onBatchClaimed([
    makeRecord('newer', '2026-03-08T00:00:09.000Z'),
    makeRecord('older-retry', '2026-03-08T00:00:00.000Z', 1),
  ]);

  const claimedLog = entries.find((entry) => entry.msg === 'outbox records claimed');
  assert.ok(claimedLog);
  assert.equal(claimedLog.data.oldestCreatedAt, '2026-03-08T00:00:00.000Z');
  assert.equal(claimedLog.data.oldestLagSeconds, 10);
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
    retryBacklogActive: true,
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
    retryBacklogActive: true,
  });

  const stillFailing = monitor.getHealthSnapshot();
  assert.equal(stillFailing.ready, false);
  assert.equal(stillFailing.state, 'failing');
  assert.equal(stillFailing.lastErrorMessage, 'downstream unavailable');

  monitor.onTick({
    claimedCount: 0,
    deliveredCount: 0,
    retriedCount: 0,
    deadLetteredCount: 0,
    oldestClaimedAgeMs: null,
    retryBacklogActive: false,
  });

  const recovered = monitor.getHealthSnapshot();
  assert.equal(recovered.ready, true);
  assert.equal(recovered.state, 'idle');
  assert.equal(recovered.lastErrorMessage, null);
});

await test('OutboxWorkerMonitor clears runtime errors after a healthy recovery tick', () => {
  const clock = { nowMs: 1_741_392_000_000 };
  const { logger } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => clock.nowMs,
  });

  monitor.onStarted();
  monitor.onError(new Error('transient runtime failure'));

  const failing = monitor.getHealthSnapshot();
  assert.equal(failing.ready, false);
  assert.equal(failing.state, 'failing');
  assert.equal(failing.lastErrorMessage, 'transient runtime failure');

  clock.nowMs += 1_000;
  monitor.onTick({
    claimedCount: 1,
    deliveredCount: 1,
    retriedCount: 0,
    deadLetteredCount: 0,
    oldestClaimedAgeMs: 3_000,
    retryBacklogActive: false,
  });

  const recovered = monitor.getHealthSnapshot();
  assert.equal(recovered.ready, true);
  assert.equal(recovered.state, 'draining');
  assert.equal(recovered.lastErrorMessage, null);
  assert.ok(recovered.lastTickAt);
});

await test('OutboxWorkerMonitor renders structured object failures without default object stringification', () => {
  const { logger } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => 1_741_392_000_000,
  });

  monitor.onError({ code: 'DOWNSTREAM_TIMEOUT', retryable: true });

  const snapshot = monitor.getHealthSnapshot();
  assert.equal(snapshot.state, 'failing');
  assert.equal(snapshot.lastErrorMessage, '{"code":"DOWNSTREAM_TIMEOUT","retryable":true}');
});

await test('OutboxWorkerMonitor exposes passive ownership as non-ready but healthy', () => {
  const clock = { nowMs: 1_741_392_000_000 };
  const { logger } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => clock.nowMs,
  });

  monitor.enterPassiveMode();

  const snapshot = monitor.getHealthSnapshot();
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.ready, false);
  assert.equal(snapshot.state, 'passive');

  const metrics = monitor.renderMetrics();
  assert.match(metrics, /dvt_outbox_runtime_ready 0/);
  assert.match(metrics, /dvt_outbox_runtime_state\{state="passive"\} 1/);
});

await test('OutboxWorkerMonitor keeps process start timestamp unset until runtime startup', () => {
  const clock = { nowMs: 1_741_392_000_000 };
  const { logger } = makeLogger();
  const monitor = new OutboxWorkerMonitor({
    serviceName: 'dvt-outbox-worker',
    logger,
    nowMs: () => clock.nowMs,
  });

  const beforeStartMetrics = monitor.renderMetrics();
  assert.match(beforeStartMetrics, /dvt_outbox_process_start_timestamp_seconds 0/);

  monitor.onStarted();

  const afterStartMetrics = monitor.renderMetrics();
  assert.match(afterStartMetrics, /dvt_outbox_process_start_timestamp_seconds 1741392000/);
});
