import {
  DELIVERY_EVENT_LATENCY_BUCKETS_MS,
  RUNTIME_STATES,
  type OutboxDeliveryMetricsSnapshot,
  type OutboxRetentionMetricsSnapshot,
  type OutboxRuntimeMetricsSnapshot,
} from './model.js';
import {
  renderCounterMetric,
  renderGaugeMetric,
  roundToMillis,
  toUnixTimestampSeconds,
} from './support.js';

interface RenderOutboxWorkerMetricsArgs {
  runtime: OutboxRuntimeMetricsSnapshot;
  delivery: OutboxDeliveryMetricsSnapshot;
  retention: OutboxRetentionMetricsSnapshot;
}

export function renderOutboxWorkerMetrics(args: RenderOutboxWorkerMetricsArgs): string {
  const lines = [
    ...renderRuntimeHealthMetrics(args.runtime),
    ...renderRuntimeStateMetrics(args.runtime),
    ...renderOutboxCounterMetrics(args.runtime, args.delivery),
    ...renderLagAndTimestampMetrics(args.runtime, args.delivery),
    ...renderRetentionMetrics(args.retention),
    ...renderEventDeliveryLatencyMetrics(args.delivery),
  ];

  return `${lines.join('\n')}\n`;
}

function renderRuntimeHealthMetrics(runtime: OutboxRuntimeMetricsSnapshot): string[] {
  return [
    ...renderGaugeMetric(
      'dvt_outbox_runtime_up',
      'Whether the standalone outbox worker process is alive.',
      runtime.state === 'stopped' ? 0 : 1
    ),
    ...renderGaugeMetric(
      'dvt_outbox_runtime_ready',
      'Whether the worker is ready to drain outbox records.',
      runtime.ready ? 1 : 0
    ),
    ...renderGaugeMetric(
      'dvt_outbox_runtime_owner',
      'Whether this process currently owns active outbox draining.',
      runtime.owner ? 1 : 0
    ),
    ...renderGaugeMetric(
      'dvt_outbox_runtime_tick_fresh',
      'Whether the last completed tick is fresh enough for readiness.',
      runtime.tickFresh ? 1 : 0
    ),
  ];
}

function renderRuntimeStateMetrics(runtime: OutboxRuntimeMetricsSnapshot): string[] {
  return [
    '# HELP dvt_outbox_runtime_state Worker runtime state as a labelled gauge.',
    '# TYPE dvt_outbox_runtime_state gauge',
    ...RUNTIME_STATES.map(
      (state) => `dvt_outbox_runtime_state{state="${state}"} ${runtime.state === state ? 1 : 0}`
    ),
  ];
}

function renderOutboxCounterMetrics(
  runtime: OutboxRuntimeMetricsSnapshot,
  delivery: OutboxDeliveryMetricsSnapshot
): string[] {
  return [
    ...renderCounterMetric(
      'dvt_outbox_claimed_records_total',
      'Total claimed outbox records.',
      delivery.claimedRecordsTotal
    ),
    ...renderCounterMetric(
      'dvt_outbox_delivered_records_total',
      'Total delivered outbox records.',
      delivery.deliveredRecordsTotal
    ),
    ...renderCounterMetric(
      'dvt_outbox_retried_records_total',
      'Total outbox records scheduled for retry.',
      delivery.retriedRecordsTotal
    ),
    ...renderCounterMetric(
      'dvt_outbox_dead_lettered_records_total',
      'Total outbox records moved to DLQ.',
      delivery.deadLetteredRecordsTotal
    ),
    ...renderCounterMetric(
      'dvt_outbox_runtime_errors_total',
      'Total runtime loop errors.',
      runtime.runtimeErrorsTotal
    ),
  ];
}

function renderLagAndTimestampMetrics(
  runtime: OutboxRuntimeMetricsSnapshot,
  delivery: OutboxDeliveryMetricsSnapshot
): string[] {
  return [
    ...renderGaugeMetric(
      'dvt_outbox_oldest_claimed_lag_seconds',
      'Age of the oldest record in the last claimed batch.',
      delivery.lastClaimedLagSeconds
    ),
    ...renderGaugeMetric(
      'dvt_delivery_outbox_drain_lag_seconds',
      'Age of the oldest record in the last claimed batch (canonical delivery alias).',
      delivery.lastClaimedLagSeconds
    ),
    ...renderGaugeMetric(
      'dvt_outbox_last_claimed_batch_size',
      'Number of records claimed in the last completed tick.',
      delivery.lastBatchClaimedCount
    ),
    ...renderGaugeMetric(
      'dvt_outbox_last_tick_timestamp_seconds',
      'Unix timestamp of the last completed tick.',
      toUnixTimestampSeconds(runtime.lastTickAtMs)
    ),
    ...renderGaugeMetric(
      'dvt_outbox_last_error_timestamp_seconds',
      'Unix timestamp of the last runtime error.',
      toUnixTimestampSeconds(runtime.lastErrorAtMs)
    ),
    ...renderGaugeMetric(
      'dvt_outbox_process_start_timestamp_seconds',
      'Unix timestamp when the worker started.',
      toUnixTimestampSeconds(runtime.startedAtMs)
    ),
  ];
}

function renderRetentionMetrics(retention: OutboxRetentionMetricsSnapshot): string[] {
  return [
    ...renderCounterMetric(
      'dvt_run_event_retention_cycles_total',
      'Total run-event retention cycles executed.',
      retention.retentionCyclesTotal
    ),
    ...renderCounterMetric(
      'dvt_run_event_retention_cycle_failures_total',
      'Total failed run-event retention cycles.',
      retention.retentionCycleFailuresTotal
    ),
    ...renderCounterMetric(
      'dvt_run_event_retention_archived_units_total',
      'Total archive units exported successfully by retention cycles.',
      retention.retentionArchivedUnitsTotal
    ),
    ...renderGaugeMetric(
      'dvt_run_event_retention_last_cycle_duration_ms',
      'Duration of the last retention cycle.',
      retention.retentionLastCycleDurationMs
    ),
    ...renderGaugeMetric(
      'dvt_run_event_retention_last_success_timestamp_seconds',
      'Unix timestamp of the last successful retention cycle.',
      toUnixTimestampSeconds(retention.retentionLastSuccessAtMs)
    ),
    ...renderGaugeMetric(
      'dvt_run_event_retention_last_failure_timestamp_seconds',
      'Unix timestamp of the last failed retention cycle.',
      toUnixTimestampSeconds(retention.retentionLastFailureAtMs)
    ),
  ];
}

function renderEventDeliveryLatencyMetrics(delivery: OutboxDeliveryMetricsSnapshot): string[] {
  return [
    '# HELP dvt_delivery_event_delivery_latency_ms End-to-end delivery attempt latency from claim to delivered/failed observer callback.',
    '# TYPE dvt_delivery_event_delivery_latency_ms histogram',
    ...DELIVERY_EVENT_LATENCY_BUCKETS_MS.map(
      (le, index) =>
        `dvt_delivery_event_delivery_latency_ms_bucket{le="${le}"} ${delivery.eventDeliveryLatencyBucketCounts[index] ?? 0}`
    ),
    `dvt_delivery_event_delivery_latency_ms_bucket{le="+Inf"} ${delivery.eventDeliveryLatencyCount}`,
    `dvt_delivery_event_delivery_latency_ms_sum ${roundToMillis(delivery.eventDeliveryLatencySumMs)}`,
    `dvt_delivery_event_delivery_latency_ms_count ${delivery.eventDeliveryLatencyCount}`,
  ];
}
