/**
 * @ownedConcern Coordinate pre-dispatch start-run admission, provider resolution,
 * plan integrity, and execution-policy capability checks.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0012: Plan Integrity Ownership
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Keep start-run admission in a named phase service before provider dispatch.
 * @consequence StartRunApplicationService coordinates phases without owning
 * provider, artifact, or capability semantics.
 * @version 1.0.0
 */
import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import type { PlanRef, ResolvedRunContext, ScopedPlanRef } from '@dvt/contracts';

import type { IPlanIntegrityValidator } from '../../ports/IPlanIntegrityValidator.js';

import type {
  IStartRunAdmissionService,
  StartRunAdmissionGuardPort,
  StartRunAdmissionRequest,
  StartRunAdmissionResult,
} from './StartRunTypes.js';

export interface StartRunAdmissionServiceDeps {
  guard: StartRunAdmissionGuardPort;
  planFetcher: IStoredPlanArtifactReader;
  planIntegrityValidator: IPlanIntegrityValidator;
}

export class StartRunAdmissionService implements IStartRunAdmissionService {
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
