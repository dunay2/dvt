import { CURRENT_SIGNAL_SEMANTICS_VERSION, asIsoUtcString, asNonBlankString } from '@dvt/contracts';
import {
  AllowAllAuthorizer,
  type IProviderAdapter,
  type ProviderRunStatusView,
  type ResolvedRunContext,
  type SignalRequest,
  type WorkflowEngineDeps,
} from '@dvt/engine';
import { createNoopObservability } from '@dvt/observability';
import { describe, it, expect } from 'vitest';

import {
  buildWorkflowEngine,
  createWorkflowEngine,
} from '../../../src/application/services/WorkflowEngineFactory.js';

class FakeWorkflowEngine {
  constructor(readonly deps: WorkflowEngineDeps) {}
}

function makeDeps(): WorkflowEngineDeps {
  return {
    adapters: new Map(),
    startRunUseCase: {} as never,
    recoverRunUseCase: {} as never,
    cancelRunUseCase: {} as never,
    runStatusUseCase: {} as never,
    signalRunUseCase: {} as never,
  };
}

describe('createWorkflowEngine', () => {
  it('delegates construction to the provided engine constructor', () => {
    const deps = makeDeps();
    const engine = createWorkflowEngine(
      deps,
      (receivedDeps) =>
        new FakeWorkflowEngine(receivedDeps) as unknown as ReturnType<typeof createWorkflowEngine>
    ) as unknown as FakeWorkflowEngine;

    expect(engine instanceof FakeWorkflowEngine).toBe(true);
    expect(engine.deps).toBe(deps);
  });
});

describe('buildWorkflowEngine', () => {
  it('wires facade use cases and not deprecated public services', () => {
    const adapter: IProviderAdapter = {
      provider: 'temporal',
      async startRun(_planRef, context: ResolvedRunContext) {
        return {
          provider: 'temporal',
          tenantId: context.tenantId,
          namespace: asNonBlankString('default'),
          workflowId: asNonBlankString(`wf-${context.runId}`),
          runId: context.runId,
        };
      },
      async cancelRun(_engineRunRef) {},
      async getProviderStatusView(_engineRunRef): Promise<ProviderRunStatusView> {
        throw new Error('not used');
      },
      async signal(_engineRunRef, _request: SignalRequest) {},
      signalSemanticsVersions: () => [CURRENT_SIGNAL_SEMANTICS_VERSION],
    };

    const runtime = buildWorkflowEngine({
      security: {
        authorizer: new AllowAllAuthorizer(),
        planRefAllowedSchemes: ['https'],
      },
      persistence: {
        stateStoreRead: {} as never,
        stateStoreWrite: {} as never,
        intentStore: {} as never,
        planFetcher: {} as never,
      },
      runtime: {
        adapters: new Map([['temporal', adapter]]),
      },
      infrastructure: {
        clock: { nowIsoUtc: () => asIsoUtcString('2026-04-05T00:00:00.000Z') },
        observability: createNoopObservability(),
      },
    });

    expect(Reflect.has(runtime.engine as object, 'startRunUseCase')).toBe(true);
    expect(Reflect.has(runtime.engine as object, 'startRunApplicationService')).toBe(false);
    expect(Reflect.has(runtime.engine as object, 'getRunEnrichment')).toBe(false);
    expect(Reflect.has(runtime.engine as object, 'healthCheck')).toBe(false);
    expect(runtime.runEnrichmentService).toBeDefined();
    expect(Reflect.has(runtime.runEnrichmentService as object, 'getRunEnrichment')).toBe(true);
    expect(runtime.runHealthService).toBeDefined();
    expect(Reflect.has(runtime.runHealthService as object, 'healthCheck')).toBe(true);
  });
});
