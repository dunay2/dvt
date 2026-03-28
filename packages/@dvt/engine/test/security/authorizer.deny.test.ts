import type { ResolvedRunContext, RunContext } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import { describe, it, expect } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AuthorizationError } from '../../src/security/AuthorizationError.js';
import type { IAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunAccessPolicy } from '../../src/security/RunAccessPolicy.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';

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
  public provider: IProviderAdapter['provider'] = 'mock';
  public startCalls = 0;
  public signalCalls = 0;
  public cancelCalls = 0;

  async startRun(
    planRef: import('@dvt/contracts').PlanRef,
    ctx: ResolvedRunContext
  ): Promise<{ provider: 'mock'; tenantId: string; workflowId: string; runId: string }> {
    this.startCalls += 1;
    // Debe devolver un EngineRunRef válido para provider 'mock'
    return { provider: 'mock', tenantId: ctx.tenantId, workflowId: 'wf', runId: ctx.runId };
  }

  async cancelRun(_runRef: {
    provider: 'mock';
    tenantId: string;
    workflowId: string;
    runId: string;
  }): Promise<void> {
    this.cancelCalls += 1;
  }

  async getRunStatus(_runRef: {
    provider: 'mock';
    tenantId: string;
    workflowId: string;
    runId: string;
  }): Promise<{ runId: string; status: 'PENDING' }> {
    return { runId: 'r', status: 'PENDING' };
  }

  async signal(
    _runRef: { provider: 'mock'; tenantId: string; workflowId: string; runId: string },
    _request: import('@dvt/contracts').SignalRequest
  ): Promise<void> {
    this.signalCalls += 1;
  }
}

function makeEngine(
  authorizer: IAuthorizer,
  adapter: IProviderAdapter
): { engine: WorkflowEngine; store: InMemoryTxStore } {
  const store = new InMemoryTxStore();
  const engine = new WorkflowEngine({
    stateStoreRead: store,
    stateStoreWrite: store,
    projector: new SnapshotProjector(),
    idempotency: new IdempotencyKeyBuilder(),
    clock: new SequenceClock('2026-02-12T00:00:00.000Z'),
    policy: new RunAccessPolicy({
      authorizer,
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
    }),
    intentStore: new InMemoryStartRunIntentStore(),
    observability: createNoopObservability(),
    adapters: new Map([[adapter.provider, adapter]]),
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
      uri: 'https://plans/example.json',
      sha256: 'deadbeef',
      schemaVersion: 'v1.2',
      planId: 'p',
      planVersion: '1.0',
    };

    const ctx: RunContext = {
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-1',
      targetAdapter: 'mock',
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
      planId: 'p',
      planVersion: '1.0',
      logicalAttemptId: 1,
      provider: 'mock',
      providerWorkflowId: 'wf',
      providerRunId: 'run-1',
    });

    const runRef: import('@dvt/contracts').EngineRunRef = {
      provider: 'mock',
      tenantId: 't1',
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
      planId: 'p',
      planVersion: '1.0',
      logicalAttemptId: 1,
      provider: 'mock',
      providerWorkflowId: 'wf',
      providerRunId: 'run-tenant-locked-1',
    });

    const forgedRunRef: import('@dvt/contracts').EngineRunRef = {
      provider: 'mock',
      tenantId: 'tenant-forbidden',
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
      planId: 'p',
      planVersion: '1.0',
      logicalAttemptId: 1,
      provider: 'mock',
      providerWorkflowId: 'wf',
      providerRunId: 'run-tenant-locked-2',
    });

    const forgedRunRef: import('@dvt/contracts').EngineRunRef = {
      provider: 'mock',
      tenantId: 'tenant-forbidden',
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
      planId: 'p',
      planVersion: '1.0',
      logicalAttemptId: 1,
      provider: 'mock',
      providerWorkflowId: 'wf',
      providerRunId: 'run-tenant-locked-3',
    });

    const forgedRunRef: import('@dvt/contracts').EngineRunRef = {
      provider: 'mock',
      tenantId: 'tenant-forbidden',
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
      uri: 'https://plans/example.json',
      sha256: 'deadbeef',
      schemaVersion: 'v1.2',
      planId: 'p',
      planVersion: '1.0',
    };

    const ctx: RunContext = {
      tenantId: 'tenant-A',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-2',
      targetAdapter: 'mock',
    };

    await expect(engine.startRun(planRef, ctx)).rejects.toBeInstanceOf(AuthorizationError);
    expect(adapter.startCalls).toBe(0);
  });

  it('denies unauthorized startRun before planRef validation to avoid plan-uri leakage', async () => {
    const adapter = new CountingAdapter();
    const { engine } = makeEngine(new DenyAuthorizer(), adapter);

    const planRef: import('@dvt/contracts').PlanRef = {
      uri: 'file:///etc/passwd',
      sha256: 'deadbeef',
      schemaVersion: 'v1.2',
      planId: 'p',
      planVersion: '1.0',
    };

    const ctx: RunContext = {
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-deny-first-1',
      targetAdapter: 'mock',
    };

    await expect(engine.startRun(planRef, ctx)).rejects.toBeInstanceOf(AuthorizationError);
    expect(adapter.startCalls).toBe(0);
  });
});
