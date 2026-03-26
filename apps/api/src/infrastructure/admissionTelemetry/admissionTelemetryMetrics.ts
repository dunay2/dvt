/**
 * Metric name constants for admission telemetry.
 * Naming convention: dvt.{domain}.{noun}_{verb/descriptor}
 *
 * Labels:
 *   decisionTotal      → { mode, decision }          (low-cardinality enums only)
 *   rejectionTotal     → { mode, decision, code }
 *   pendingEventsGauge → { source }                   (tenantId omitted — high-cardinality)
 *   outboxOldestAgeGauge → { source }
 */
export const ADMISSION_TELEMETRY_METRICS = Object.freeze({
  decisionTotal: 'dvt.admission.decision_total',
  rejectionTotal: 'dvt.admission.rejection_total',
  pendingEventsGauge: 'dvt.admission.pending_events_per_tenant',
  outboxOldestAgeGauge: 'dvt.admission.outbox_oldest_age_ms',
} as const);
