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
  PlannerPolicyClassSet,
  PlannerSelection,
  PlanPreviewProvenance,
  PlanPreviewSelectionRejection,
  StartRunPlannerEnvironmentInput,
} from '@dvt/contracts';
import type { IPlanExecutabilityValidator } from '@dvt/planner';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import { PLAN_ROUTE_POLICY_CATALOG } from './planRoutePolicyCatalog.js';
import { resolveAuthorizedPlannerInputEnvelope } from './resolveAuthorizedPlannerInputEnvelope.js';
import { ResolveAuthorizedPreviewSelectionService } from './resolveAuthorizedPreviewSelection.js';
import { createScopedPlanRef } from './storedPlanScope.js';

type PreviewPlanValidationResult = Awaited<ReturnType<IPlanExecutabilityValidator['validatePlan']>>;

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
  selectionRejected: 'selection-rejected',
  planInvalid: 'plan-invalid',
} as const;

export type PreviewPlanUseCaseResult =
  | {
      readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.accepted;
      readonly plan: ExecutionPlan;
      readonly planRef: PlanRef;
    }
  | {
      readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.selectionRejected;
      readonly rejection: PlanPreviewSelectionRejection;
    }
  | {
      readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.planInvalid;
      readonly plan: ExecutionPlan;
      readonly planRef: PlanRef;
      readonly validation: Extract<PreviewPlanValidationResult, { readonly status: 'ERROR' }>;
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
        kind: PREVIEW_PLAN_RESULT_KIND.selectionRejected,
        rejection: previewSelection.rejection,
      };
    }

    const plannerInputSeed = {
      graphSource: previewSelection.value.graphSource,
      selection: {
        selectedNodeIds: previewSelection.value.nodeIds,
      } satisfies PlannerSelection,
      decisionScope: {
        nodeIds: previewSelection.value.decisionScopeNodeIds,
        requestedRootNodeIds: previewSelection.value.requestedRootNodeIds,
      },
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
    const scopedPlanRef = createScopedPlanRef({
      scope: buildResult.plan.metadata.ownership,
      planRef,
    });
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
        kind: PREVIEW_PLAN_RESULT_KIND.planInvalid,
        plan: buildResult.plan,
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
