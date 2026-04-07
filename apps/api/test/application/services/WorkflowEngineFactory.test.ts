import {
  AllowAllAuthorizer,
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  StartRunApplicationService,
  type IProviderAdapter,
  type ResolvedRunContext,
  type RunStatusSnapshot,
  type SignalRequest,
  type WorkflowEngine,
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
    stateStoreRead: {} as never,
    stateStoreWrite: {} as never,
    projector: {} as never,
    idempotency: {} as never,
    clock: {} as never,
    policy: {} as never,
    intentStore: {} as never,
    adapters: new Map(),
    observability: {} as never,
  };
}

describe('createWorkflowEngine', () => {
  it('delegates construction to the provided engine constructor', () => {
    const deps = makeDeps();
    const engine = createWorkflowEngine(
      deps,
      FakeWorkflowEngine as unknown as new (deps: WorkflowEngineDeps) => WorkflowEngine
    ) as unknown as FakeWorkflowEngine;

    expect(engine instanceof FakeWorkflowEngine).toBe(true);
    expect(engine.deps).toBe(deps);
  });
});

describe('buildWorkflowEngine', () => {
  it('wires StartRunApplicationService and not the deprecated alias', () => {
    const adapter: IProviderAdapter = {
      provider: 'temporal',
      async startRun(_plan, _planRef, context: ResolvedRunContext) {
        return {
          provider: 'temporal',
          tenantId: context.tenantId,
          namespace: 'default',
          workflowId: `wf-${context.runId}`,
          runId: context.runId,
        };
      },
      async cancelRun(_engineRunRef) {},
      async getRunStatus(_engineRunRef): Promise<RunStatusSnapshot> {
        throw new Error('not used');
      },
      async signal(_engineRunRef, _request: SignalRequest) {},
      signalSemanticsVersions: () => [CURRENT_SIGNAL_SEMANTICS_VERSION],
    };

    const engine = buildWorkflowEngine({
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
        clock: { nowIsoUtc: () => '2026-04-05T00:00:00.000Z' },
        observability: createNoopObservability(),
      },
    });

    const startRunService = (engine as unknown as { startRunApplicationService: unknown })
      .startRunApplicationService;
    expect(startRunService).toBeInstanceOf(StartRunApplicationService);
  });
});
