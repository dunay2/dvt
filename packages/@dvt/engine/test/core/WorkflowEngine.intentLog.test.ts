/**
 * @file packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Verify PENDING->DISPATCHED->RESOLVED lifecycle and crash-compensation intent resolution
 * @consequence Ensures WorkflowEngine.startRun() intent store integration matches ADR-0030 invariants
 * @version 1.0.0
 * @date 2026-03-03
 */
import type { EngineRunRef } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';

import {
  makeAdapters,
  makeScriptedClock,
  makePlanRef,
  makeContext,
  makeTemporalAdapter,
  createEngine,
} from './WorkflowEngine.helpers.js';

describe('WorkflowEngine intent log (startRun crash consistency)', () => {
  it('happy path: intent transitions PENDING -> DISPATCHED -> RESOLVED', async () => {
    const adapters = makeAdapters();
    const { engine, intentStore } = createEngine({ adapters });

    await engine.startRun(makePlanRef(), makeContext('il-happy-1'));

    // Intent should exist and be resolved
    const allIntents = await intentStore.listOrphaned(0, Date.now());
    expect(allIntents).toHaveLength(0); // no orphans; all resolved
  });

  it('after successful startRun, intent is RESOLVED', async () => {
    const adapters = makeAdapters();

    // Use a spy on intentStore to capture the intentId
    const intentStore = new InMemoryStartRunIntentStore();
    const createSpy = vi.spyOn(intentStore, 'createIntent');

    const { engine } = createEngine({
      adapters,
      intentStore,
    });

    await engine.startRun(makePlanRef(), makeContext('il-resolved-1'));

    expect(createSpy).toHaveBeenCalledOnce();
    const intentId = createSpy.mock.results[0]?.value;
    const resolvedIntent = await intentId;
    const intent = await intentStore.getIntent({
      tenantId: resolvedIntent.tenantId,
      intentId: resolvedIntent.intentId,
    });
    expect(intent?.status).toBe('RESOLVED');
    expect(intent?.runId).toBe('il-resolved-1');
    expect(intent?.provider).toBe('temporal');
  });

  it('when adapter.startRun() throws, intent remains PENDING', async () => {
    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      [
        'temporal',
        makeTemporalAdapter({
          async startRun() {
            throw new Error('adapter boom');
          },
        }),
      ],
    ]);

    const intentStore = new InMemoryStartRunIntentStore();
    const createSpy = vi.spyOn(intentStore, 'createIntent');

    const store = new InMemoryTxStore();
    const { engine } = createEngine({
      adapters,
      intentStore,
      stateStore: store,
      clock: new SequenceClock('2026-03-01T00:00:00.000Z'),
    });

    await expect(engine.startRun(makePlanRef(), makeContext('il-adapter-fail-1'))).rejects.toThrow(
      /adapter boom/
    );

    expect(createSpy).toHaveBeenCalledOnce();
    const created = await createSpy.mock.results[0]?.value;
    const intent = await intentStore.getIntent({
      tenantId: created.tenantId,
      intentId: created.intentId,
    });
    expect(intent?.status).toBe('PENDING');
  });

  it('does not emit RunFailed when intent persistence fails after pre-bootstrap start succeeds', async () => {
    const adapters = makeAdapters({
      estimateRunRef(ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
    });

    const intentStore = new InMemoryStartRunIntentStore();
    const createSpy = vi.spyOn(intentStore, 'createIntent');
    intentStore.markDispatched = async () => {
      throw new Error('intent store boom');
    };

    const store = new InMemoryTxStore();
    const { engine } = createEngine({
      adapters,
      intentStore,
      stateStore: store,
      clock: new SequenceClock('2026-03-01T00:00:00.000Z'),
    });

    await expect(
      engine.startRun(makePlanRef(), makeContext('il-mark-dispatched-fail-1'))
    ).rejects.toThrow(/Intent persistence failed after adapter.startRun succeeded/);

    const created = await createSpy.mock.results[0]?.value;
    const intent = await intentStore.getIntent({
      tenantId: created.tenantId,
      intentId: created.intentId,
    });
    expect(intent?.status).toBe('PENDING');
    expect(intent?.engineRunRef).toBeUndefined();

    const meta = await store.getRunMetadataByRunId('t', 'il-mark-dispatched-fail-1');
    expect(meta?.runId).toBe('il-mark-dispatched-fail-1');

    const events = await store.listEvents('t', 'il-mark-dispatched-fail-1');
    expect(events.map((event) => event.eventType)).toEqual(['RunQueued']);
  });

  it('when bootstrapRunTx() throws, compensation fires AND intent is RESOLVED', async () => {
    let cancelCalled = false;
    const adapters = makeAdapters({
      async cancelRun() {
        cancelCalled = true;
      },
    });

    const intentStore = new InMemoryStartRunIntentStore();
    const createSpy = vi.spyOn(intentStore, 'createIntent');

    // Create a store that will fail on bootstrapRunTx for a specific runId
    const store = new InMemoryTxStore();
    const originalBootstrap = store.bootstrapRunTx.bind(store);
    store.bootstrapRunTx = async (input) => {
      if (input.metadata.runId === 'il-bootstrap-fail-1') {
        throw new Error('bootstrap boom');
      }
      return originalBootstrap(input);
    };

    const { engine } = createEngine({
      adapters,
      intentStore,
      stateStore: store,
      clock: new SequenceClock('2026-03-01T00:00:00.000Z'),
    });

    await expect(
      engine.startRun(makePlanRef(), makeContext('il-bootstrap-fail-1'))
    ).rejects.toThrow(/bootstrap boom/);

    expect(cancelCalled).toBe(true);

    const created = await createSpy.mock.results[0]?.value;
    const intent = await intentStore.getIntent({
      tenantId: created.tenantId,
      intentId: created.intentId,
    });
    // Intent is resolved because compensation succeeded
    expect(intent?.status).toBe('RESOLVED');
    // engineRunRef was set during DISPATCHED phase
    expect(intent?.engineRunRef).toBeDefined();
  });

  it('bootstraps the exact providerRef returned by adapter.startRun on the no-estimate path', async () => {
    const returnedProviderRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'runtime-namespace',
      workflowId: 'workflow-from-provider',
      runId: 'provider-execution-id',
      taskQueue: 'runtime-task-queue',
    };
    const adapters = makeAdapters({
      async startRun() {
        return returnedProviderRef;
      },
    });
    const { engine, store } = createEngine({ adapters });

    await expect(
      engine.startRun(makePlanRef(), makeContext('il-provider-ref-proof-1'))
    ).resolves.toEqual(returnedProviderRef);

    const meta = await store.getRunMetadataByRunId('t', 'il-provider-ref-proof-1');
    expect(meta?.providerRef).toEqual(returnedProviderRef);
  });

  it('compensates bootstrap failure against the exact providerRef returned by adapter.startRun', async () => {
    const returnedProviderRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'runtime-namespace',
      workflowId: 'workflow-to-cancel',
      runId: 'provider-run-to-cancel',
      taskQueue: 'runtime-task-queue',
    };
    const cancelledProviderRefs: EngineRunRef[] = [];
    const adapters = makeAdapters({
      async startRun() {
        return returnedProviderRef;
      },
      async cancelRun(runRef) {
        cancelledProviderRefs.push(runRef);
      },
    });
    const intentStore = new InMemoryStartRunIntentStore();
    const createSpy = vi.spyOn(intentStore, 'createIntent');
    const store = new InMemoryTxStore();
    const originalBootstrap = store.bootstrapRunTx.bind(store);
    store.bootstrapRunTx = async (input) => {
      if (input.metadata.runId === 'il-provider-ref-compensation-1') {
        throw new Error('bootstrap unavailable');
      }
      return originalBootstrap(input);
    };
    const { engine } = createEngine({ adapters, intentStore, stateStore: store });

    await expect(
      engine.startRun(makePlanRef(), makeContext('il-provider-ref-compensation-1'))
    ).rejects.toThrow(/bootstrap unavailable/);

    expect(cancelledProviderRefs).toEqual([returnedProviderRef]);
    await expect(
      store.getRunMetadataByRunId('t', 'il-provider-ref-compensation-1')
    ).resolves.toBeNull();
    const created = await createSpy.mock.results[0]?.value;
    const intent = await intentStore.getIntent({
      tenantId: created.tenantId,
      intentId: created.intentId,
    });
    expect(intent).toMatchObject({
      status: 'RESOLVED',
      engineRunRef: returnedProviderRef,
    });
  });

  it('when bootstrapRunTx and cancelRun both throw, intent markResolved is still attempted', async () => {
    const adapters = makeAdapters({
      async cancelRun() {
        throw new Error('cancel boom');
      },
    });

    const intentStore = new InMemoryStartRunIntentStore();
    const createSpy = vi.spyOn(intentStore, 'createIntent');
    const resolveSpy = vi.spyOn(intentStore, 'markResolved');

    const store = new InMemoryTxStore();
    const originalBootstrap = store.bootstrapRunTx.bind(store);
    store.bootstrapRunTx = async (input) => {
      if (input.metadata.runId === 'il-double-fail-1') {
        throw new Error('bootstrap boom');
      }
      return originalBootstrap(input);
    };

    const { engine } = createEngine({
      adapters,
      intentStore,
      stateStore: store,
      clock: new SequenceClock('2026-03-01T00:00:00.000Z'),
    });

    await expect(engine.startRun(makePlanRef(), makeContext('il-double-fail-1'))).rejects.toThrow(
      /bootstrap boom/
    );

    // markResolved was called on the compensation path (best-effort)
    expect(resolveSpy).toHaveBeenCalled();

    // Should be resolved despite cancelRun failure
    const created = await createSpy.mock.results[0]?.value;
    const intent = await intentStore.getIntent({
      tenantId: created.tenantId,
      intentId: created.intentId,
    });
    expect(intent?.status).toBe('RESOLVED');
  });

  it('intent uses the engine clock for createdAt', async () => {
    const adapters = makeAdapters();

    const intentStore = new InMemoryStartRunIntentStore();
    const createSpy = vi.spyOn(intentStore, 'createIntent');

    const { engine } = createEngine({
      adapters,
      intentStore,
      clock: makeScriptedClock(['2026-03-01T12:00:00.000Z']),
    });

    await engine.startRun(makePlanRef(), makeContext('il-clock-1'));

    const callArg = createSpy.mock.calls[0]?.[0];
    expect(callArg?.createdAt).toMatch(/^2026-03-01T12:00:00/);
  });

  it('intent provider matches context.targetAdapter', async () => {
    const adapters = makeAdapters();

    const intentStore = new InMemoryStartRunIntentStore();
    const createSpy = vi.spyOn(intentStore, 'createIntent');

    const { engine } = createEngine({
      adapters,
      intentStore,
    });

    await engine.startRun(makePlanRef(), makeContext('il-provider-1'));

    const callArg = createSpy.mock.calls[0]?.[0];
    expect(callArg?.provider).toBe('temporal');
  });

  it('intent engineRunRef is set only after markDispatched', async () => {
    const adapters = makeAdapters();

    const intentStore = new InMemoryStartRunIntentStore();
    const dispatchSpy = vi.spyOn(intentStore, 'markDispatched');

    const store = new InMemoryTxStore();
    const { engine } = createEngine({
      adapters,
      intentStore,
      stateStore: store,
      clock: new SequenceClock('2026-03-01T00:00:00.000Z'),
    });

    await engine.startRun(makePlanRef(), makeContext('il-ref-1'));

    expect(dispatchSpy).toHaveBeenCalledOnce();
    const [, runRef] = dispatchSpy.mock.calls[0]!;
    expect(runRef.provider).toBe('temporal');
    expect(runRef.runId).toBe('il-ref-1');
  });

  it('when intentStore.createIntent() throws, startRun propagates the error (no adapter call)', async () => {
    let adapterCalled = false;
    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      [
        'temporal',
        makeTemporalAdapter({
          async startRun(_planRef, ctx) {
            adapterCalled = true;
            return {
              provider: 'temporal',
              tenantId: ctx.tenantId,
              namespace: 'default',
              workflowId: `wf-${ctx.runId}`,
              runId: ctx.runId,
            } as EngineRunRef;
          },
        }),
      ],
    ]);

    const intentStore = new InMemoryStartRunIntentStore();
    vi.spyOn(intentStore, 'createIntent').mockRejectedValueOnce(
      new Error('intent store unavailable')
    );

    const store = new InMemoryTxStore();
    const { engine } = createEngine({
      adapters,
      intentStore,
      stateStore: store,
      clock: new SequenceClock('2026-03-01T00:00:00.000Z'),
    });

    await expect(engine.startRun(makePlanRef(), makeContext('il-intent-fail-1'))).rejects.toThrow(
      /intent store unavailable/
    );

    expect(adapterCalled).toBe(false);
  });
});
