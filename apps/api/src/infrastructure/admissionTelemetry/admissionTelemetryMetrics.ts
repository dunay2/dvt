export const ADMISSION_TELEMETRY_METRICS = Object.freeze({
  decisionTotal: 'dvt.admission.decision_total',
  rejectionTotal: 'dvt.admission.rejection_total',
  pendingEventsGauge: 'dvt.admission.backpressure_pending_events',
  outboxOldestAgeGauge: 'dvt.admission.outbox_oldest_age_ms',
} as const);

export const ADMISSION_TELEMETRY_LOG = Object.freeze({
  decision: 'admission.decision',
} as const);
