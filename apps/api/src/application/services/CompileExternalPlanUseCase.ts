import type {
  ExecutionPlan,
  GenericGraphSourceV1,
  IPlanner,
  PlannerSelection,
  PlanCompileRequestV1SchemaT,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import { toExternalCompilePlannerEnvelope } from './externalCompilePlannerEnvelopeMapper.js';

export interface CompileExternalPlanCommand {
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: PlannerSelection;
  readonly policies: PlanCompileRequestV1SchemaT['policies'];
  readonly environment: PlanCompileRequestV1SchemaT['environment'];
  readonly observability: PlanCompileRequestV1SchemaT['observability'];
}

export interface CompileExternalPlanResult {
  readonly plan: ExecutionPlan;
}

export class CompileExternalPlanUseCase {
  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
    }
  ) {}

  public async execute(
    command: CompileExternalPlanCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<CompileExternalPlanResult> {
    const buildResult = await this.deps.planner.buildPlan(
      toExternalCompilePlannerEnvelope(command, context)
    );

    return {
      plan: buildResult.plan,
    };
  }
}
