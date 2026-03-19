import type { WorkflowEngine, WorkflowEngineDeps } from '@dvt/engine';
import { describe, it, expect } from 'vitest';

import { createWorkflowEngine } from '../../../src/application/services/WorkflowEngineFactory.js';

class FakeWorkflowEngine {
  constructor(readonly deps: WorkflowEngineDeps) {}
}

function makeDeps(): WorkflowEngineDeps {
  return {
    stateStore: {} as never,
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
