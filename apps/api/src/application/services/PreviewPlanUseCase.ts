/**
 * Owned concern: compile preview requests from canonical execution selection
 * through planner-owned selected-closure resolution without widening to the
 * whole protected draft.
 */
import type { IStoredPlanArtifactReader, IStoredPlanArtifactWriter } from '@dvt/artifacts';
import type {
  ExecutionPlan,
  ExecutionSelection,
  GenericGraphSourceV1,
  IPlanner,
  PlanRef,
  PlannerBuildResultV1,
  PlannerPolicyClassSet,
  PlannerSelection,
  PlanPreviewProvenance,
  ScopedPlanRef,
  StartRunPlannerEnvironmentInput,
} from '@dvt/contracts';
import type { IPlanExecutabilityValidator } from '@dvt/planner';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import { PLAN_ROUTE_POLICY_CATALOG } from './planRoutePolicyCatalog.js';
import { resolveAuthorizedPlannerInputEnvelope } from './resolveAuthorizedPlannerInputEnvelope.js';
import { ResolveAuthorizedPreviewSelectionService } from './resolveAuthorizedPreviewSelection.js';

type PreviewPlanValidationResult = Awaited<ReturnType<IPlanExecutabilityValidator['validatePlan']>>;
type PreviewPlanSemanticRejection = {
  readonly status: 'ERROR';
  readonly planId: string;
  readonly adapterId: string;
  readonly code: 'REJECTED';
  readonly degradable: false;
  readonly reason: string;
  readonly cause: string;
};

export interface PreviewPlanCommand {
  readonly targetAdapter: string;
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: ExecutionSelection;
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
      readonly planRef?: PlanRef;
      readonly validation:
        | Extract<PreviewPlanValidationResult, { readonly status: 'ERROR' }>
        | PreviewPlanSemanticRejection;
    };

export class PreviewPlanUseCase {
  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
      readonly planStore: IStoredPlanArtifactWriter &
        Pick<IStoredPlanArtifactReader, 'getStoredPlanValidationRecord'>;
      readonly planValidator: IPlanExecutabilityValidator;
      readonly previewSelectionResolver: ResolveAuthorizedPreviewSelectionService;
    }
  ) {}

  public async execute(
    command: PreviewPlanCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<PreviewPlanUseCaseResult> {
    const previewSelection = await this.deps.previewSelectionResolver.execute(
      {
        selection: command.selection,
        graphSource: command.graphSource,
        ...(command.provenance === undefined ? {} : { provenance: command.provenance }),
      },
      context
    );
    if (!previewSelection.ok) {
      return {
        kind: PREVIEW_PLAN_RESULT_KIND.rejected,
        validation: {
          status: 'ERROR',
          planId: 'selection',
          adapterId: command.targetAdapter,
          degradable: false,
          ...previewSelection.rejection,
        },
      };
    }

    const plannerInputSeed = {
      graphSource: previewSelection.value.graphSource,
      selection: {
        selectedNodeIds: previewSelection.value.nodeIds,
      } satisfies PlannerSelection,
      ...(command.policies === undefined ? {} : { policies: command.policies }),
      ...(command.environment === undefined ? {} : { environment: command.environment }),
      ...(command.observability === undefined ? {} : { observability: command.observability }),
    };

    const plannerInput = resolveAuthorizedPlannerInputEnvelope(
      plannerInputSeed,
      context,
      PLAN_ROUTE_POLICY_CATALOG.PREVIEW.plannerInput
    );

    const buildResult = await this.deps.planner.buildPlan(plannerInput);
    const planRef = await this.deps.planStore.storePlanArtifact({ buildResult });
    const scopedPlanRef = toScopedPlanRef(buildResult, planRef);
    const validation = await this.deps.planValidator.validatePlan({
      ...scopedPlanRef,
      adapterId: command.targetAdapter,
    });

    if (validation.status === 'ERROR') {
      await this.deps.planStore.markStoredPlanArtifactInvalid({
        ...scopedPlanRef,
        report: validation,
      });
      return {
        kind: PREVIEW_PLAN_RESULT_KIND.rejected,
        planRef,
        validation,
      };
    }

    const validationRecord = await this.deps.planStore.getStoredPlanValidationRecord({
      tenantId: scopedPlanRef.tenantId,
      projectId: scopedPlanRef.projectId,
      environmentId: scopedPlanRef.environmentId,
      planId: scopedPlanRef.planRef.planId,
    });
    if (validationRecord?.state !== 'VALID') {
      await this.deps.planStore.markStoredPlanArtifactValid(scopedPlanRef);
    }
    return {
      kind: PREVIEW_PLAN_RESULT_KIND.accepted,
      plan: buildResult.plan,
      planRef,
    };
  }
}

function toScopedPlanRef(buildResult: PlannerBuildResultV1, planRef: PlanRef): ScopedPlanRef {
  const ownership = buildResult.plan.metadata.ownership;
  if (ownership === undefined) {
    throw new Error('PLAN_STORE_SCOPE_MISSING');
  }
  return {
    tenantId: ownership.tenantId,
    projectId: ownership.projectId,
    environmentId: ownership.environmentId,
    planRef,
  };
}
