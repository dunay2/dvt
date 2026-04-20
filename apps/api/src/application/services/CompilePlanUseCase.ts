import type {
  ExecutionPlan,
  GenericGraphSourceV1,
  IPlanner,
  PlannerSelection,
  PlanCompileRequestV1SchemaT,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import { toPlanCompilePlannerEnvelope } from './planCompilePlannerEnvelopeMapper.js';

export interface CompilePlanCommand {
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: PlannerSelection;
  readonly policies: PlanCompileRequestV1SchemaT['policies'];
  readonly environment: PlanCompileRequestV1SchemaT['environment'];
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
    const buildResult = await this.deps.planner.buildPlan(
      toPlanCompilePlannerEnvelope(command, context)
    );

    return {
      plan: buildResult.plan,
    };
  }
}
