/**
 * @ownedConcern Resolve scoped Temporal plan artifacts for engine dispatch.
 * @baseline ADR-0043: Plan Record, Plan Store, And Artifacts Ownership
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Fetch engine dispatch artifacts through the engine-owned integrity port before segment projection.
 * @consequence Temporal activity composition cannot bypass plan ownership or execution-policy validation.
 * @version 1.0.0
 */
import type { PlanRef, ResolvedRunContext, RunExecutionPolicy } from '@dvt/contracts';
import type { ExecutionPlan, IPlanFetcher, IPlanIntegrityValidator } from '@dvt/engine';

export interface FetchPlanForEngineDispatchInput {
  planRef: PlanRef;
  ctx: ResolvedRunContext;
}

export interface FetchPlanForEngineDispatchResult {
  plan: ExecutionPlan;
  executionPolicy: RunExecutionPolicy;
}

export interface TemporalPlanArtifactReader {
  fetchForEngineDispatch(
    input: FetchPlanForEngineDispatchInput
  ): Promise<FetchPlanForEngineDispatchResult>;
  close?(): Promise<void>;
}

export interface CreateScopedTemporalPlanArtifactReaderArgs {
  fetcher: IPlanFetcher & { close?(): Promise<void> };
  integrity: IPlanIntegrityValidator;
}

export function createScopedTemporalPlanArtifactReader(
  args: CreateScopedTemporalPlanArtifactReaderArgs
): TemporalPlanArtifactReader {
  return {
    async fetchForEngineDispatch(input) {
      const result = await args.integrity.fetchAndValidate(input.planRef, args.fetcher);
      assertPlanOwnershipMatchesContext(result.plan, input.ctx);
      return result;
    },
    ...(args.fetcher.close === undefined
      ? {}
      : {
          close: async () => {
            await args.fetcher.close?.();
          },
        }),
  };
}

function assertPlanOwnershipMatchesContext(plan: ExecutionPlan, ctx: ResolvedRunContext): void {
  const ownership = plan.metadata.ownership;

  if (ownership === undefined) {
    throw new Error('PLAN_SCOPE_MISSING');
  }

  if (
    ownership.tenantId !== ctx.tenantId ||
    ownership.projectId !== ctx.projectId ||
    ownership.environmentId !== ctx.environmentId
  ) {
    throw new Error('PLAN_SCOPE_MISMATCH');
  }
}
