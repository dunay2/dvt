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
        ...(validation.cause === undefined ? {} : { cause: validation.cause }),
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
  const result: PlannerInputEnvelopeV2 = {
    selection: { selectedNodeIds: command.selection },
    requestedBy: context.principal.principalId,
    requestId: context.requestId,
    requestedAtIso: context.authorizedAt.toISOString(),
  };
  if (command.graphSource !== undefined) {
    result.graphSource = command.graphSource;
  }
  if (command.manifestRef !== undefined) {
    result.manifestRef = command.manifestRef;
  }
  if (command.manifest !== undefined) {
    result.manifest = command.manifest;
  }
  if (command.nodes !== undefined) {
    result.nodes = command.nodes;
  }
  if (command.policies !== undefined) {
    result.policies = command.policies;
  }
  if (command.environment !== undefined) {
    result.environment = command.environment;
  }
  if (command.observability !== undefined) {
    result.observability = command.observability;
  }
  return result;
}
