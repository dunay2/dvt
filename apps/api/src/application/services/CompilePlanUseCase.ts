import type {
  ExecutionPlan,
  GenericGraphSourceV1,
  IPlanner,
  PlannerSelection,
  PlanCompileRequestV1SchemaT,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import { resolveAuthorizedPlannerInputEnvelope } from './resolveAuthorizedPlannerInputEnvelope.js';

export interface CompilePlanCommand {
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: PlannerSelection;
  readonly policies: PlanCompileRequestV1SchemaT['policies'];
  readonly observability: PlanCompileRequestV1SchemaT['observability'];
}

export interface CompilePlanResult {
  readonly plan: ExecutionPlan;
}

export class CompilePlanUseCase {
  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
    }
  ) {}

  public async execute(
    command: CompilePlanCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<CompilePlanResult> {
    const plannerInputSeed = {
      graphSource: command.graphSource,
      selection: command.selection,
      ...(command.policies === undefined ? {} : { policies: command.policies }),
      ...(command.observability === undefined ? {} : { observability: command.observability }),
    };

    const buildResult = await this.deps.planner.buildPlan(
      resolveAuthorizedPlannerInputEnvelope(plannerInputSeed, context)
    );

    return {
      plan: buildResult.plan,
    };
  }
}
