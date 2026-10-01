/**
 * @baseline ADR-0001: Temporal integration lifecycle and build prerequisites
 * @baseline ADR-0030: Unknown starts do not authorize application redispatch
 * @ownedConcern Measure retained-identity convergence, not authorize production retries.
 * @decision Use a pinned full server, real SDK requests and deterministic arrival barriers.
 */
import { WorkflowClient, WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { loadTemporalAdapterConfig } from '../src/config.js';
import { TemporalAdapter } from '../src/TemporalAdapter.js';

import {
  assertWorkflowArtifactPresentInCi,
  createPlanRef,
  createRunContext,
  INTEGRATION_TEST_TIMEOUT,
  mkLinearPlan,
  RunId,
} from './integration.time-skipping.shared.js';

assertWorkflowArtifactPresentInCi();

function barrier(): { reached: Promise<void>; release: () => void } {
  let release!: () => void;
  const reached = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { reached, release };
}

describe('Temporal retransmission admission evidence (isolated full server)', () => {
  let env: TestWorkflowEnvironment;
  const config = loadTemporalAdapterConfig({
    TEMPORAL_NAMESPACE: 'default',
    TEMPORAL_TASK_QUEUE: 'unpolled-retransmission-evidence',
    TEMPORAL_IDENTITY: 'retransmission-evidence',
  });
  const planRef = createPlanRef(
    'retransmission-evidence-plan',
    Buffer.from(JSON.stringify(mkLinearPlan(1)))
  );

  beforeAll(async () => {
    // Same CLI/server release as the immutable CI service image. No existing
    // endpoint or application namespace can be supplied to this destructive proof.
    env = await TestWorkflowEnvironment.createLocal({
      server: {
        executable: { type: 'cached-download', version: 'v1.8.2' },
        extraArgs: ['--disable-config-file', '--disable-config-env'],
      },
    });
    const system = await env.client.workflowService.getSystemInfo({});
    const namespace = await env.client.workflowService.describeNamespace({ namespace: 'default' });
    expect(system.serverVersion).toBe('1.31.2');
    expect(namespace.config?.workflowExecutionRetentionTtl?.seconds?.toString()).toBe('86400');
    expect(namespace.isGlobalNamespace).toBe(false);
  }, INTEGRATION_TEST_TIMEOUT);

  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await env?.teardown();
  }, INTEGRATION_TEST_TIMEOUT);

  it.each(['original', 'second'] as const)(
    'converges while identity is retained when the %s request arrives first',
    async (winner) => {
      const intercepted = barrier();
      const releaseOriginal = barrier();
      const delayedClient = new WorkflowClient({
        connection: env.connection,
        namespace: 'default',
        interceptors: [
          {
            async start(input, next) {
              intercepted.release();
              await releaseOriginal.reached;
              return next(input);
            },
          },
        ],
      });
      const delayed = new TemporalAdapter({ workflowClient: delayedClient, config });
      const immediate = new TemporalAdapter({ workflowClient: env.client.workflow, config });
      const context = createRunContext(RunId.of(`arrival-${winner}`));
      const original = delayed.startRun(planRef, context);
      const settled = Promise.allSettled([original]);
      try {
        await intercepted.reached;
        expect(await immediate.observeStartRun(context.runId, context.tenantId)).toEqual({
          kind: 'missing_at_observation',
        });
        if (winner === 'original') {
          releaseOriginal.release();
          await original;
        } else {
          await immediate.startRun(planRef, context);
        }
        const before = await immediate.observeStartRun(context.runId, context.tenantId);
        expect(before.kind).toBe('active');
        if (winner === 'original') {
          await expect(immediate.startRun(planRef, context)).rejects.toBeInstanceOf(
            WorkflowExecutionAlreadyStartedError
          );
        } else {
          releaseOriginal.release();
          expect((await settled)[0]).toMatchObject({
            status: 'rejected',
            reason: expect.any(WorkflowExecutionAlreadyStartedError),
          });
        }
        expect(await immediate.observeStartRun(context.runId, context.tenantId)).toEqual(before);
      } finally {
        releaseOriginal.release();
        await settled;
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'reuses an identical request while retained, but not after its history is deleted',
    async () => {
      const service = env.client.workflowService;
      // Spy only records the real request: no mocked provider result or transport.
      const starts = vi.spyOn(service, 'startWorkflowExecution');
      const adapter = new TemporalAdapter({ workflowClient: env.client.workflow, config });
      const context = createRunContext(RunId.of('exact-request-retransmission'));
      const first = await adapter.startRun(planRef, context);
      const request = starts.mock.calls[0]?.[0];
      if (!request?.requestId) throw new Error('SDK did not provide a start request identity');
      const handle = env.client.workflow.getHandle(first.workflowId);
      const original = await handle.describe();

      const replay = await service.startWorkflowExecution(request);
      expect(replay.runId).toBe(original.runId);
      expect((await handle.describe()).runId).toBe(original.runId);

      // A new high-level call is not the same transport retry: it creates a new
      // requestId even though the workflow identity and DVT input are unchanged.
      await expect(adapter.startRun(planRef, context)).rejects.toBeInstanceOf(
        WorkflowExecutionAlreadyStartedError
      );
      const nextRequest = starts.mock.calls[2]?.[0];
      expect(nextRequest?.requestId).toBeTruthy();
      expect(nextRequest?.requestId).not.toBe(request.requestId);
      expect(nextRequest?.input).toEqual(request.input);
      expect(nextRequest?.workflowId).toBe(request.workflowId);

      await handle.terminate('Isolated retransmission evidence');
      await expect(adapter.startRun(planRef, context)).rejects.toBeInstanceOf(
        WorkflowExecutionAlreadyStartedError
      );
      await service.deleteWorkflowExecution({
        namespace: 'default',
        workflowExecution: { workflowId: first.workflowId, runId: original.runId },
      });
      await expect
        .poll(async () => (await adapter.observeStartRun(context.runId, context.tenantId)).kind, {
          timeout: 60_000,
          interval: 500,
        })
        .toBe('missing_at_observation');

      // This is the exact original message, including requestId and payload.
      // Destroyed retained identity defeats even this form of retransmission.
      const replacement = await service.startWorkflowExecution(request);
      expect(replacement.runId).toBeTruthy();
      expect(replacement.runId).not.toBe(original.runId);
      expect((await handle.describe()).runId).toBe(replacement.runId);
    },
    INTEGRATION_TEST_TIMEOUT
  );
});
