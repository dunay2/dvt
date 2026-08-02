/** Owned concern: resolve a server-persisted execution-context reference by authorized run identity. */
import type { RunExecutionContextRef } from '@dvt/contracts';

export interface RunExecutionContextReferenceQuery {
  readonly tenantId: string;
  readonly runId: string;
}

export interface IRunExecutionContextReferenceReader {
  read(query: RunExecutionContextReferenceQuery): Promise<RunExecutionContextRef | undefined>;
}
