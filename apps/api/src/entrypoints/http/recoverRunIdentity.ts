/** Owned concern: derive a stable platform run identity for one recovery command intent. */
import { createHash } from 'node:crypto';

export function deriveRecoveryRunId(input: {
  readonly tenantId: string;
  readonly sourceRunId: string;
  readonly idempotencyKey: string;
}): string {
  const digest = createHash('sha256')
    .update(input.tenantId, 'utf8')
    .update('\0', 'utf8')
    .update(input.sourceRunId, 'utf8')
    .update('\0', 'utf8')
    .update(input.idempotencyKey, 'utf8')
    .digest('hex');

  return `run_recovery_${digest.slice(0, 40)}`;
}
