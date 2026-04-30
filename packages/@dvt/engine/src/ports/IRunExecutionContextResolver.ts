/**
 * @ownedConcern Define the engine port for resolving run-execution-context payloads at admission time.
 */
import type { RunExecutionContext, RunExecutionContextRef } from '@dvt/contracts';

export interface IRunExecutionContextResolver {
  resolve(ref: RunExecutionContextRef): Promise<RunExecutionContext>;
}
