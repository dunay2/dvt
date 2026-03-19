import type { EventEnvelope as RunEventPersisted, OutboxRecord } from '@dvt/contracts';
import { describe, it, expect } from 'vitest';

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

describe('OutboxWorkerMonitor', () => {
  it('tracks runtime state, metrics, and delivery transitions', () => {
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
    expect(ready.ready).toBe(false);
    expect(ready.state).toBe('failing');
    expect(ready.lastErrorMessage).toBe('transient');

    monitor.onError(new Error('downstream broke'));
    const failing = monitor.getHealthSnapshot();
    expect(failing.ready).toBe(false);
    expect(failing.state).toBe('failing');
    expect(failing.lastErrorMessage).toBe('downstream broke');

    monitor.onStopped();
    const stopped = monitor.getHealthSnapshot();
    expect(stopped.ok).toBe(false);
    expect(stopped.state).toBe('stopped');

    const metrics = monitor.renderMetrics();
    expect(metrics).toMatch(/dvt_outbox_claimed_records_total 2/);
    expect(metrics).toMatch(/dvt_outbox_retried_records_total 1/);
    expect(metrics).toMatch(/dvt_outbox_oldest_claimed_lag_seconds 2.5/);
    expect(metrics).toMatch(/dvt_outbox_runtime_state\{state="stopped"\} 1/);

    expect(entries.some((entry) => entry.msg === 'outbox records claimed')).toBe(true);
    expect(entries.some((entry) => entry.msg === 'outbox record delivered')).toBe(true);
    expect(entries.some((entry) => entry.msg === 'outbox record scheduled for retry')).toBe(true);
  });

  it('logs the oldest claimed record across the full batch', () => {
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
    expect(claimedLog).toBeTruthy();
    expect(claimedLog!.data.oldestCreatedAt).toBe('2026-03-08T00:00:00.000Z');
    expect(claimedLog!.data.oldestLagSeconds).toBe(10);
  });

  it('marks readiness false when a tick only retries records', () => {
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
    expect(snapshot.ready).toBe(false);
    expect(snapshot.state).toBe('failing');
    expect(snapshot.lastErrorMessage).toBe('downstream unavailable');

    monitor.onTick({
      claimedCount: 0,
      deliveredCount: 0,
      retriedCount: 0,
      deadLetteredCount: 0,
      oldestClaimedAgeMs: null,
      retryBacklogActive: true,
    });

    const stillFailing = monitor.getHealthSnapshot();
    expect(stillFailing.ready).toBe(false);
    expect(stillFailing.state).toBe('failing');
    expect(stillFailing.lastErrorMessage).toBe('downstream unavailable');

    monitor.onTick({
      claimedCount: 0,
      deliveredCount: 0,
      retriedCount: 0,
      deadLetteredCount: 0,
      oldestClaimedAgeMs: null,
      retryBacklogActive: false,
    });

    const recovered = monitor.getHealthSnapshot();
    expect(recovered.ready).toBe(true);
    expect(recovered.state).toBe('idle');
    expect(recovered.lastErrorMessage).toBe(null);
  });

  it('clears runtime errors after a healthy recovery tick', () => {
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
    expect(failing.ready).toBe(false);
    expect(failing.state).toBe('failing');
    expect(failing.lastErrorMessage).toBe('transient runtime failure');

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
    expect(recovered.ready).toBe(true);
    expect(recovered.state).toBe('draining');
    expect(recovered.lastErrorMessage).toBe(null);
    expect(recovered.lastTickAt).toBeTruthy();
  });

  it('withdraws readiness when the last completed tick becomes stale', () => {
    const clock = { nowMs: 1_741_392_000_000 };
    const { logger } = makeLogger();
    const monitor = new OutboxWorkerMonitor({
      serviceName: 'dvt-outbox-worker',
      logger,
      nowMs: () => clock.nowMs,
      readyStaleAfterMs: 5_000,
    });

    monitor.onStarted();
    monitor.onTick({
      claimedCount: 0,
      deliveredCount: 0,
      retriedCount: 0,
      deadLetteredCount: 0,
      oldestClaimedAgeMs: null,
      retryBacklogActive: false,
    });

    expect(monitor.getHealthSnapshot().ready).toBe(true);

    clock.nowMs += 5_001;

    const snapshot = monitor.getHealthSnapshot();
    expect(snapshot.ok).toBe(true);
    expect(snapshot.state).toBe('idle');
    expect(snapshot.ready).toBe(false);
    expect(snapshot.tickFresh).toBe(false);

    const metrics = monitor.renderMetrics();
    expect(metrics).toMatch(/dvt_outbox_runtime_tick_fresh 0/);
  });

  it('exposes stopping as alive but not ready', () => {
    const clock = { nowMs: 1_741_392_000_000 };
    const { logger } = makeLogger();
    const monitor = new OutboxWorkerMonitor({
      serviceName: 'dvt-outbox-worker',
      logger,
      nowMs: () => clock.nowMs,
      readyStaleAfterMs: 5_000,
    });

    monitor.onStarted();
    monitor.onTick({
      claimedCount: 1,
      deliveredCount: 1,
      retriedCount: 0,
      deadLetteredCount: 0,
      oldestClaimedAgeMs: 1_000,
      retryBacklogActive: false,
    });
    monitor.onStopping();

    const snapshot = monitor.getHealthSnapshot();
    expect(snapshot.ok).toBe(true);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.state).toBe('stopping');
    expect(snapshot.tickFresh).toBe(true);

    const metrics = monitor.renderMetrics();
    expect(metrics).toMatch(/dvt_outbox_runtime_ready 0/);
    expect(metrics).toMatch(/dvt_outbox_runtime_state\{state="stopping"\} 1/);
  });

  it('renders structured object failures without default object stringification', () => {
    const { logger } = makeLogger();
    const monitor = new OutboxWorkerMonitor({
      serviceName: 'dvt-outbox-worker',
      logger,
      nowMs: () => 1_741_392_000_000,
    });

    monitor.onError({ code: 'DOWNSTREAM_TIMEOUT', retryable: true });

    const snapshot = monitor.getHealthSnapshot();
    expect(snapshot.state).toBe('failing');
    expect(snapshot.lastErrorMessage).toBe('{"code":"DOWNSTREAM_TIMEOUT","retryable":true}');
  });

  it('exposes passive ownership as non-ready but healthy', () => {
    const clock = { nowMs: 1_741_392_000_000 };
    const { logger } = makeLogger();
    const monitor = new OutboxWorkerMonitor({
      serviceName: 'dvt-outbox-worker',
      logger,
      nowMs: () => clock.nowMs,
    });

    monitor.enterPassiveMode();

    const snapshot = monitor.getHealthSnapshot();
    expect(snapshot.ok).toBe(true);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.state).toBe('passive');

    const metrics = monitor.renderMetrics();
    expect(metrics).toMatch(/dvt_outbox_runtime_ready 0/);
    expect(metrics).toMatch(/dvt_outbox_runtime_state\{state="passive"\} 1/);
  });

  it('exposes effective owner state in snapshot and metrics', () => {
    const clock = { nowMs: 1_741_392_000_000 };
    const { logger } = makeLogger();
    const monitor = new OutboxWorkerMonitor({
      serviceName: 'dvt-outbox-worker',
      logger,
      nowMs: () => clock.nowMs,
    });

    expect(monitor.getHealthSnapshot().owner).toBe(false);

    monitor.onOwnershipAcquired();

    const ownedSnapshot = monitor.getHealthSnapshot();
    expect(ownedSnapshot.state).toBe('starting');
    expect(ownedSnapshot.ready).toBe(false);
    expect(ownedSnapshot.owner).toBe(true);

    const ownedMetrics = monitor.renderMetrics();
    expect(ownedMetrics).toMatch(/dvt_outbox_runtime_owner 1/);

    monitor.enterPassiveMode();

    const passiveSnapshot = monitor.getHealthSnapshot();
    expect(passiveSnapshot.state).toBe('passive');
    expect(passiveSnapshot.owner).toBe(false);

    const passiveMetrics = monitor.renderMetrics();
    expect(passiveMetrics).toMatch(/dvt_outbox_runtime_owner 0/);
  });

  it('keeps process start timestamp unset until runtime startup', () => {
    const clock = { nowMs: 1_741_392_000_000 };
    const { logger } = makeLogger();
    const monitor = new OutboxWorkerMonitor({
      serviceName: 'dvt-outbox-worker',
      logger,
      nowMs: () => clock.nowMs,
    });

    const beforeStartMetrics = monitor.renderMetrics();
    expect(beforeStartMetrics).toMatch(/dvt_outbox_process_start_timestamp_seconds 0/);

    monitor.onStarted();

    const afterStartMetrics = monitor.renderMetrics();
    expect(afterStartMetrics).toMatch(/dvt_outbox_process_start_timestamp_seconds 1741392000/);
  });
});
