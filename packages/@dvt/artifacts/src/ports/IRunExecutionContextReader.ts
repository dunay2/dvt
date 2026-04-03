import type { RunExecutionContext, RunExecutionContextRef } from '@dvt/contracts';

/**
 * Read-side run execution context port owned by the Artifacts bounded context.
 *
 * This resolves immutable runExecutionContext payloads referenced from the
 * start-run boundary.
 */
export interface IRunExecutionContextReader {
  resolve(ref: RunExecutionContextRef): Promise<RunExecutionContext>;
}
