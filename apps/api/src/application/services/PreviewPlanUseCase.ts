/**
 * Owned concern: compile preview requests from canonical execution selection
 * through planner-owned selected-closure resolution without widening to the
 * whole protected draft.
 */
import type {
  IPlanStoreReader,
  IStoredPlanArtifactReader,
  IStoredPlanArtifactWriter,
} from '@dvt/artifacts';
import type {
  DvtProtectedWorkspaceGraphProvenance,
  ExecutionPlan,
  ExecutionSelection,
  GenericGraphSourceV1,
  IPlanner,
  PlanRecord,
  PlanRef,
  PlannerSelection,
  NonDvtPlanPreviewProvenance,
  PlanPreviewSelectionRejection,
  RunParameterOverride,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import { bindDbtInvocationPlan, hasSubmittedDbtInvocation } from './dbt/dbtRunParameterBinding.js';
import { resolveAuthorizedPlannerInputEnvelope } from './resolveAuthorizedPlannerInputEnvelope.js';
import { ResolveAuthorizedPreviewSelectionService } from './resolveAuthorizedPreviewSelection.js';
import {
  StoredPlanAdmissionCoordinator,
  type StoredPlanAdmissionResult,
} from './StoredPlanAdmissionCoordinator.js';
import type { StoredPlanExecutabilityValidator } from './StoredPlanExecutabilityValidator.js';

type PreviewPlanCommandCommon = {
  readonly targetAdapter: string;
  readonly selection: ExecutionSelection;
  readonly observability?: ExecutionPlan['observability'];
};

export type PreviewPlanCommand =
  | (PreviewPlanCommandCommon & {
      readonly provenance: DvtProtectedWorkspaceGraphProvenance;
      readonly graphSource?: never;
    })
  | (PreviewPlanCommandCommon & {
      readonly graphSource: GenericGraphSourceV1;
      readonly provenance?: NonDvtPlanPreviewProvenance;
      readonly parameterOverrides?: readonly RunParameterOverride[];
    });

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
      readonly planRecord: PlanRecord;
    }
  | {
      readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.selectionRejected;
      readonly rejection: PlanPreviewSelectionRejection;
    }
  | {
      readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.planInvalid;
      readonly plan: ExecutionPlan;
      readonly planRef: PlanRef;
      readonly planRecord: PlanRecord;
      readonly validation: Extract<
        StoredPlanAdmissionResult['validation'],
        { readonly status: 'ERROR' }
      >;
    };

export class PreviewPlanUseCase {
  private readonly planAdmission: StoredPlanAdmissionCoordinator;

  public constructor(
    private readonly deps: {
      readonly planner: IPlanner;
      readonly planStore: IStoredPlanArtifactWriter &
        Pick<IStoredPlanArtifactReader, 'getStoredPlanValidationRecord'> &
        Pick<IPlanStoreReader, 'getPlanRecordByRef'>;
      readonly planValidator: Pick<StoredPlanExecutabilityValidator, 'materializeAndValidatePlan'>;
      readonly previewSelectionResolver: ResolveAuthorizedPreviewSelectionService;
    }
  ) {
    this.planAdmission = new StoredPlanAdmissionCoordinator({
      planStore: deps.planStore,
      validator: deps.planValidator,
    });
  }

  public async execute(
    command: PreviewPlanCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<PreviewPlanUseCaseResult> {
    if (hasSubmittedDbtInvocation(command)) {
      return {
        kind: PREVIEW_PLAN_RESULT_KIND.selectionRejected,
        rejection: {
          code: 'REJECTED',
          cause: 'dbt_project_parameters_invalid',
          reason: 'Invocation evidence is produced by native dbt Preview.',
        },
      };
    }
    const selectionInput =
      command.graphSource === undefined
        ? { selection: command.selection, provenance: command.provenance }
        : {
            selection: command.selection,
            graphSource: command.graphSource,
            ...(command.provenance === undefined ? {} : { provenance: command.provenance }),
            ...(command.parameterOverrides === undefined
              ? {}
              : { parameterOverrides: command.parameterOverrides }),
          };
    const previewSelection = await this.deps.previewSelectionResolver.execute(
      selectionInput,
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
      ...(command.observability === undefined ? {} : { observability: command.observability }),
    };

    const plannerInput = resolveAuthorizedPlannerInputEnvelope(plannerInputSeed, context);

    const buildResult = await this.deps.planner.buildPlan(plannerInput);
    const variables = previewSelection.value.dbtVariablesJson;
    const compiled =
      variables !== undefined && command.provenance?.kind === 'dbt-project-files'
        ? {
            ...buildResult,
            plan: bindDbtInvocationPlan(buildResult.plan, command.provenance, variables),
          }
        : buildResult;
    const admission = await this.planAdmission.admit(compiled, command.targetAdapter);

    if (!admission.accepted) {
      return {
        kind: PREVIEW_PLAN_RESULT_KIND.planInvalid,
        plan: admission.materialized?.plan ?? compiled.plan,
        planRef: admission.planRef,
        planRecord: admission.planRecord,
        validation: admission.validation,
      };
    }

    return {
      kind: PREVIEW_PLAN_RESULT_KIND.accepted,
      plan: admission.materialized.plan,
      planRef: admission.planRef,
      planRecord: admission.planRecord,
    };
  }
}
