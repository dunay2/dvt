import type { ExecutionPlan, PlanRef } from '@dvt/contracts';

export const IMPORT_PLAN_RESULT_KIND = {
  accepted: 'accepted',
  scopeMismatch: 'scopeMismatch',
} as const;

export interface ImportPlanCommand {
  readonly planRef: PlanRef;
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
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
    if (!isPlanOwnedByScope(plan, command)) {
      return { kind: IMPORT_PLAN_RESULT_KIND.scopeMismatch };
    }

    return {
      kind: IMPORT_PLAN_RESULT_KIND.accepted,
      plan,
      planRef: command.planRef,
    };
  }
}

function isPlanOwnedByScope(
  plan: ExecutionPlan,
  command: Pick<ImportPlanCommand, 'tenantId' | 'projectId' | 'environmentId'>
): boolean {
  const tags = plan.observability?.tags;
  if (tags === undefined) {
    return false;
  }

  return (
    tags['dvt.scope.tenantId'] === command.tenantId &&
    tags['dvt.scope.projectId'] === command.projectId &&
    tags['dvt.scope.environmentId'] === command.environmentId
  );
}
