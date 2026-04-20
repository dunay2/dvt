import type {
  ExecutionPlan,
  GenericGraphSourceV1,
  IPlanExecutabilityValidator,
  IPlanValidationLifecycleStore,
  IPlanner,
  PlanRef,
  PlannerPolicyClassSet,
  PlannerSelection,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { StartRunPlannerEnvironmentInput } from '../ports/startRunCommandContract.js';

import { PLAN_ROUTE_POLICY_CATALOG } from './planRoutePolicyCatalog.js';
import { resolveAuthorizedPlannerInputEnvelope } from './resolveAuthorizedPlannerInputEnvelope.js';

type PreviewPlanValidationResult = Awaited<ReturnType<IPlanExecutabilityValidator['validatePlan']>>;

export interface PreviewPlanCommand {
  readonly targetAdapter: string;
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: PlannerSelection;
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
    const plannerInputSeed = {
      graphSource: command.graphSource,
      selection: command.selection,
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
