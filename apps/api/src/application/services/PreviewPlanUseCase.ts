/**
 * Owned concern: compile preview requests from canonical execution selection
 * through planner-owned selected-closure resolution without widening to the
 * whole protected draft.
 */
import type {
  ExecutionPlan,
  ExecutionSelection,
  GenericGraphSourceV1,
  IPlanner,
  PlanRef,
  PlannerPolicyClassSet,
  PlannerSelection,
  StartRunPlannerEnvironmentInput,
} from '@dvt/contracts';
import type {
  IPlanExecutabilityValidator,
  IPlanValidationLifecycleStore,
} from '@dvt/planner';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import { PLAN_ROUTE_POLICY_CATALOG } from './planRoutePolicyCatalog.js';
import { ResolveAuthorizedExecutableSubgraphService } from './resolveAuthorizedExecutableSubgraph.js';
import { resolveAuthorizedPlannerInputEnvelope } from './resolveAuthorizedPlannerInputEnvelope.js';

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
      readonly planStore: IPlanValidationLifecycleStore;
      readonly planValidator: IPlanExecutabilityValidator;
      readonly executableSubgraphResolver: ResolveAuthorizedExecutableSubgraphService;
    }
  ) {}

  public async execute(
    command: PreviewPlanCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<PreviewPlanUseCaseResult> {
    const executableSubgraph = await this.deps.executableSubgraphResolver.execute(
      {
        selection: command.selection,
        graphSource: command.graphSource,
      },
      context
    );
    if (!executableSubgraph.ok) {
      return {
        kind: PREVIEW_PLAN_RESULT_KIND.rejected,
        validation: {
          status: 'ERROR',
          planId: 'selection',
          adapterId: command.targetAdapter,
          degradable: false,
          ...executableSubgraph.rejection,
        },
      };
    }

    const plannerInputSeed = {
      graphSource: command.graphSource,
      selection: {
        selectedNodeIds: executableSubgraph.value.nodeIds,
      } satisfies PlannerSelection,
      ...(command.policies === undefined ? {} : { policies: command.policies }),
      ...(command.environment === undefined ? {} : { environment: command.environment }),
      ...(command.observability === undefined
        ? {}
        : { observability: command.observability }),
    };

    const plannerInput = resolveAuthorizedPlannerInputEnvelope(
      plannerInputSeed,
      context,
      PLAN_ROUTE_POLICY_CATALOG.PREVIEW.plannerInput
    );

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
