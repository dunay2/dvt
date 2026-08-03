/** Owned concern: persist and query accepted cancellation-command receipts. */
import type { RunMetadata } from '@dvt/engine';

export type RunCancellationReceiptKey = Pick<
  RunMetadata,
  'tenantId' | 'runId' | 'logicalAttemptId' | 'planId' | 'planVersion'
>;

export function toRunCancellationReceiptKey(metadata: RunMetadata): RunCancellationReceiptKey {
  return {
    tenantId: metadata.tenantId,
    runId: metadata.runId,
    logicalAttemptId: metadata.logicalAttemptId,
    planId: metadata.planId,
    planVersion: metadata.planVersion,
  };
}

export interface IRunCancellationReceiptStore {
  hasAccepted(key: RunCancellationReceiptKey): Promise<boolean>;
  recordAccepted(metadata: RunMetadata): Promise<void>;
}
