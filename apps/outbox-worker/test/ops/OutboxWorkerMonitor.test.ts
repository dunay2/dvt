import { describe, expect, it } from 'vitest';

import { createMonitorHarness, makeRecord, makeTick } from './outboxWorkerMonitorTestSupport.js';

describe('OutboxWorkerMonitor', () => {
  it('tracks runtime state, metrics, and delivery transitions', () => {
    const { monitor, entries } = createMonitorHarness();

    monitor.onStarted();
    monitor.onBatchClaimed([makeRecord('1'), makeRecord('2')]);
    monitor.onRecordDelivered(makeRecord('1'));
    monitor.onRecordFailed(makeRecord('2', '2026-03-08T00:00:00.000Z', 1), 'transient', 'retry');
    monitor.onTick(
      makeTick({
        claimedCount: 2,
        deliveredCount: 1,
        retriedCount: 1,
        oldestClaimedAgeMs: 2_500,
        retryBacklogActive: true,
      })
    );

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
    expect(metrics).toMatch(/dvt_delivery_outbox_drain_lag_seconds 2.5/);
    expect(metrics).toMatch(/dvt_delivery_event_delivery_latency_seconds_count 2/);
    expect(metrics).toMatch(/dvt_outbox_runtime_state\{state="stopped"\} 1/);

    expect(entries.some((entry) => entry.msg === 'outbox records claimed')).toBe(true);
    expect(entries.some((entry) => entry.msg === 'outbox record delivered')).toBe(true);
    expect(entries.some((entry) => entry.msg === 'outbox record scheduled for retry')).toBe(true);
  });

  it('logs the oldest claimed record across the full batch', () => {
    const { clock, monitor, entries } = createMonitorHarness({
      nowMs: Date.parse('2026-03-08T00:00:10.000Z'),
    });

    monitor.onBatchClaimed([
      makeRecord('newer', '2026-03-08T00:00:09.000Z'),
      makeRecord('older-retry', '2026-03-08T00:00:00.000Z', 1),
    ]);

    const claimedLog = entries.find((entry) => entry.msg === 'outbox records claimed');
    expect(claimedLog).toBeTruthy();
    expect(claimedLog!.data.oldestCreatedAt).toBe('2026-03-08T00:00:00.000Z');
    expect(claimedLog!.data.oldestLagSeconds).toBe(10);
    expect(clock.nowMs).toBe(Date.parse('2026-03-08T00:00:10.000Z'));
  });

  it('marks readiness false when a tick only retries records', () => {
    const { monitor } = createMonitorHarness();

    monitor.onStarted();
    monitor.onRecordFailed(
      makeRecord('1', '2026-03-08T00:00:00.000Z', 0),
      'downstream unavailable',
      'retry'
    );
    monitor.onTick(
      makeTick({
        claimedCount: 1,
        retriedCount: 1,
        oldestClaimedAgeMs: 5_000,
        retryBacklogActive: true,
      })
    );

    const snapshot = monitor.getHealthSnapshot();
    expect(snapshot.ready).toBe(false);
    expect(snapshot.state).toBe('failing');
    expect(snapshot.lastErrorMessage).toBe('downstream unavailable');

    monitor.onTick(makeTick({ retryBacklogActive: true }));

    const stillFailing = monitor.getHealthSnapshot();
    expect(stillFailing.ready).toBe(false);
    expect(stillFailing.state).toBe('failing');
    expect(stillFailing.lastErrorMessage).toBe('downstream unavailable');

    monitor.onTick(makeTick());

    const recovered = monitor.getHealthSnapshot();
    expect(recovered.ready).toBe(true);
    expect(recovered.state).toBe('idle');
    expect(recovered.lastErrorMessage).toBe(null);
  });

  it('clears runtime errors after a healthy recovery tick', () => {
    const { clock, monitor } = createMonitorHarness();

    monitor.onStarted();
    monitor.onError(new Error('transient runtime failure'));

    const failing = monitor.getHealthSnapshot();
    expect(failing.ready).toBe(false);
    expect(failing.state).toBe('failing');
    expect(failing.lastErrorMessage).toBe('transient runtime failure');

    clock.nowMs += 1_000;
    monitor.onTick(
      makeTick({
        claimedCount: 1,
        deliveredCount: 1,
        oldestClaimedAgeMs: 3_000,
      })
    );

    const recovered = monitor.getHealthSnapshot();
    expect(recovered.ready).toBe(true);
    expect(recovered.state).toBe('draining');
    expect(recovered.lastErrorMessage).toBe(null);
    expect(recovered.lastTickAt).toBeTruthy();
  });

  it('withdraws readiness when the last completed tick becomes stale', () => {
    const { clock, monitor } = createMonitorHarness({ readyStaleAfterMs: 5_000 });

    monitor.onStarted();
    monitor.onTick(makeTick());

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
    const { monitor } = createMonitorHarness({ readyStaleAfterMs: 5_000 });

    monitor.onStarted();
    monitor.onTick(
      makeTick({
        claimedCount: 1,
        deliveredCount: 1,
        oldestClaimedAgeMs: 1_000,
      })
    );
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
    const { monitor } = createMonitorHarness();

    monitor.onError({ code: 'DOWNSTREAM_TIMEOUT', retryable: true });

    const snapshot = monitor.getHealthSnapshot();
    expect(snapshot.state).toBe('failing');
    expect(snapshot.lastErrorMessage).toBe('{"code":"DOWNSTREAM_TIMEOUT","retryable":true}');
  });

  it('exposes passive ownership as non-ready but healthy', () => {
    const { monitor } = createMonitorHarness();

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
    const { monitor } = createMonitorHarness();

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
    const { monitor } = createMonitorHarness();

    const beforeStartMetrics = monitor.renderMetrics();
    expect(beforeStartMetrics).toMatch(/dvt_outbox_process_start_timestamp_seconds 0/);

    monitor.onStarted();

    const afterStartMetrics = monitor.renderMetrics();
    expect(afterStartMetrics).toMatch(/dvt_outbox_process_start_timestamp_seconds 1741392000/);
  });

  it('renders retention runtime cycle metrics and timestamps', () => {
    const { clock, monitor } = createMonitorHarness({
      purgeConfigured: true,
      retentionConfigured: true,
      filesystemArchiveStorageConfigured: true,
    });

    let metrics = monitor.renderMetrics();
    expect(metrics).toMatch(/dvt_delivery_buffer_purge_configured 1/);
    expect(metrics).toMatch(/dvt_delivery_buffer_purge_disabled 0/);
    expect(metrics).toMatch(/dvt_run_event_retention_configured 1/);
    expect(metrics).toMatch(/dvt_run_event_retention_disabled 0/);
    expect(metrics).toMatch(/dvt_run_event_retention_filesystem_archive_storage 1/);
    expect(metrics).toMatch(/dvt_run_event_retention_cycles_total 0/);
    expect(metrics).toMatch(/dvt_run_event_retention_cycle_failures_total 0/);
    expect(metrics).toMatch(/dvt_run_event_retention_last_success_timestamp_seconds 0/);
    expect(metrics).toMatch(/dvt_run_event_retention_last_failure_timestamp_seconds 0/);

    monitor.onRunEventRetentionCycleSucceeded({ durationMs: 42, archivedUnits: 3 });

    clock.nowMs += 5_000;
    monitor.onRunEventRetentionCycleFailed({
      durationMs: 9,
      error: new Error('synthetic retention cycle failure'),
    });

    metrics = monitor.renderMetrics();
    expect(metrics).toMatch(/dvt_run_event_retention_cycles_total 2/);
    expect(metrics).toMatch(/dvt_run_event_retention_cycle_failures_total 1/);
    expect(metrics).toMatch(/dvt_run_event_retention_archived_units_total 3/);
    expect(metrics).toMatch(/dvt_run_event_retention_last_cycle_duration_ms 9/);
    expect(metrics).toMatch(/dvt_run_event_retention_last_success_timestamp_seconds 1741392000/);
    expect(metrics).toMatch(/dvt_run_event_retention_last_failure_timestamp_seconds 1741392005/);
  });

  it('renders retention posture alerts when purge or archive runtime is disabled', () => {
    const { monitor } = createMonitorHarness({
      purgeConfigured: false,
      retentionConfigured: false,
    });

    const metrics = monitor.renderMetrics();
    expect(metrics).toMatch(/dvt_delivery_buffer_purge_configured 0/);
    expect(metrics).toMatch(/dvt_delivery_buffer_purge_disabled 1/);
    expect(metrics).toMatch(/dvt_run_event_retention_configured 0/);
    expect(metrics).toMatch(/dvt_run_event_retention_disabled 1/);
  });

  it('renders event-delivery latency histogram from claim to terminal delivery outcome', () => {
    const { clock, monitor } = createMonitorHarness();

    monitor.onBatchClaimed([makeRecord('1'), makeRecord('2')]);
    clock.nowMs += 120;
    monitor.onRecordDelivered(makeRecord('1'));
    clock.nowMs += 380;
    monitor.onRecordFailed(makeRecord('2'), 'downstream timeout', 'retry');

    const metrics = monitor.renderMetrics();
    expect(metrics).toMatch(/dvt_delivery_event_delivery_latency_seconds_bucket\{le="0.1"\} 0/);
    expect(metrics).toMatch(/dvt_delivery_event_delivery_latency_seconds_bucket\{le="0.25"\} 1/);
    expect(metrics).toMatch(/dvt_delivery_event_delivery_latency_seconds_bucket\{le="0.5"\} 2/);
    expect(metrics).toMatch(/dvt_delivery_event_delivery_latency_seconds_bucket\{le="\+Inf"\} 2/);
    expect(metrics).toMatch(/dvt_delivery_event_delivery_latency_seconds_sum 0.62/);
    expect(metrics).toMatch(/dvt_delivery_event_delivery_latency_seconds_count 2/);
  });
});
