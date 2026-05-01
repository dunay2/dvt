import type { EngineRunRef, PlanRef, RunContext } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';

function makePlanRef(): PlanRef {
  return {
    uri: 'https://example.com/plan.json',
    sha256: 'a'.repeat(64),
    schemaVersion: 'v1.2',
    planId: 'plan-1',
    planVersion: '1.0',
  };
}

function makeContext(): RunContext {
  return {
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'prod',
    runId: 'run-1',
    targetAdapter: 'temporal',
  };
}

describe('WorkflowEngine planRef normalization', () => {
  it('requires explicit service collaborators at construction time', () => {
    expect(
      () =>
        new WorkflowEngine({
          adapters: new Map(),
          startRunUseCase: {} as never,
          recoverRunUseCase: {} as never,
          cancelRunUseCase: {} as never,
          runStatusUseCase: {} as never,
        } as never)
    ).toThrow(/signalRunUseCase is required/);
  });

  it('does not reintroduce execution policy fields onto PlanRef', async () => {
    const startRun = vi.fn<(planRef: PlanRef, context: RunContext) => Promise<EngineRunRef>>(
      async () => ({
        provider: 'temporal',
        tenantId: 'tenant-a',
        namespace: 'default',
        workflowId: 'wf-run-1',
        runId: 'run-1',
      })
    );

    const engine = new WorkflowEngine({
      adapters: new Map(),
      startRunUseCase: { startRun },
      recoverRunUseCase: {
        recoverRun: async () => ({
          provider: 'temporal',
          tenantId: 'tenant-a',
          namespace: 'default',
          workflowId: 'wf-run-1',
          runId: 'run-1',
        }),
      },
      cancelRunUseCase: {
        cancelRun: async () => {},
      },
      signalRunUseCase: {
        signal: async () => {},
      },
      runStatusUseCase: {
        getRunStatus: async () => ({ runId: 'run-1', status: 'PENDING' }),
      },
    });

    await engine.startRun(makePlanRef(), makeContext());

    const normalizedPlanRef = startRun.mock.calls[0]?.[0] as PlanRef | undefined;
    expect(normalizedPlanRef).toEqual(makePlanRef());
    expect(
      normalizedPlanRef !== undefined &&
        'pluginCompatibilityFingerprint' in (normalizedPlanRef as Record<string, unknown>)
    ).toBe(false);
  });
});
