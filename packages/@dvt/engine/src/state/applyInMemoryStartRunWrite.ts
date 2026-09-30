/**
 * @ownedConcern Canonical start-write validation inside the in-memory run transaction.
 * @baseline ADR-0030: Pre-dispatch intent ownership
 * @decision Keep start-specific invariants separate from storage locking and event persistence.
 * @consequence Both in-memory adapters use the same fenced start-write semantics.
 */
import { TERMINAL_RUN_STATUSES } from '@dvt/run-domain';

import { matchesStartRunWriteScope } from '../domain/startRunWritePolicy.js';
import type {
  IRunStateStore,
  StartRunWrite,
  StartRunWriteResult,
} from '../ports/IRunStateStore.js';
import type { StartRunIntentClaimReceipt } from '../ports/IStartRunIntentStore.js';

type Transaction = Pick<
  IRunStateStore,
  | 'getRunMetadataByRunId'
  | 'getSnapshot'
  | 'bootstrapRunTx'
  | 'saveProviderRef'
  | 'appendAndEnqueueTx'
>;

/** Caller holds the intent lock and the canonical run lock throughout this operation. */
export async function applyInMemoryStartRunWrite(
  transaction: Transaction,
  receipt: StartRunIntentClaimReceipt,
  write: StartRunWrite
): Promise<StartRunWriteResult> {
  if (!matchesStartRunWriteScope(receipt, write)) return 'conflict';
  if (write.kind === 'bootstrap') {
    await transaction.bootstrapRunTx(write.input);
    return 'applied';
  }
  const metadata = await transaction.getRunMetadataByRunId(receipt.tenantId, receipt.runId);
  if (!metadata) return 'missing';
  const snapshot = await transaction.getSnapshot(receipt.tenantId, receipt.runId);
  if (!snapshot || TERMINAL_RUN_STATUSES.has(snapshot.status)) return 'invalid_state';
  if (write.kind === 'bind_provider') {
    await transaction.saveProviderRef(receipt.tenantId, receipt.runId, write.providerRef);
  } else {
    await transaction.appendAndEnqueueTx(receipt.runId, write.events);
  }
  return 'applied';
}
