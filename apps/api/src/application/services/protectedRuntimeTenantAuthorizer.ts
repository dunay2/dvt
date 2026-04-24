/**
 * Owned concern: bridge the API-authorized tenant scope into engine security
 * ports without granting implicit cross-tenant access.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

import type { EngineRunRef, IRunEnrichmentService, IWorkflowEngine } from '@dvt/engine';
import type { CanonicalRunStatus, PlanRef, RunContext, SignalRequest } from '@dvt/contracts';

export const PROTECTED_RUNTIME_TENANT_AUTHORIZATION_ERROR = {
  missingScope: 'PROTECTED_RUNTIME_TENANT_SCOPE_REQUIRED',
  mismatch: 'PROTECTED_RUNTIME_TENANT_SCOPE_MISMATCH',
} as const;

export class ProtectedRuntimeTenantAuthorizer {
  private readonly scope = new AsyncLocalStorage<string>();

  public async assertTenantAccess(tenantId: string): Promise<void> {
    const authorizedTenantId = this.scope.getStore();
    if (authorizedTenantId === undefined) {
      throw new Error(PROTECTED_RUNTIME_TENANT_AUTHORIZATION_ERROR.missingScope);
    }
    if (authorizedTenantId !== tenantId) {
      throw new Error(PROTECTED_RUNTIME_TENANT_AUTHORIZATION_ERROR.mismatch);
    }
  }

  public runWithTenantScope<T>(tenantId: string, operation: () => Promise<T>): Promise<T> {
    return this.scope.run(tenantId, operation);
  }
}

export function protectWorkflowEngineWithTenantScope(
  engine: IWorkflowEngine,
  tenantAuthorizer: ProtectedRuntimeTenantAuthorizer
): IWorkflowEngine {
  return {
    startRun: (planRef: PlanRef, context: RunContext) =>
      tenantAuthorizer.runWithTenantScope(context.tenantId, () =>
        engine.startRun(planRef, context)
      ),
    recoverRun: (sourceRunId: string, planRef: PlanRef, context: RunContext) =>
      tenantAuthorizer.runWithTenantScope(context.tenantId, () =>
        engine.recoverRun(sourceRunId, planRef, context)
      ),
    cancelRun: (engineRunRef: EngineRunRef) =>
      tenantAuthorizer.runWithTenantScope(engineRunRef.tenantId, () =>
        engine.cancelRun(engineRunRef)
      ),
    getRunStatus: (engineRunRef: EngineRunRef): Promise<CanonicalRunStatus> =>
      tenantAuthorizer.runWithTenantScope(engineRunRef.tenantId, () =>
        engine.getRunStatus(engineRunRef)
      ),
    signal: (engineRunRef: EngineRunRef, request: SignalRequest) =>
      tenantAuthorizer.runWithTenantScope(engineRunRef.tenantId, () =>
        engine.signal(engineRunRef, request)
      ),
  };
}

export function protectRunEnrichmentServiceWithTenantScope(
  runEnrichmentService: IRunEnrichmentService,
  tenantAuthorizer: ProtectedRuntimeTenantAuthorizer
): IRunEnrichmentService {
  return {
    getRunEnrichment: (engineRunRef: EngineRunRef) =>
      tenantAuthorizer.runWithTenantScope(engineRunRef.tenantId, () =>
        runEnrichmentService.getRunEnrichment(engineRunRef)
      ),
  };
}
