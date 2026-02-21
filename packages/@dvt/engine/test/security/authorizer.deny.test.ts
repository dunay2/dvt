import type { RunContext } from '@dvt/contracts';
import { describe, it, expect } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AuthorizationError } from '../../src/security/AuthorizationError.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
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
    _planRef: unknown,
    ctx: RunContext
  ): Promise<{ provider: string; workflowId: string; runId: string }> {
    this.startCalls += 1;
    return { provider: 'mock', workflowId: 'wf', runId: ctx.runId } as const;
  }

  async cancelRun(_runRef: any): Promise<void> {
    this.cancelCalls += 1;
  }

  async getRunStatus(_runRef: any): Promise<any> {
    return { runId: 'r', status: 'PENDING' } as any;
  }

  async signal(_runRef: any, _request: any): Promise<void> {
    this.signalCalls += 1;
  }
}

function makeEngine(
  authorizer: any,
  adapter: IProviderAdapter
): { engine: WorkflowEngine; store: InMemoryTxStore } {
  const store = new InMemoryTxStore();
  const projector = new SnapshotProjector();
  const idempotency = new IdempotencyKeyBuilder();
  const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
  const planRefPolicy = new PlanRefPolicy({ allowedSchemes: ['https'] });

  const engine = new WorkflowEngine({
    stateStore: store,
    outbox: store,
    projector,
    idempotency,
    clock,
    authorizer,
    planRefPolicy,
    planIntegrity: {
      async fetchAndValidate() {
        return new Uint8Array();
      },
    } as any,
    planFetcher: {
      async fetch() {
        return new Uint8Array();
      },
    } as any,
    adapters: new Map([[adapter.provider, adapter]]),
  } as any);

  return { engine, store };
}

describe('RBAC/IAuthorizer (negative paths)', () => {
  it('denies startRun and does not call adapter', async () => {
    const adapter = new CountingAdapter();
    const { engine } = makeEngine(new DenyAuthorizer(), adapter);

    const planRef = {
      uri: 'https://plans/example.json',
      sha256: 'deadbeef',
      schemaVersion: 'v1.2',
      planId: 'p',
      planVersion: '1',
    } as any;

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
    await store.saveRunMetadata({
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'dev',
      runId: 'run-1',
      provider: 'mock',
      providerWorkflowId: 'wf',
      providerRunId: 'run-1',
    } as any);

    const runRef = { provider: 'mock', workflowId: 'wf', runId: 'run-1' } as any;
    const req = { signalId: 's1', type: 'PAUSE' } as any;

    await expect(engine.signal(runRef, req)).rejects.toBeInstanceOf(AuthorizationError);
    expect(adapter.signalCalls).toBe(0);
  });

  it('denies when tenantId != subjectTenantId (tenant-scope)', async () => {
    const adapter = new CountingAdapter();
    const authorizer = new TenantScopeAuthorizer('tenant-B');
    const { engine } = makeEngine(authorizer, adapter);

    const planRef = {
      uri: 'https://plans/example.json',
      sha256: 'deadbeef',
      schemaVersion: 'v1.2',
      planId: 'p',
      planVersion: '1',
    } as any;

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
});
