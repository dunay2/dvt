import assert from 'node:assert/strict';
import test from 'node:test';

import type { WorkflowEngine, WorkflowEngineDeps } from '@dvt/engine';

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

await test('createWorkflowEngine delegates construction to the provided engine constructor', () => {
  const deps = makeDeps();
  const engine = createWorkflowEngine(
    deps,
    FakeWorkflowEngine as unknown as new (deps: WorkflowEngineDeps) => WorkflowEngine
  ) as unknown as FakeWorkflowEngine;

  assert.ok(engine instanceof FakeWorkflowEngine);
  assert.equal(engine.deps, deps);
});
