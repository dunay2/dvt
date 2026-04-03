import type { RunExecutionContext, RunExecutionContextRef } from '@dvt/contracts';

/**
 * Runtime resolver used by start-run admission to load and validate
 * runExecutionContext payloads before adapter dispatch.
 */
export interface IRunExecutionContextResolver {
  resolve(ref: RunExecutionContextRef): Promise<RunExecutionContext>;
}
