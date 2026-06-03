/**
 * Owned concern: publish the shared admission-observability metric and log
 * names consumed by decision and backlog telemetry adapters.
 */
export const ADMISSION_TELEMETRY_METRICS = Object.freeze({
  decisionTotal: 'dvt.admission.decision_total',
  rejectionTotal: 'dvt.admission.rejection_total',
  pendingEventsGauge: 'dvt.admission.pending_events_per_tenant',
  outboxOldestAgeGauge: 'dvt.admission.outbox_oldest_age_ms',
} as const);

export const ADMISSION_TELEMETRY_LOG = Object.freeze({
  decision: 'admission.decision',
} as const);
