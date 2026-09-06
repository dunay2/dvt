/**
 * @file packages/@dvt/traceability-service/src/lineage/logMessages.ts
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Keep lineage runtime log message keys explicit and separate from published lineage warning contracts
 * @consequence Operational logs can describe fail-open behavior without mutating OpenLineage warning payloads
 * @version 0.1.0
 */
/**
 * Internal operational log messages for lineage runtime plumbing.
 * These are not lineage warnings published through the lineage contract.
 */
export const LINEAGE_LOG_MESSAGE = {
  OUTBOX_ENQUEUE_FAILED_FAIL_OPEN:
    'lineage outbox enqueue failed - lineage event skipped (fail-open)',
} as const;
