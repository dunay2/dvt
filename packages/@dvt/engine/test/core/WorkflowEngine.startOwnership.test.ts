/**
 * @ownedConcern Prove exclusive provider dispatch through the public Engine start/recovery rails.
 * @baseline ADR-0030: Pre-dispatch intent ownership
 * @decision Hold the first provider call with a barrier while another caller claims the same intent.
 * @consequence Metadata uniqueness and provider idempotency cannot hide duplicate dispatches.
 */
import type { EngineRunRef } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  createWorkflowEngineFixture,
  makeTemporalAdapter,
} from '../helpers/workflowEngine.fixture.js';

import { makeContext, makePlanRef } from './WorkflowEngine.helpers.js';

function barrier(): { reached: Promise<void>; release: () => void } {
  let release!: () => void;
  const reached = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { reached, release };
}

function settle(
  promise: Promise<EngineRunRef>
): Promise<{ kind: 'succeeded'; runRef: EngineRunRef } | { kind: 'rejected'; error: unknown }> {
  return promise.then(
    (runRef) => ({ kind: 'succeeded' as const, runRef }),
    (error: unknown) => ({ kind: 'rejected' as const, error })
  );
}

type Fixture = ReturnType<typeof createWorkflowEngineFixture>;

async function failSource(fixture: Fixture, runId: string): Promise<void> {
  const metadata = await fixture.store.getRunMetadataByRunId('t', runId);
  if (metadata === null) throw new Error('Source preparation missing');
  await fixture.store.appendAndEnqueueTx(runId, [
    {
      eventId: `${runId}:failed`,
      idempotencyKey: `${runId}:failed`,
      eventType: 'RunFailed',
      tenantId: metadata.tenantId,
      projectId: metadata.projectId,
      environmentId: metadata.environmentId,
      runId,
      planId: metadata.planId,
      planVersion: metadata.planVersion,
      logicalAttemptId: metadata.logicalAttemptId,
      engineAttemptId: 1,
      emittedAt: fixture.clock.nowIsoUtc(),
      payloadVersion: 1,
      payload: { reason: 'WORKFLOW_FAILURE' },
    },
  ]);
}

describe('Start intent exclusive ownership', () => {
  it('does not confirm a stale caller even when the estimated and returned references match', async () => {
    const dispatched = barrier();
    const release = barrier();
    const runId = 'stale-estimated';
    const runRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: `wf-${runId}`,
      runId,
    };
    const adapter = makeTemporalAdapter({ estimateRunRef: () => runRef });
    const cancel = vi.spyOn(adapter, 'cancelRun');
    const fixture = createWorkflowEngineFixture({ adapter });
    const persistDispatch = fixture.intentStore.markDispatched.bind(fixture.intentStore);
    vi.spyOn(fixture.intentStore, 'markDispatched').mockImplementation(
      async (receipt, reference) => {
        const result = await persistDispatch(receipt, reference);
        dispatched.release();
        await release.reached;
        return result;
      }
    );
    const first = settle(fixture.engine.startRun(makePlanRef(), makeContext(runId)));
    let before: Awaited<ReturnType<typeof fixture.intentStore.getIntent>>;
    try {
      await Promise.race([dispatched.reached, first]);
      const intentId = fixture.idempotency.startRunIntentId('t', runId, 1, 'temporal');
      const intent = await fixture.intentStore.getIntent({ tenantId: 't', intentId });
      if (!intent) throw new Error('Missing acquired intent');
      const reclaim = await fixture.intentStore.reclaimIntent({
        tenantId: 't',
        intentId,
        expectedRevision: intent.revision,
        minimumAgeMs: 0,
      });
      expect(reclaim.kind).toBe('acquired');
      before = await fixture.intentStore.getIntent({ tenantId: 't', intentId });
    } finally {
      release.release();
    }
    expect((await first).kind).toBe('rejected');
    if (!before) throw new Error('Missing reclaimed intent');
    expect(await fixture.intentStore.getIntent(before)).toEqual(before);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('does not send a provider request when ownership was reclaimed after preparation', async () => {
    const prepared = barrier();
    const release = barrier();
    const runRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: 'wf-fenced',
      runId: 'fenced',
    };
    const adapter = makeTemporalAdapter({ estimateRunRef: () => runRef });
    const startProvider = vi.spyOn(adapter, 'startRun');
    const cancelProvider = vi.spyOn(adapter, 'cancelRun');
    const fixture = createWorkflowEngineFixture({ adapter });
    const apply = fixture.store.applyStartRunWrite.bind(fixture.store);
    vi.spyOn(fixture.store, 'applyStartRunWrite').mockImplementation(async (receipt, write) => {
      const result = await apply(receipt, write);
      if (write.kind === 'bootstrap') {
        prepared.release();
        await release.reached;
      }
      return result;
    });
    const result = settle(fixture.engine.startRun(makePlanRef(), makeContext('fenced')));
    try {
      await Promise.race([prepared.reached, result]);
      const intentId = fixture.idempotency.startRunIntentId('t', 'fenced', 1, 'temporal');
      const intent = await fixture.intentStore.getIntent({ tenantId: 't', intentId });
      if (!intent) throw new Error('Missing acquired intent');
      expect(
        (
          await fixture.intentStore.reclaimIntent({
            tenantId: 't',
            intentId,
            expectedRevision: intent.revision,
            minimumAgeMs: 0,
          })
        ).kind
      ).toBe('acquired');
    } finally {
      release.release();
    }
    expect((await result).kind).toBe('rejected');
    expect(startProvider).not.toHaveBeenCalled();
    expect(cancelProvider).not.toHaveBeenCalled();
  });

  it.each(['non-estimated', 'prepared-recovery'] as const)(
    'allows only one provider dispatch for concurrent %s callers',
    async (path) => {
      const enteredProvider = barrier();
      const finishProvider = barrier();
      const runId = `exclusive-${path}`;
      const sourceId = `source-${path}`;
      let targetDispatches = 0;
      const runRef = (id: string): EngineRunRef => ({
        provider: 'temporal',
        tenantId: 't',
        namespace: 'default',
        workflowId: `wf-${id}`,
        runId: id,
      });
      const adapter = makeTemporalAdapter({
        ...(path === 'prepared-recovery'
          ? { estimateRunRef: (context) => runRef(context.runId) }
          : {}),
        async startRun(_plan, context) {
          if (context.runId === runId && ++targetDispatches === 1) {
            enteredProvider.release();
            await finishProvider.reached;
          }
          return runRef(context.runId);
        },
      });
      const cancel = vi.spyOn(adapter, 'cancelRun');
      const fixture = createWorkflowEngineFixture({ adapter });
      if (path === 'prepared-recovery') {
        await fixture.engine.startRun(makePlanRef(), makeContext(sourceId));
        await failSource(fixture, sourceId);
      }
      const start = (): Promise<EngineRunRef> =>
        path === 'prepared-recovery'
          ? fixture.engine.recoverRun(sourceId, makePlanRef(), makeContext(runId))
          : fixture.engine.startRun(makePlanRef(), makeContext(runId));
      const first = settle(start());
      try {
        // Also terminate promptly if admission unexpectedly rejects the first call.
        await Promise.race([enteredProvider.reached, first]);
        const before = globalThis.structuredClone({
          metadata: await fixture.store.getRunMetadataByRunId('t', runId),
          events: await fixture.store.listEvents('t', runId),
          intent: await fixture.intentStore.getIntent({
            tenantId: 't',
            intentId: fixture.idempotency.startRunIntentId(
              't',
              runId,
              path === 'prepared-recovery' ? 2 : 1,
              'temporal'
            ),
          }),
        });
        const second = await settle(start());
        expect.soft(targetDispatches).toBe(1);
        expect.soft(second.kind).toBe('rejected');
        expect.soft(await fixture.store.getRunMetadataByRunId('t', runId)).toEqual(before.metadata);
        expect.soft(await fixture.store.listEvents('t', runId)).toEqual(before.events);
        if (before.intent === null) throw new Error('Missing acquired intent');
        expect
          .soft(
            await fixture.intentStore.getIntent({ tenantId: 't', intentId: before.intent.intentId })
          )
          .toEqual(before.intent);
      } finally {
        finishProvider.release();
        await first;
      }
      expect(await first).toEqual({ kind: 'succeeded', runRef: runRef(runId) });
      expect(cancel).not.toHaveBeenCalled();
    }
  );
});
