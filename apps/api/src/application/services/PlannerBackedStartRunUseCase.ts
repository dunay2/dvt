import type {
  IPlanExecutabilityValidator,
  IPlanValidationLifecycleStore,
  IPlanner,
  PlannerInputEnvelopeV2,
} from '@dvt/contracts';

import type {
  AuthorizedCommandExecutionContext,
  IStartRunUseCase,
  StartRunCommand,
  StartRunResult,
} from '../ports/auth.js';

export class PlannerBackedStartRunUseCase implements IStartRunUseCase {
  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
      readonly planStore: IPlanValidationLifecycleStore;
      readonly validator: IPlanExecutabilityValidator;
      readonly delegate: IStartRunUseCase;
    }
  ) {}

  public async execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunResult> {
    if (command.planRef) {
      return this.deps.delegate.execute(command, context);
    }

    const buildResult = await this.deps.planner.buildPlan(toPlannerInput(command, context));
    const planRef = await this.deps.planStore.storePlan(buildResult);
    const validation = await this.deps.validator.validatePlan(planRef, command.targetAdapter);

    if (validation.status === 'ERROR') {
      await this.deps.planStore.markInvalid(planRef, validation);
      return {
        kind: 'plan_rejected',
        accepted: false,
        code: validation.code,
        reason: validation.reason,
        ...(validation.cause !== undefined ? { cause: validation.cause } : {}),
      };
    }

    await this.deps.planStore.markValid(planRef);
    return this.deps.delegate.execute({ ...command, planRef }, context);
  }
}

function toPlannerInput(
  command: StartRunCommand,
  context: AuthorizedCommandExecutionContext
): PlannerInputEnvelopeV2 {
  return {
    ...(command.graphSource !== undefined ? { graphSource: command.graphSource } : {}),
    ...(command.manifestRef !== undefined ? { manifestRef: command.manifestRef } : {}),
    ...(command.manifest !== undefined ? { manifest: command.manifest } : {}),
    ...(command.nodes !== undefined ? { nodes: command.nodes } : {}),
    ...(command.policies !== undefined ? { policies: command.policies } : {}),
    ...(command.environment !== undefined ? { environment: command.environment } : {}),
    ...(command.observability !== undefined ? { observability: command.observability } : {}),
    selection: { selectedNodeIds: command.selection },
    requestedBy: context.principal.principalId,
    requestId: context.requestId,
    requestedAtIso: context.authorizedAt.toISOString(),
  };
}
