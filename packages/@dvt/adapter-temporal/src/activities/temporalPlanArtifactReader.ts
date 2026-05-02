/**
 * @ownedConcern Resolve scoped Temporal plan artifacts for engine dispatch.
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
