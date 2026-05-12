/**
 * @ownedConcern Coordinate pre-dispatch start-run admission, provider resolution,
 * plan integrity, and execution-policy capability checks.
 */
import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import type {
  ExecutionPlan,
  PlanRef,
  ResolvedRunContext,
  RunExecutionPolicy,
  ScopedPlanRef,
} from '@dvt/contracts';

import type { IProviderAdapter } from '../../adapters/IProviderAdapter.js';
import type { IPlanIntegrityValidator } from '../../ports/IPlanIntegrityValidator.js';

export interface StartRunExecutionPolicyAdmission {
  plan: ExecutionPlan;
  planRef: PlanRef;
  executionPolicy: RunExecutionPolicy;
  context: ResolvedRunContext;
  adapter: IProviderAdapter;
}

export interface StartRunVerifiedArtifact {
  plan: ExecutionPlan;
  executionPolicy: RunExecutionPolicy;
}

export interface StartRunAdmissionResult {
  adapter: IProviderAdapter;
  verifiedArtifact: StartRunVerifiedArtifact;
}

export interface StartRunAdmissionRequest {
  planRef: PlanRef;
  resolvedContext: ResolvedRunContext;
}

export interface StartRunAdmissionGuardPort {
  assertStartRunAllowed(planRef: PlanRef, context: ResolvedRunContext): Promise<void>;
  resolveAdapter(context: ResolvedRunContext): IProviderAdapter;
  assertExecutionPolicyAllowed(admission: StartRunExecutionPolicyAdmission): Promise<void>;
}

export interface StartRunAdmissionServiceDeps {
  guard: StartRunAdmissionGuardPort;
  planFetcher: IStoredPlanArtifactReader;
  planIntegrityValidator: IPlanIntegrityValidator;
}

export class StartRunAdmissionService {
  constructor(private readonly deps: StartRunAdmissionServiceDeps) {}

  async admit(request: StartRunAdmissionRequest): Promise<StartRunAdmissionResult> {
    const { planRef, resolvedContext } = request;
    await this.deps.guard.assertStartRunAllowed(planRef, resolvedContext);
    const adapter = this.deps.guard.resolveAdapter(resolvedContext);
    const verifiedArtifact = await this.deps.planIntegrityValidator.fetchAndValidate(
      toScopedPlanRef(planRef, resolvedContext),
      this.deps.planFetcher
    );

    await this.deps.guard.assertExecutionPolicyAllowed({
      plan: verifiedArtifact.plan,
      planRef,
      executionPolicy: verifiedArtifact.executionPolicy,
      context: resolvedContext,
      adapter,
    });

    return { adapter, verifiedArtifact };
  }
}

function toScopedPlanRef(planRef: PlanRef, context: ResolvedRunContext): ScopedPlanRef {
  return {
    tenantId: context.tenantId,
    projectId: context.projectId,
    environmentId: context.environmentId,
    planRef,
  };
}
