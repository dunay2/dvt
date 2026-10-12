/**
 * Owned concern: prepare one plugin's immutable context for an admitted plan.
 * @baseline ADR-0018: Behavioral ports belong to their application owner.
 * @decision Keep provider selection and preparation behind one injected port.
 * @consequence Run orchestration knows neither bundles nor database publication.
 * @version 1.0.0
 */
import type { ExecutionPlan, OperationalRejection, PlanRef, StartRunCommand } from '@dvt/contracts';

import type { WorkspaceStorageScope } from './workspaceFiles.js';

export type RunExecutionContextPreparation = Readonly<{
  plan: ExecutionPlan;
  planRef: PlanRef;
  runId: string;
  targetAdapter: StartRunCommand['targetAdapter'];
  scope: WorkspaceStorageScope;
}>;

export type PreparedRunPluginContext =
  | Readonly<{ ok: true; context: Readonly<Record<string, unknown>> }>
  | (Readonly<{ ok: false }> & OperationalRejection);

export interface IRunExecutionContextPreparer {
  readonly contextKey: string;
  isRequired(plan: ExecutionPlan): boolean;
  prepare(input: RunExecutionContextPreparation): Promise<PreparedRunPluginContext>;
}

export class DuplicateRunContextPreparerError extends Error {
  public readonly name = 'DuplicateRunContextPreparerError';

  public constructor() {
    super('Run execution-context preparers must have unique context keys.');
  }
}
