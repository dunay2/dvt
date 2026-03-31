import type {
  IPlanExecutabilityValidator,
  IPlanValidationLifecycleStore,
  IPlanner,
  PlannerInputEnvelopeV2,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { StartRunCommand } from '../ports/startRunCommandContract.js';
import {
  START_RUN_PLAN_REJECTION_CODE,
  START_RUN_RESULT_KIND,
} from '../ports/startRunResultContract.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCaseContract.js';
import {
  formatManifestArtifactResolutionReason,
  isManifestArtifactResolutionError,
  mapManifestArtifactResolutionCause,
} from '../errors/ManifestArtifactResolutionError.js';

type PlanValidationResult = Awaited<ReturnType<IPlanExecutabilityValidator['validatePlan']>>;

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
  ): Promise<StartRunUseCaseResult> {
    if (command.planRef != null) {
      return this.deps.delegate.execute(command, context);
    }

    let buildResult: Awaited<ReturnType<IPlanner['buildPlan']>>;
    try {
      buildResult = await this.deps.planner.buildPlan(toPlannerInput(command, context));
    } catch (error) {
      const rejection = mapManifestResolutionFailure(error);
      if (rejection !== null) {
        return rejection;
      }
      throw error;
    }
    const planRef = await this.deps.planStore.storePlan(buildResult);
    const validation = await this.deps.validator.validatePlan(planRef, command.targetAdapter);

    if (isValidationError(validation)) {
      await this.deps.planStore.markInvalid(planRef, validation);
      return {
        ok: true,
        value: {
          kind: START_RUN_RESULT_KIND.planRejected,
          accepted: false,
          code: validation.code,
          reason: validation.reason,
          ...(validation.cause === undefined ? {} : { cause: validation.cause }),
        },
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
    ...(command.graphSource === undefined ? {} : { graphSource: command.graphSource }),
    ...(command.manifestRef === undefined ? {} : { manifestRef: command.manifestRef }),
    ...(command.manifest === undefined ? {} : { manifest: command.manifest }),
    ...(command.nodes === undefined ? {} : { nodes: command.nodes }),
    ...(command.policies === undefined ? {} : { policies: command.policies }),
    ...(command.environment === undefined ? {} : { environment: command.environment }),
    ...(command.observability === undefined ? {} : { observability: command.observability }),
    selection: { selectedNodeIds: command.selection },
    requestedBy: context.principal.principalId,
    requestId: context.requestId,
    requestedAtIso: context.authorizedAt.toISOString(),
  };
}

function isValidationError(
  validation: PlanValidationResult
): validation is Extract<PlanValidationResult, { readonly status: 'ERROR' }> {
  return validation.status === 'ERROR';
}

function mapManifestResolutionFailure(error: unknown): StartRunUseCaseResult | null {
  if (!isManifestArtifactResolutionError(error)) {
    return null;
  }

  return {
    ok: true,
    value: {
      kind: START_RUN_RESULT_KIND.planRejected,
      accepted: false,
      code: START_RUN_PLAN_REJECTION_CODE.rejected,
      reason: formatManifestArtifactResolutionReason(error.kind, error.detail),
      cause: mapManifestArtifactResolutionCause(error.kind),
    },
  };
}
