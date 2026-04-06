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
    pluginCompatibilityFingerprint: 'b'.repeat(64),
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
  it('preserves pluginCompatibilityFingerprint on the engine startRun path', async () => {
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

    expect(startRun).toHaveBeenCalledWith(
      expect.objectContaining({
        pluginCompatibilityFingerprint: 'b'.repeat(64),
      }),
      expect.any(Object),
      expect.any(Object)
    );
  });
});
