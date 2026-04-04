import type { EngineRunRef, RunStatusSnapshot } from '@dvt/contracts';
import { InvalidStateTransitionError } from '@dvt/run-domain';
import { describe, expect, it, vi } from 'vitest';

import {
  appendRunStarted,
  bootstrapQueuedRun,
  makeRunRef,
} from '../helpers/runLifecycle.fixture.js';
import { createWorkflowEngineCoreFixture } from '../helpers/workflowEngine.fixture.js';

describe('WorkflowEngineCoreService', () => {
  it('cancel throws when run metadata is missing', async () => {
    const { core } = createWorkflowEngineCoreFixture();
    await expect(
      core.cancel({
        provider: 'temporal',
        tenantId: 't',
        namespace: 'default',
        workflowId: 'wf-missing',
        runId: 'missing',
      })
    ).rejects.toThrow(/engine\.error\.run_metadata_not_found/);
  });

  it('getStatus returns projected state without calling adapter', async () => {
    let adapterCalled = false;
    const { core, store } = createWorkflowEngineCoreFixture({
      adapterOverrides: {
        async getRunStatus() {
          adapterCalled = true;
          return { runId: 'x', status: 'RUNNING' } as RunStatusSnapshot;
        },
      },
    });
    await bootstrapQueuedRun(store, 'core-status-1');
    const ref: EngineRunRef = makeRunRef('core-status-1');
    const snapshot = await core.getStatus(ref);

    expect(adapterCalled).toBe(false);
    expect(snapshot.runId).toBe('core-status-1');
    expect(snapshot.status).toBe('PENDING');
  });

  it('enrichStatus merges adapter substatus and message over projected base', async () => {
    const { core, store } = createWorkflowEngineCoreFixture({
      adapterOverrides: {
        async getRunStatus(runRef) {
          return {
            runId: runRef.runId,
            status: 'RUNNING',
            substatus: 'DRAINING',
            message: 'graceful shutdown in progress',
          } as RunStatusSnapshot;
        },
      },
    });
    await bootstrapQueuedRun(store, 'core-enrich-1');
    const ref: EngineRunRef = makeRunRef('core-enrich-1');
    const enriched = await core.enrichStatus(ref);

    expect(enriched.runId).toBe('core-enrich-1');
    expect(enriched.status).toBe('PENDING');
    expect(enriched.substatus).toBe('DRAINING');
    expect(enriched.message).toBe('graceful shutdown in progress');
  });

  it('enrichStatus throws when adapter status fetch fails', async () => {
    const { core, store } = createWorkflowEngineCoreFixture({
      adapterOverrides: {
        async getRunStatus() {
          throw new Error('provider unavailable');
        },
      },
    });
    await bootstrapQueuedRun(store, 'core-enrich-err-1');
    const ref: EngineRunRef = makeRunRef('core-enrich-err-1');
    await expect(core.enrichStatus(ref)).rejects.toThrow(/provider unavailable/);
  });

  it('cancel delegates to adapter without appending RunCancelRequested', async () => {
    const cancelRun = vi.fn(async () => {});
    const { core, store } = createWorkflowEngineCoreFixture({
      adapterOverrides: {
        cancelRun,
      },
    });
    await bootstrapQueuedRun(store, 'core-cancel-1');
    const ref: EngineRunRef = makeRunRef('core-cancel-1');

    await core.cancel(ref);

    expect(cancelRun).toHaveBeenCalledTimes(1);
    expect(cancelRun).toHaveBeenCalledWith(ref);
    expect((await store.listEvents('t', 'core-cancel-1')).map((event) => event.eventType)).toEqual([
      'RunQueued',
    ]);
  });

  it('signal(CANCEL) delegates to adapter without appending RunCancelRequested', async () => {
    const signal = vi.fn(async () => {});
    const { core, store } = createWorkflowEngineCoreFixture({
      adapterOverrides: {
        signal,
      },
    });
    await bootstrapQueuedRun(store, 'core-signal-cancel-1');
    const ref: EngineRunRef = makeRunRef('core-signal-cancel-1');

    await core.signal(ref, {
      signalId: 'sig-cancel-1',
      type: 'CANCEL',
      reason: 'operator-request',
    });

    expect(signal).toHaveBeenCalledTimes(1);
    expect(signal).toHaveBeenCalledWith(ref, {
      signalId: 'sig-cancel-1',
      type: 'CANCEL',
      reason: 'operator-request',
    });
    expect(
      (await store.listEvents('t', 'core-signal-cancel-1')).map((event) => event.eventType)
    ).toEqual(['RunQueued']);
  });

  it('signal(PAUSE) then signal(RESUME) still append engine-owned lifecycle events', async () => {
    const signal = vi.fn(async () => {});
    const { core, store } = createWorkflowEngineCoreFixture({
      adapterOverrides: {
        signal,
      },
    });
    await bootstrapQueuedRun(store, 'core-signal-pause-resume-1');
    const ref: EngineRunRef = makeRunRef('core-signal-pause-resume-1');
    await appendRunStarted(store, 'core-signal-pause-resume-1');

    await core.signal(ref, {
      signalId: 'sig-pause-1',
      type: 'PAUSE',
    });
    await core.signal(ref, {
      signalId: 'sig-resume-1',
      type: 'RESUME',
    });

    expect(signal).toHaveBeenCalledTimes(2);
    expect(
      (await store.listEvents('t', 'core-signal-pause-resume-1')).map((event) => event.eventType)
    ).toEqual(['RunQueued', 'RunStarted', 'RunPaused', 'RunResumed']);
  });

  it('signal(PAUSE) on PENDING run rejects before adapter side effects', async () => {
    const signal = vi.fn(async () => {});
    const { core, store } = createWorkflowEngineCoreFixture({
      adapterOverrides: {
        signal,
      },
    });
    await bootstrapQueuedRun(store, 'core-signal-pause-invalid-1');
    const ref: EngineRunRef = makeRunRef('core-signal-pause-invalid-1');

    await expect(
      core.signal(ref, {
        signalId: 'sig-pause-invalid-1',
        type: 'PAUSE',
      })
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);

    expect(signal).not.toHaveBeenCalled();
    expect(
      (await store.listEvents('t', 'core-signal-pause-invalid-1')).map((event) => event.eventType)
    ).toEqual(['RunQueued']);
  });
});
