import type { ExecutionPlan, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import {
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  RUN_PLAN_WORKFLOW,
  WorkflowSignals,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { TemporalAdapter } from '../src/TemporalAdapter.js';

const BASE_CONFIG = {
  address: '127.0.0.1:7233',
  namespace: 'dvt-test',
  taskQueue: 'q-main',
  connectTimeoutMs: 5000,
  requestTimeoutMs: 10000,
  maxStartPayloadBytes: 2_000_000,
  continueAsNewAfterLayerCount: 0,
};

const BASE_PLAN: ExecutionPlan = {
  metadata: {
    planId: 'plan-123',
    planVersion: '1.0.0',
    schemaVersion: 'v1.2',
    contractVersion: '1.0.0',
    inputHashSha256: 'a'.repeat(64),
    createdAtIso: '2026-04-07T00:00:00.000Z',
  },
  steps: [{ stepId: 's-1', kind: 'noop', dependsOn: [] }],
};

const BASE_PLAN_REF: PlanRef = {
  uri: 'https://plans.example.com/plan-123.json',
  sha256: 'b'.repeat(64),
  schemaVersion: 'v1.2',
  planId: 'plan-123',
  planVersion: '1.0.0',
  sizeBytes: 256,
};

const BASE_CTX: ResolvedRunContext = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'env-1',
  runId: 'run-1',
  targetAdapter: 'temporal',
  logicalAttemptId: 1,
  originRunId: 'run-1',
};

function makeAdapter(configOverrides: Partial<typeof BASE_CONFIG> = {}): {
  adapter: TemporalAdapter;
  workflowClient: {
    start: ReturnType<typeof vi.fn>;
    getHandle: ReturnType<typeof vi.fn>;
  };
} {
  const workflowClient = {
    start: vi.fn(async () => ({
      workflowId: 'run-1',
      firstExecutionRunId: 'temporal-run-1',
    })),
    getHandle: vi.fn(),
  };

  const adapter = new TemporalAdapter({
    workflowClient,
    config: {
      ...BASE_CONFIG,
      ...configOverrides,
    },
  });

  return { adapter, workflowClient };
}

function makeLargePlan(stepCount: number, stepIdWidth: number): ExecutionPlan {
  return {
    ...BASE_PLAN,
    steps: Array.from({ length: stepCount }, (_, index) => ({
      stepId: `step-${index}-${'x'.repeat(stepIdWidth)}`,
      kind: 'noop',
      dependsOn: [],
    })),
  };
}

describe('TemporalAdapter.startRun', () => {
  it('starts the workflow with the verified plan payload when under the size limit', async () => {
    const { adapter, workflowClient } = makeAdapter();

    const runRef = await adapter.startRun(BASE_PLAN, BASE_PLAN_REF, BASE_CTX);

    expect(workflowClient.start).toHaveBeenCalledWith(RUN_PLAN_WORKFLOW, {
      taskQueue: 'q-main-tenant-1',
      workflowId: 'run-1',
      args: [
        {
          plan: BASE_PLAN,
          planRef: BASE_PLAN_REF,
          ctx: BASE_CTX,
          continueAsNewAfterLayerCount: 0,
        },
      ],
    });
    expect(runRef).toEqual({
      provider: 'temporal',
      tenantId: 'tenant-1',
      namespace: 'dvt-test',
      workflowId: 'run-1',
      runId: 'run-1',
      taskQueue: 'q-main-tenant-1',
    });
  });

  it('rejects oversized plans using planRef.sizeBytes before calling Temporal', async () => {
    const { adapter, workflowClient } = makeAdapter({ maxStartPayloadBytes: 128 });

    await expect(
      adapter.startRun(
        BASE_PLAN,
        {
          ...BASE_PLAN_REF,
          sizeBytes: 129,
        },
        BASE_CTX
      )
    ).rejects.toThrow('TEMPORAL_START_PAYLOAD_TOO_LARGE');

    expect(workflowClient.start).not.toHaveBeenCalled();
  });

  it('rejects oversized serialized workflow input even when planRef.sizeBytes is absent', async () => {
    const { adapter, workflowClient } = makeAdapter({ maxStartPayloadBytes: 512 });
    const largePlan = makeLargePlan(8, 96);

    await expect(
      adapter.startRun(
        largePlan,
        {
          ...BASE_PLAN_REF,
          sizeBytes: undefined,
        },
        BASE_CTX
      )
    ).rejects.toThrow('TEMPORAL_START_PAYLOAD_TOO_LARGE');

    expect(workflowClient.start).not.toHaveBeenCalled();
  });
});

describe('TemporalAdapter.signal', () => {
  it('declares support for the current signal semantics version', () => {
    const { adapter } = makeAdapter();

    expect(adapter.signalSemanticsVersions?.()).toEqual([CURRENT_SIGNAL_SEMANTICS_VERSION]);
  });

  it('forwards PAUSE with the caller-provided signalId', async () => {
    const signal = vi.fn(async () => undefined);
    const { adapter, workflowClient } = makeAdapter();
    workflowClient.getHandle.mockReturnValue({
      signal,
    });

    await adapter.signal(
      {
        provider: 'temporal',
        tenantId: 'tenant-1',
        namespace: 'dvt-test',
        workflowId: 'run-1',
        runId: 'run-1',
      },
      { signalId: 'sig-pause-1', type: 'PAUSE' }
    );

    expect(signal).toHaveBeenCalledWith(WorkflowSignals.PAUSE, 'sig-pause-1');
  });

  it('forwards RESUME with the caller-provided signalId', async () => {
    const signal = vi.fn(async () => undefined);
    const { adapter, workflowClient } = makeAdapter();
    workflowClient.getHandle.mockReturnValue({
      signal,
    });

    await adapter.signal(
      {
        provider: 'temporal',
        tenantId: 'tenant-1',
        namespace: 'dvt-test',
        workflowId: 'run-1',
        runId: 'run-1',
      },
      { signalId: 'sig-resume-1', type: 'RESUME' }
    );

    expect(signal).toHaveBeenCalledWith(WorkflowSignals.RESUME, 'sig-resume-1');
  });

  it('forwards CANCEL through the canonical provider mapper', async () => {
    const signal = vi.fn(async () => undefined);
    const { adapter, workflowClient } = makeAdapter();
    workflowClient.getHandle.mockReturnValue({
      signal,
    });

    await adapter.signal(
      {
        provider: 'temporal',
        tenantId: 'tenant-1',
        namespace: 'dvt-test',
        workflowId: 'run-1',
        runId: 'run-1',
      },
      { signalId: 'sig-cancel-1', type: 'CANCEL', reason: 'operator-request' }
    );

    expect(signal).toHaveBeenCalledWith(WorkflowSignals.CANCEL, 'operator-request');
  });
});
