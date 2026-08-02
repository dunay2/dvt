/** Owned concern: resolve a server-persisted execution-context reference by authorized run identity. */
import type { RunExecutionContextRef } from '@dvt/contracts';

export interface RunExecutionContextReferenceQuery {
  readonly tenantId: string;
  readonly runId: string;
}

export type RunExecutionContextReferenceReadResult =
  | Readonly<{ kind: 'absent' }>
  | Readonly<{ kind: 'trusted'; ref: RunExecutionContextRef }>
  | Readonly<{
      kind: 'untrusted';
      reason:
        | 'reference_missing'
        | 'reference_invalid'
        | 'reference_mismatch'
        | 'context_missing'
        | 'digest_mismatch';
    }>;

export interface IRunExecutionContextReferenceReader {
  read(query: RunExecutionContextReferenceQuery): Promise<RunExecutionContextReferenceReadResult>;
}
