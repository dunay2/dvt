import type { EngineRunRef, RunContext } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { createNoopObservability } from '../../../observability/src/noopObservability.js';
import { StartRunEventFactory } from '../../src/services/startRun/StartRunEventFactory.js';
import { StartRunFailurePolicy } from '../../src/services/startRun/StartRunFailurePolicy.js';
import {
  createWorkflowEngineFixture,
  makeDefaultExecutionPlan,
  makePlanRefForPlan,
  makeTemporalAdapter,
} from '../helpers/workflowEngine.fixture.js';

const context: RunContext = {
  tenantId: 'tenant-authority',
  projectId: 'project',
  environmentId: 'test',
  runId: 'authority-start',
  targetAdapter: 'temporal',
};
const ref: EngineRunRef = {
  provider: 'temporal',
  tenantId: context.tenantId,
  namespace: 'test',
  workflowId: 'authority-workflow',
  runId: context.runId,
};

describe('start failure authority reads', () => {
  it.each(['identity', 'metadata'] as const)(
    'rejects missing %s without replacing the start error',
    async (missing) => {
      const fixture = createWorkflowEngineFixture({ adapter: makeTemporalAdapter() });
      const observability = createNoopObservability();
      const warn = vi.spyOn(observability.logs, 'warn');
      const metadata = vi.spyOn(fixture.store, 'getRunMetadataByRunId').mockResolvedValue(null);
      const append = vi.spyOn(fixture.store, 'appendAndEnqueueTx');
      const original = new Error('original start failure');
      const policy = new StartRunFailurePolicy({
        stateStoreRead: fixture.store,
        stateStoreWrite: fixture.store,
        intentStore: fixture.intentStore,
        observability,
        clock: fixture.clock,
        eventFactory: new StartRunEventFactory({
          clock: fixture.clock,
          idempotency: fixture.idempotency,
        }),
      });
      await expect(
        policy.handleStartRunError({
          error: original,
          resolvedContext: { ...context, logicalAttemptId: 1 },
          metricTags: {},
          traceContext: { ...context },
          errorContext: {
            preparation: { disposition: 'created', runRef: ref },
            phase: 'completion',
            ...(missing === 'identity' ? {} : { intentId: 'missing-record' }),
          },
        })
      ).rejects.toBe(original);
      expect(append).not.toHaveBeenCalled();
      expect(metadata).toHaveBeenCalledTimes(missing === 'identity' ? 0 : 1);
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: {
            reasonCode: missing === 'identity' ? 'intent_missing' : 'metadata_missing',
          },
        })
      );
    }
  );

  it.each([
    { boundary: 'intent', fault: new Error('intent store unavailable') },
    { boundary: 'intent', fault: 'non-Error rejection' },
    { boundary: 'metadata', fault: new Error('metadata store unavailable') },
  ])(
    'preserves the run and original error when $boundary read fails',
    async ({ boundary, fault }) => {
      const original = new Error('provider response lost');
      const observability = createNoopObservability();
      const warn = vi.spyOn(observability.logs, 'warn');
      const adapter = makeTemporalAdapter({
        estimateRunRef: () => ref,
        async startRun() {
          throw original;
        },
      });
      const fixture = createWorkflowEngineFixture({ adapter, observability });
      const readMetadata = fixture.store.getRunMetadataByRunId.bind(fixture.store);
      const readIntent = fixture.intentStore.getIntent.bind(fixture.intentStore);
      const bootstrap = fixture.store.bootstrapRunTx.bind(fixture.store);
      let before: unknown;
      const snapshot = async (): Promise<unknown> => ({
        metadata: await readMetadata(context.tenantId, context.runId),
        events: await fixture.store.listEvents(context.tenantId, context.runId),
        snapshot: await fixture.store.getSnapshot(context.tenantId, context.runId),
        intent: await readIntent({
          tenantId: context.tenantId,
          intentId: fixture.idempotency.startRunIntentId(
            context.tenantId,
            context.runId,
            1,
            'temporal'
          ),
        }),
      });
      vi.spyOn(fixture.store, 'bootstrapRunTx').mockImplementation(async (input) => {
        const result = await bootstrap(input);
        before = globalThis.structuredClone(await snapshot());
        if (boundary === 'metadata')
          vi.spyOn(fixture.store, 'getRunMetadataByRunId').mockRejectedValue(fault);
        else vi.spyOn(fixture.intentStore, 'getIntent').mockRejectedValue(fault);
        return result;
      });

      await expect(
        fixture.engine.startRun(makePlanRefForPlan(makeDefaultExecutionPlan()), context)
      ).rejects.toBe(original);
      expect(await snapshot()).toEqual(before);
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({ reasonCode: `${boundary}_read_failed` }),
        })
      );
    }
  );

  it('does not turn a missing intent into failure authority', async () => {
    const original = new Error('provider response lost');
    const fixture = createWorkflowEngineFixture({
      adapter: makeTemporalAdapter({
        estimateRunRef: () => ref,
        async startRun() {
          throw original;
        },
      }),
    });
    vi.spyOn(fixture.intentStore, 'getIntent').mockResolvedValue(null);
    await expect(
      fixture.engine.startRun(makePlanRefForPlan(makeDefaultExecutionPlan()), context)
    ).rejects.toBe(original);
    expect(
      (await fixture.store.listEvents(context.tenantId, context.runId)).map(
        (event) => event.eventType
      )
    ).toEqual(['RunQueued']);
  });

  it('keeps failed reads fail-closed even when diagnostics throw', async () => {
    const original = new Error('original start failure');
    const observability = createNoopObservability();
    vi.spyOn(observability.logs, 'warn').mockImplementation(() => {
      throw new Error('log sink down');
    });
    vi.spyOn(observability.logs, 'error').mockImplementation(() => {
      throw new Error('log sink down');
    });
    vi.spyOn(observability.metrics, 'counter').mockImplementation(() => {
      throw new Error('metric sink down');
    });
    const fixture = createWorkflowEngineFixture({
      observability,
      adapter: makeTemporalAdapter({
        estimateRunRef: () => ref,
        async startRun() {
          throw original;
        },
      }),
    });
    vi.spyOn(fixture.intentStore, 'getIntent').mockRejectedValue(new Error('read failed'));
    await expect(
      fixture.engine.startRun(makePlanRefForPlan(makeDefaultExecutionPlan()), context)
    ).rejects.toBe(original);
    expect(
      (await fixture.store.listEvents(context.tenantId, context.runId)).map(
        (event) => event.eventType
      )
    ).toEqual(['RunQueued']);
  });
});
