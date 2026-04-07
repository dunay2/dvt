import type { EngineRunRef, PlanRef, ResolvedRunContext, RunContext } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import { describe, expect, it, vi } from 'vitest';

import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
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
  it('does not reintroduce execution policy fields onto PlanRef', async () => {
    const startRun = vi.fn<
      (
        planRef: PlanRef,
        resolvedContext: ResolvedRunContext,
        traceContext: {
          tenantId: string;
          projectId: string;
          environmentId: string;
          runId: string;
          planId?: string;
          adapter?: 'temporal' | 'conductor' | 'local';
        }
      ) => Promise<EngineRunRef>
    >(async () => ({
      provider: 'temporal',
      tenantId: 'tenant-a',
      namespace: 'default',
      workflowId: 'wf-run-1',
      runId: 'run-1',
    }));

    const engine = new WorkflowEngine({
      stateStoreRead: {} as never,
      stateStoreWrite: {} as never,
      projector: new SnapshotProjector(),
      idempotency: new IdempotencyKeyBuilder(),
      clock: { nowIsoUtc: () => '2026-04-07T00:00:00.000Z' },
      adapters: new Map(),
      observability: createNoopObservability(),
      startRunApplicationService: { startRun },
      core: {
        cancel: async () => {},
        getStatus: async () => ({ runId: 'run-1', status: 'PENDING' }),
        enrichStatus: async () => ({ runId: 'run-1', status: 'PENDING' }),
        signal: async () => {},
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
