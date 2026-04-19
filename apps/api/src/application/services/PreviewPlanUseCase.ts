import type {
  ExecutionPlan,
  GenericGraphSourceV1,
  IPlanExecutabilityValidator,
  IPlanValidationLifecycleStore,
  IPlanner,
  PlanPreviewProvenance,
  PlanRef,
  PlannerPolicyClassSet,
  PlannerSelection,
  PreviewProfile,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { StartRunPlannerEnvironmentInput } from '../ports/startRunCommandContract.js';

import { resolveCanonicalPlannerInputEnvelope } from './resolveCanonicalPlannerInputEnvelope.js';

type PreviewPlanValidationResult = Awaited<ReturnType<IPlanExecutabilityValidator['validatePlan']>>;

export interface PreviewPlanProfile {
  readonly previewProfile: PreviewProfile;
  readonly executor?: 'dbt' | 'postgres';
}

export interface PreviewPlanCommand {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
  readonly targetAdapter: string;
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: PlannerSelection;
  readonly previewProfile: PreviewPlanProfile;
  readonly provenance?: PlanPreviewProvenance;
  readonly policies?: PlannerPolicyClassSet;
  readonly environment?: StartRunPlannerEnvironmentInput;
  readonly observability?: ExecutionPlan['observability'];
}

export const PREVIEW_PLAN_RESULT_KIND = {
  accepted: 'accepted',
  rejected: 'rejected',
} as const;

export type PreviewPlanUseCaseResult =
  | {
      readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.accepted;
      readonly plan: ExecutionPlan;
      readonly planRef: PlanRef;
    }
  | {
      readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.rejected;
      readonly planRef: PlanRef;
      readonly validation: Extract<PreviewPlanValidationResult, { readonly status: 'ERROR' }>;
    };

export class PreviewPlanUseCase {
  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
      readonly planStore: IPlanValidationLifecycleStore;
      readonly planValidator: IPlanExecutabilityValidator;
    }
  ) {}

  public async execute(
    command: PreviewPlanCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<PreviewPlanUseCaseResult> {
    const plannerInput = resolveCanonicalPlannerInputEnvelope({
      graphSource: command.graphSource,
      selection: command.selection,
      ...(command.policies === undefined ? {} : { policies: command.policies }),
      ...(command.environment === undefined ? {} : { environment: command.environment }),
      ownership: {
        tenantId: command.tenantId,
        projectId: command.projectId,
        environmentId: command.environmentId,
      },
      observability: buildPreviewObservability(command),
      requestedBy: context.principal.principalId,
      requestId: context.requestId,
      requestedAtIso: context.authorizedAt.toISOString(),
    });

    const buildResult = await this.deps.planner.buildPlan(plannerInput);
    const planRef = await this.deps.planStore.storePlan(buildResult);
    const validation = await this.deps.planValidator.validatePlan(planRef, command.targetAdapter);

    if (validation.status === 'ERROR') {
      await this.deps.planStore.markInvalid(planRef, validation);
      return {
        kind: PREVIEW_PLAN_RESULT_KIND.rejected,
        planRef,
        validation,
      };
    }

    await this.deps.planStore.markValid(planRef);
    return {
      kind: PREVIEW_PLAN_RESULT_KIND.accepted,
      plan: buildResult.plan,
      planRef,
    };
  }
}

function buildPreviewObservability(
  command: PreviewPlanCommand
): NonNullable<ExecutionPlan['observability']> {
  const baseObservability = command.observability;
  const baseExtra = baseObservability?.extra ?? {};
  const extraWithRuntimeBinding =
    command.previewProfile.executor === undefined
      ? baseExtra
      : {
          ...baseExtra,
          transformationFlowRuntime: {
            previewProfile: command.previewProfile.previewProfile,
            executor: command.previewProfile.executor,
          },
        };
  const extraWithProvenance =
    command.provenance === undefined
      ? extraWithRuntimeBinding
      : {
          ...extraWithRuntimeBinding,
          transformationFlowProvenance: command.provenance,
        };

  return {
    ...baseObservability,
    tags: {
      ...baseObservability?.tags,
      'dvt.scope.tenantId': command.tenantId,
      'dvt.scope.projectId': command.projectId,
      'dvt.scope.environmentId': command.environmentId,
    },
    ...(Object.keys(extraWithProvenance).length === 0 ? {} : { extra: extraWithProvenance }),
  };
}
