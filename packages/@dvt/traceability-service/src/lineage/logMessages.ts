/**
 * Internal operational log messages for lineage runtime plumbing.
 * These are not lineage warnings published through the lineage contract.
 */
export const LINEAGE_LOG_MESSAGE = {
  OUTBOX_ENQUEUE_FAILED_FAIL_OPEN:
    'lineage outbox enqueue failed - lineage event skipped (fail-open)',
} as const;
