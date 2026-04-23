import type { ExecutableSubgraph } from './ExecutableSubgraph.v1.js';
import type { PlannerBuildResultV1, PlannerInputEnvelopeV1 } from './ExecutionPlan.v1.js';
import type { ExecutionSelection } from './ExecutionSelection.v1.js';
import type { WorkspaceGraphAuthoringDraft } from './WorkspaceGraphAuthoringDraft.v1.js';

/**
 * Canonical planner contract.
 */
export interface IPlanner {
  buildPlan(input: PlannerInputEnvelopeV1): Promise<PlannerBuildResultV1>;
  deriveExecutableSubgraph(input: {
    readonly draft: WorkspaceGraphAuthoringDraft;
    readonly selection: ExecutionSelection;
  }): ExecutableSubgraph;
}

/**
 * Named planner contract alias used by existing consumers.
 */
export interface IExecutionPlanner extends IPlanner {}
