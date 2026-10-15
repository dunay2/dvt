/**
 * @ownedConcern Controlled activity boundary for deterministic layer admission tests.
 * @baseline ADR-0003: Execution Model
 * @decision Share a typed controlled activity fixture without duplicating workflow behavior.
 * @consequence Tests exercise the canonical boundary rather than copying its implementation.
 * @version 1.0.0
 */
import { vi, type MockedFunction } from 'vitest';

import {
  eventActivities,
  createStepActivities,
} from '../../src/workflows/runPlanWorkflow.activities.js';
import { executeLayerSteps } from '../../src/workflows/runPlanWorkflow.stepExecution.js';
import type {
  ExecutedStepResult,
  RuntimeWorkflowState,
} from '../../src/workflows/runPlanWorkflow.types.js';

import { createPlanRef, createResolvedRunContext } from './contractFixtures.js';

vi.mock('../../src/workflows/runPlanWorkflow.activities.js', () => ({
  eventActivities: { emitEvent: vi.fn() },
  createStepActivities: vi.fn(),
}));

interface LayerConcurrencyHarness {
  admitted: string[];
  executed: string[];
  state: RuntimeWorkflowState;
  emit: MockedFunction<typeof eventActivities.emitEvent>;
  readonly maximum: number;
  run(): ReturnType<typeof executeLayerSteps>;
  finish(stepId: string, status?: ExecutedStepResult['status']): void;
  reject(stepId: string, error: unknown): void;
}

export function createLayerConcurrencyHarness(maxInFlight?: number): LayerConcurrencyHarness {
  const admitted: string[] = [];
  const executed: string[] = [];
  const pending = new Map<
    string,
    {
      resolve: (result: ExecutedStepResult) => void;
      reject: (error: unknown) => void;
    }
  >();
  let active = 0;
  let maximum = 0;
  const state: RuntimeWorkflowState = {
    status: 'RUNNING',
    paused: false,
    cancelRequested: false,
    currentStepIndex: 0,
    continuedAsNewCount: 0,
  };
  const emit = vi
    .mocked(eventActivities.emitEvent)
    .mockReset()
    .mockImplementation(async (event) => {
      if (event.stepId !== undefined) admitted.push(event.stepId);
    });
  vi.mocked(createStepActivities)
    .mockReset()
    .mockReturnValue({
      async executeStep({ step }) {
        executed.push(step.stepId);
        active += 1;
        maximum = Math.max(maximum, active);
        try {
          return await new Promise<ExecutedStepResult>((resolve, reject) => {
            pending.set(step.stepId, { resolve, reject });
          });
        } finally {
          active -= 1;
        }
      },
    });
  const args = {
    layer: ['a', 'b', 'c'].map((stepId) => ({ stepId, kind: 'DBT_MODEL', dependsOn: [] })),
    maxInFlight,
    downstreamStepIdsByGatewayStepId: {},
    planRef: createPlanRef({ uri: 'file://plan.json', sha256: 'a'.repeat(64), planId: 'plan' }),
    ctx: createResolvedRunContext({
      tenantId: 't',
      projectId: 'p',
      environmentId: 'e',
      runId: 'r',
    }),
    state,
    runtime: {
      gatewayDependencyFacts: {},
      skippedSteps: new Set<string>(),
      completedSteps: 0,
      processedLayersInCurrentExecution: 0,
    },
  };
  return {
    admitted,
    executed,
    state,
    emit,
    get maximum() {
      return maximum;
    },
    run: () => executeLayerSteps(args),
    finish(stepId: string, status: ExecutedStepResult['status'] = 'COMPLETED') {
      pending.get(stepId)?.resolve({ stepId, status });
    },
    reject(stepId: string, error: unknown) {
      pending.get(stepId)?.reject(error);
    },
  };
}
