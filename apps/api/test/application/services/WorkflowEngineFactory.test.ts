import assert from 'node:assert/strict';
import test from 'node:test';

import observabilityPkg from '@dvt/observability';
import type { WorkflowEngine, WorkflowEngineDeps } from '@dvt/engine';

import {
  buildWorkflowEngine,
  createWorkflowEngine,
} from '../../../src/application/services/WorkflowEngineFactory.js';

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

await test('buildWorkflowEngine rejects empty adapter registry', () => {
  const { createNoopObservability } = observabilityPkg as {
    createNoopObservability: () => WorkflowEngineDeps['observability'];
  };

  assert.throws(
    () =>
      buildWorkflowEngine({
        security: {
          authorizer: {} as never,
          planRefAllowedSchemes: ['https'],
        },
        persistence: {
          stateStore: {} as never,
          intentStore: {} as never,
        },
        runtime: {
          adapters: new Map(),
        },
        infrastructure: {
          clock: { nowIsoUtc: () => '2026-03-14T00:00:00.000Z' },
          observability: createNoopObservability(),
        },
      }),
    /ENGINE_NO_ADAPTERS/
  );
});
