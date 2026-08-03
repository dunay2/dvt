/** Owned concern: persist a trusted execution context for a recovery descendant. */
import type { RunExecutionContextRef } from '@dvt/contracts';

export interface RunExecutionContextInheritanceCommand {
  readonly tenantId: string;
  readonly sourceRunId: string;
  readonly recoveryRunId: string;
  readonly sourceRef: RunExecutionContextRef;
}

export interface IRunExecutionContextInheritanceWriter {
  inherit(command: RunExecutionContextInheritanceCommand): Promise<RunExecutionContextRef>;
}
