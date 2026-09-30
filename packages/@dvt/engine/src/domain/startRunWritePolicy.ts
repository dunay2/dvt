/**
 * @ownedConcern Tenant and run scope validation for owner-fenced canonical start writes.
 * @baseline ADR-0030: Pre-dispatch intent ownership
 * @decision Reject cross-scope payloads before any canonical mutation.
 * @consequence Storage adapters share the same start-write scope rules.
 */
import type { StartRunWrite } from '../ports/IRunStateStore.js';
import type { StartRunIntentClaimReceipt } from '../ports/IStartRunIntentStore.js';

export function matchesStartRunWriteScope(
  receipt: StartRunIntentClaimReceipt,
  write: StartRunWrite
): boolean {
  switch (write.kind) {
    case 'bootstrap':
      return (
        write.input.metadata.tenantId === receipt.tenantId &&
        write.input.metadata.runId === receipt.runId
      );
    case 'bind_provider':
      return write.providerRef.tenantId === receipt.tenantId;
    case 'fail':
      return (
        write.events.length > 0 &&
        write.events.every(
          (event) =>
            event.tenantId === receipt.tenantId &&
            event.runId === receipt.runId &&
            event.eventType === 'RunFailed'
        )
      );
  }
}
