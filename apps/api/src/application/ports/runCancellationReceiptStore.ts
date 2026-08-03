/** Owned concern: persist and query accepted cancellation-command receipts. */
import type { RunMetadata } from '@dvt/engine';

export interface RunCancellationReceiptKey {
  readonly tenantId: string;
  readonly runId: string;
}

export interface IRunCancellationReceiptStore {
  hasAccepted(key: RunCancellationReceiptKey): Promise<boolean>;
  recordAccepted(metadata: RunMetadata): Promise<void>;
}
