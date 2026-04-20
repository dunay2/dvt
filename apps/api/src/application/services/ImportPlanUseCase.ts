import type { ExecutionPlan, PlanOwnership, PlanRef } from '@dvt/contracts';

export const IMPORT_PLAN_RESULT_KIND = {
  accepted: 'accepted',
  scopeMismatch: 'scopeMismatch',
} as const;

export interface ImportPlanCommand {
  readonly planRef: PlanRef;
  readonly ownership: PlanOwnership;
}

export type ImportPlanUseCaseResult =
  | {
      readonly kind: typeof IMPORT_PLAN_RESULT_KIND.accepted;
      readonly plan: ExecutionPlan;
      readonly planRef: PlanRef;
    }
  | {
      readonly kind: typeof IMPORT_PLAN_RESULT_KIND.scopeMismatch;
    };

export class ImportPlanUseCase {
  public constructor(
    private readonly deps: {
      readonly planResolver: { fetch(planRef: PlanRef): Promise<ExecutionPlan> };
    }
  ) {}

  public async execute(command: ImportPlanCommand): Promise<ImportPlanUseCaseResult> {
    const plan = await this.deps.planResolver.fetch(command.planRef);
    if (!isPlanOwnedByScope(plan, command.ownership)) {
      return { kind: IMPORT_PLAN_RESULT_KIND.scopeMismatch };
    }

    return {
      kind: IMPORT_PLAN_RESULT_KIND.accepted,
      plan,
      planRef: command.planRef,
    };
  }
}

function isPlanOwnedByScope(plan: ExecutionPlan, expectedOwnership: PlanOwnership): boolean {
  const actualOwnership = plan.metadata.ownership;
  if (actualOwnership === undefined) {
    return false;
  }

  return (
    actualOwnership.tenantId === expectedOwnership.tenantId &&
    actualOwnership.projectId === expectedOwnership.projectId &&
    actualOwnership.environmentId === expectedOwnership.environmentId
  );
}
