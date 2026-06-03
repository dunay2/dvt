import {
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  type EngineRunRef,
  type ProviderRunStatusView,
  type ResolvedRunContext,
  type RunContext,
} from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import { describe, it, expect } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { AuthorizationError } from '../../src/security/AuthorizationError.js';
import type { IAuthorizer } from '../../src/security/authorizer.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import {
  createWorkflowEngineFixture,
  makeDefaultExecutionPlan,
  makePlanRefForPlan,
} from '../helpers/workflowEngine.fixture.js';

const TEST_PLAN_REF = makePlanRefForPlan(makeDefaultExecutionPlan(), 'https://plans/example.json');

class DenyAuthorizer {
  async assertTenantAccess(): Promise<void> {
    throw new AuthorizationError('Denied by test authorizer');
  }
}

class TenantScopeAuthorizer {
  constructor(private readonly subjectTenantId: string) {}
  async assertTenantAccess(tenantId: string): Promise<void> {
    if (tenantId !== this.subjectTenantId) {
      throw new AuthorizationError('Tenant mismatch');
    }
  }
}

class CountingAdapter implements IProviderAdapter {
  public provider: IProviderAdapter['provider'] = 'temporal';
  public startCalls = 0;
  public signalCalls = 0;
  public cancelCalls = 0;

  async startRun(
    _plan: import('@dvt/contracts').ExecutionPlan,
    _planRef: import('@dvt/contracts').PlanRef,
    ctx: ResolvedRunContext
  ): Promise<EngineRunRef> {
    this.startCalls += 1;
    return {
      provider: 'temporal',
      tenantId: ctx.tenantId,
      namespace: 'default',
      workflowId: 'wf',
      runId: ctx.runId,
    };
  }

  async cancelRun(_runRef: EngineRunRef): Promise<void> {
    this.cancelCalls += 1;
  }

  async getProviderStatusView(_runRef: EngineRunRef): Promise<ProviderRunStatusView> {
    return { provider: 'temporal', providerStatus: 'PENDING' };
  }

  async signal(
    _runRef: EngineRunRef,
    _request: import('@dvt/contracts').SignalRequest
  ): Promise<void> {
    this.signalCalls += 1;
  }

  signalSemanticsVersions(): readonly (typeof CURRENT_SIGNAL_SEMANTICS_VERSION)[] {
    return [CURRENT_SIGNAL_SEMANTICS_VERSION];
  }
}

function makeEngine(
  authorizer: IAuthorizer,
  adapter: IProviderAdapter
): { engine: ReturnType<typeof createWorkflowEngineFixture>['engine']; store: InMemoryTxStore } {
  const { engine, store } = createWorkflowEngineFixture({
    authorizer,
    adapter,
    observability: createNoopObservability(),
  });
  return { engine, store };
}

async function bootstrapMetadataOnly(
  store: InMemoryTxStore,
  metadata: Parameters<InMemoryTxStore['bootstrapRunTx']>[0]['metadata']
): Promise<void> {
  await store.bootstrapRunTx({ metadata, firstEvents: [] });
}

describe('RBAC/IAuthorizer (negative paths)', () => {
  it('denies startRun and does not call adapter', async () => {
    const adapter = new CountingAdapter();
    const { engine } = makeEngine(new DenyAuthorizer(), adapter);

    const planRef: import('@dvt/contracts').PlanRef = {
      ...TEST_PLAN_REF,
    };

    const ctx: RunContext = {
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-1',
      targetAdapter: 'temporal',
    };

    await expect(engine.startRun(planRef, ctx)).rejects.toBeInstanceOf(AuthorizationError);
    expect(adapter.startCalls).toBe(0);
  });

  it('denies signal and does not call adapter', async () => {
    const adapter = new CountingAdapter();
    const { engine, store } = makeEngine(new DenyAuthorizer(), adapter);

    // Pre-populate metadata so resolveMetaOrThrow succeeds
    await bootstrapMetadataOnly(store, {
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-1',
      planId: TEST_PLAN_REF.planId,
      planVersion: TEST_PLAN_REF.planVersion,
      logicalAttemptId: 1,
      providerRef: {
        provider: 'temporal',
        tenantId: 't1',
        namespace: 'default',
        workflowId: 'wf',
        runId: 'run-1',
      },
    });

    const runRef: import('@dvt/contracts').EngineRunRef = {
      provider: 'temporal',
      tenantId: 't1',
      namespace: 'default',
      workflowId: 'wf',
      runId: 'run-1',
    };
    const req: import('@dvt/contracts').SignalRequest = { signalId: 's1', type: 'PAUSE' };

    await expect(engine.signal(runRef, req)).rejects.toBeInstanceOf(AuthorizationError);
    expect(adapter.signalCalls).toBe(0);
  });

  it('denies cancelRun before metadata lookup when runRef tenant is unauthorized', async () => {
    const adapter = new CountingAdapter();
    const authorizer = new TenantScopeAuthorizer('tenant-allowed');
    const { engine, store } = makeEngine(authorizer, adapter);

    await bootstrapMetadataOnly(store, {
      tenantId: 'tenant-allowed',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-tenant-locked-1',
      planId: TEST_PLAN_REF.planId,
      planVersion: TEST_PLAN_REF.planVersion,
      logicalAttemptId: 1,
      providerRef: {
        provider: 'temporal',
        tenantId: 'tenant-allowed',
        namespace: 'default',
        workflowId: 'wf',
        runId: 'run-tenant-locked-1',
      },
    });

    const forgedRunRef: import('@dvt/contracts').EngineRunRef = {
      provider: 'temporal',
      tenantId: 'tenant-forbidden',
      namespace: 'default',
      workflowId: 'wf',
      runId: 'run-tenant-locked-1',
    };

    await expect(engine.cancelRun(forgedRunRef)).rejects.toBeInstanceOf(AuthorizationError);
    expect(adapter.cancelCalls).toBe(0);
  });

  it('denies getRunStatus before metadata lookup when runRef tenant is unauthorized', async () => {
    const adapter = new CountingAdapter();
    const authorizer = new TenantScopeAuthorizer('tenant-allowed');
    const { engine, store } = makeEngine(authorizer, adapter);

    await bootstrapMetadataOnly(store, {
      tenantId: 'tenant-allowed',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-tenant-locked-2',
      planId: TEST_PLAN_REF.planId,
      planVersion: TEST_PLAN_REF.planVersion,
      logicalAttemptId: 1,
      providerRef: {
        provider: 'temporal',
        tenantId: 'tenant-allowed',
        namespace: 'default',
        workflowId: 'wf',
        runId: 'run-tenant-locked-2',
      },
    });

    const forgedRunRef: import('@dvt/contracts').EngineRunRef = {
      provider: 'temporal',
      tenantId: 'tenant-forbidden',
      namespace: 'default',
      workflowId: 'wf',
      runId: 'run-tenant-locked-2',
    };

    await expect(engine.getRunStatus(forgedRunRef)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('denies signal before metadata lookup when runRef tenant is unauthorized', async () => {
    const adapter = new CountingAdapter();
    const authorizer = new TenantScopeAuthorizer('tenant-allowed');
    const { engine, store } = makeEngine(authorizer, adapter);

    await bootstrapMetadataOnly(store, {
      tenantId: 'tenant-allowed',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-tenant-locked-3',
      planId: TEST_PLAN_REF.planId,
      planVersion: TEST_PLAN_REF.planVersion,
      logicalAttemptId: 1,
      providerRef: {
        provider: 'temporal',
        tenantId: 'tenant-allowed',
        namespace: 'default',
        workflowId: 'wf',
        runId: 'run-tenant-locked-3',
      },
    });

    const forgedRunRef: import('@dvt/contracts').EngineRunRef = {
      provider: 'temporal',
      tenantId: 'tenant-forbidden',
      namespace: 'default',
      workflowId: 'wf',
      runId: 'run-tenant-locked-3',
    };

    const req: import('@dvt/contracts').SignalRequest = { signalId: 's-deny', type: 'PAUSE' };
    await expect(engine.signal(forgedRunRef, req)).rejects.toBeInstanceOf(AuthorizationError);
    expect(adapter.signalCalls).toBe(0);
  });

  it('denies when tenantId != subjectTenantId (tenant-scope)', async () => {
    const adapter = new CountingAdapter();
    const authorizer = new TenantScopeAuthorizer('tenant-B');
    const { engine } = makeEngine(authorizer, adapter);

    const planRef: import('@dvt/contracts').PlanRef = {
      ...TEST_PLAN_REF,
    };

    const ctx: RunContext = {
      tenantId: 'tenant-A',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-2',
      targetAdapter: 'temporal',
    };

    await expect(engine.startRun(planRef, ctx)).rejects.toBeInstanceOf(AuthorizationError);
    expect(adapter.startCalls).toBe(0);
  });

  it('denies unauthorized startRun before planRef validation to avoid plan-uri leakage', async () => {
    const adapter = new CountingAdapter();
    const { engine } = makeEngine(new DenyAuthorizer(), adapter);

    const planRef: import('@dvt/contracts').PlanRef = {
      uri: 'file:///etc/passwd',
      sha256: TEST_PLAN_REF.sha256,
      schemaVersion: TEST_PLAN_REF.schemaVersion,
      planId: TEST_PLAN_REF.planId,
      planVersion: TEST_PLAN_REF.planVersion,
    };

    const ctx: RunContext = {
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-deny-first-1',
      targetAdapter: 'temporal',
    };

    await expect(engine.startRun(planRef, ctx)).rejects.toBeInstanceOf(AuthorizationError);
    expect(adapter.startCalls).toBe(0);
  });
});
