/**
 * Owned concern: allocate a time-sortable execution identity at the protected
 * start-run boundary without owning runtime lifecycle semantics.
 */
import { randomUuidV7 } from '@dvt/crypto';

export type StartRunRunIdGenerator = () => string;

export function generatePlatformRunId(): string {
  return `run_${randomUuidV7()}`;
}
