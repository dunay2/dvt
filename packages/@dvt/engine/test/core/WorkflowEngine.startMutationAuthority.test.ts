/** Owned concern: preserve run state when a rejected start invocation has no mutation authority. */
import { asNonBlankString, parseRunExecutionContextRef, type RunContext } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import {
  CapabilitiesNotSupportedError,
  InvalidSchemaVersionError,
  PlanUriNotAllowedError,
  RunAlreadyExistsError,
  RunExecutionContextRejectedError,
} from '../../src/contracts/errors.js';
import {
  createWorkflowEngineFixture,
  makeTemporalAdapter,
  makeDefaultExecutionPlan,
  makePlanRefForPlan,
  makePlanFetcherForPlan,
} from '../helpers/workflowEngine.fixture.js';

import { makePlanRef } from './WorkflowEngine.helpers.js';

type Fixture = ReturnType<typeof createWorkflowEngineFixture>;

type CapturedRunState = {
  metadata: Awaited<ReturnType<Fixture['store']['getRunMetadataByRunId']>>;
  events: Awaited<ReturnType<Fixture['store']['listEvents']>>;
  snapshot: Awaited<ReturnType<Fixture['store']['getSnapshot']>>;
  intent: Awaited<ReturnType<Fixture['intentStore']['getIntent']>>;
};

function makeContext(runId: string): RunContext {
  return {
    tenantId: asNonBlankString('t'),
    projectId: asNonBlankString('p'),
    environmentId: asNonBlankString('dev'),
    runId: asNonBlankString(runId),
    targetAdapter: 'temporal',
  };
}

function makeEstimatedAdapter(overrides: Partial<IProviderAdapter> = {}): IProviderAdapter {
  return makeTemporalAdapter({
    estimateRunRef(context) {
      return {
        provider: 'temporal',
        tenantId: context.tenantId,
        namespace: 'default',
        workflowId: `wf-${context.runId}`,
        runId: context.runId,
      };
    },
    ...overrides,
  });
}

function createBarrier(): { reached: Promise<void>; release: () => void } {
  let release!: () => void;
  const reached = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { reached, release };
}

async function captureRunState(
  fixture: Fixture,
  runId: string,
  logicalAttemptId = 1
): Promise<CapturedRunState> {
  const { store, intentStore, idempotency } = fixture;
  return globalThis.structuredClone({
    metadata: await store.getRunMetadataByRunId('t', runId),
    events: await store.listEvents('t', runId),
    snapshot: await store.getSnapshot('t', runId),
    intent: await intentStore.getIntent({
      tenantId: 't',
      intentId: idempotency.startRunIntentId('t', runId, logicalAttemptId, 'temporal'),
    }),
  });
}

async function appendLifecycleEvent(
  fixture: Fixture,
  runId: string,
  eventType: 'RunStarted' | 'RunPaused' | 'RunFailed'
): Promise<void> {
  const metadata = await fixture.store.getRunMetadataByRunId('t', runId);
  if (metadata == null) throw new Error('Expected bootstrapped run');
  await fixture.store.appendAndEnqueueTx(runId, [
    {
      eventId: `${runId}:${eventType}`,
      idempotencyKey: `${runId}:${eventType}`,
      eventType,
      runId,
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      planId: metadata.planId,
      planVersion: metadata.planVersion,
      logicalAttemptId: metadata.logicalAttemptId,
      engineAttemptId: 1,
      emittedAt: fixture.clock.nowIsoUtc(),
      payloadVersion: 1,
      ...(eventType === 'RunFailed' ? { payload: { reason: 'WORKFLOW_FAILURE' } } : {}),
    },
  ]);
}

describe('Start invocation mutation authority', () => {
  it.each(['PENDING', 'RUNNING', 'PAUSED'] as const)(
    'preserves the complete %s run on duplicate start',
    async (status) => {
      const adapter = makeEstimatedAdapter();
      const start = vi.spyOn(adapter, 'startRun');
      const cancel = vi.spyOn(adapter, 'cancelRun');
      const fixture = createWorkflowEngineFixture({ adapter });
      const runId = `duplicate-${status}`;
      await fixture.engine.startRun(makePlanRef(), makeContext(runId));
      if (status !== 'PENDING') await appendLifecycleEvent(fixture, runId, 'RunStarted');
      if (status === 'PAUSED') await appendLifecycleEvent(fixture, runId, 'RunPaused');
      const before = await captureRunState(fixture, runId);
      expect(before.snapshot?.status).toBe(status);
      await expect(
        fixture.engine.startRun(makePlanRef(), makeContext(runId))
      ).rejects.toBeInstanceOf(RunAlreadyExistsError);
      expect(await captureRunState(fixture, runId)).toEqual(before);
      expect(start).toHaveBeenCalledTimes(1);
      expect(cancel).not.toHaveBeenCalled();
    }
  );

  it.each([
    { rejection: 'tenant', existing: true },
    { rejection: 'tenant', existing: false },
    { rejection: 'plan', existing: true },
    { rejection: 'plan', existing: false },
    { rejection: 'schema', existing: true },
    { rejection: 'schema', existing: false },
  ])(
    'preserves state for $rejection rejection with existing=$existing',
    async ({ rejection, existing }) => {
      let deny = false;
      const tenantError = new Error('tenant admission denied');
      const adapter = makeEstimatedAdapter();
      const start = vi.spyOn(adapter, 'startRun');
      const fixture = createWorkflowEngineFixture({
        adapter,
        authorizer: {
          async assertTenantAccess() {
            if (deny) throw tenantError;
          },
        },
      });
      const runId = `admission-${rejection}-${existing}`;
      if (existing) await fixture.engine.startRun(makePlanRef(), makeContext(runId));
      const before = await captureRunState(fixture, runId);
      deny = rejection === 'tenant';
      const planRef = {
        ...makePlanRef(),
        ...(rejection === 'plan' ? { uri: 'ftp://forbidden.example/plan' } : {}),
        ...(rejection === 'schema' ? { schemaVersion: '99.0.0' } : {}),
      };
      const result = fixture.engine.startRun(planRef, makeContext(runId));
      if (rejection === 'tenant') await expect(result).rejects.toBe(tenantError);
      else
        await expect(result).rejects.toBeInstanceOf(
          rejection === 'plan' ? PlanUriNotAllowedError : InvalidSchemaVersionError
        );
      expect(await captureRunState(fixture, runId)).toEqual(before);
      expect(start).toHaveBeenCalledTimes(existing ? 1 : 0);
    }
  );

  it.each(['capability', 'context'] as const)(
    'preserves a run created after preflight when %s admission rejects',
    async (rejection) => {
      const plan = makeDefaultExecutionPlan();
      const planRef = makePlanRefForPlan(plan);
      const reader = makePlanFetcherForPlan(
        plan,
        rejection === 'capability' ? { requiresCapabilities: ['temporal.workflow.start'] } : {}
      );
      const fetching = createBarrier();
      const resumeAdmission = createBarrier();
      const fetch = reader.fetchStoredPlanArtifact.bind(reader);
      vi.spyOn(reader, 'fetchStoredPlanArtifact').mockImplementation(async (input) => {
        fetching.release();
        await resumeAdmission.reached;
        return fetch(input);
      });
      const adapter = makeEstimatedAdapter();
      const dispatch = vi.spyOn(adapter, 'startRun');
      const fixture = createWorkflowEngineFixture({ adapter, planFetcher: reader });
      const winner = createWorkflowEngineFixture({
        adapter: makeEstimatedAdapter(),
        stateStore: fixture.store,
        intentStore: fixture.intentStore,
      });
      const runId = 'late-admission-' + rejection;
      const context: RunContext = {
        ...makeContext(runId),
        ...(rejection === 'context'
          ? {
              runExecutionContextRef: parseRunExecutionContextRef({
                uri: 'dvt-runctx://t/context.json',
                sha256: 'a'.repeat(64),
                schemaVersion: 'v1.0',
                planId: planRef.planId,
                planVersion: planRef.planVersion,
              }),
            }
          : {}),
      };
      const pending = fixture.engine.startRun(planRef, context);
      const rejected = expect(pending).rejects.toBeInstanceOf(
        rejection === 'capability'
          ? CapabilitiesNotSupportedError
          : RunExecutionContextRejectedError
      );
      try {
        await Promise.race([fetching.reached, rejected]);
        await winner.engine.startRun(makePlanRef(), makeContext(runId));
        const before = await captureRunState(fixture, runId);
        resumeAdmission.release();
        await rejected;
        expect(await captureRunState(fixture, runId)).toEqual(before);
        expect(dispatch).not.toHaveBeenCalled();
      } finally {
        resumeAdmission.release();
        await Promise.allSettled([pending, rejected]);
      }
    }
  );

  it('does not fail the dispatched winner when concurrent estimated bootstrap loses', async () => {
    const fixture = createWorkflowEngineFixture({ adapter: makeEstimatedAdapter() });
    const bothAtBootstrap = createBarrier();
    const releaseLoser = createBarrier();
    const winnerDispatched = createBarrier();
    const finishWinner = createBarrier();
    const bootstrap = fixture.store.bootstrapRunTx.bind(fixture.store);
    let calls = 0;
    vi.spyOn(fixture.store, 'bootstrapRunTx').mockImplementation(async (input) => {
      if (++calls === 1) await bothAtBootstrap.reached;
      else {
        bothAtBootstrap.release();
        await releaseLoser.reached;
      }
      return bootstrap(input);
    });
    const resolve = fixture.intentStore.markResolved.bind(fixture.intentStore);
    vi.spyOn(fixture.intentStore, 'markResolved').mockImplementation(async (ref) => {
      winnerDispatched.release();
      await finishWinner.reached;
      return resolve(ref);
    });
    const runId = 'concurrent-fresh';
    const winner = fixture.engine.startRun(makePlanRef(), makeContext(runId));
    const loser = fixture.engine.startRun(makePlanRef(), makeContext(runId));
    const rejected = expect(loser).rejects.toBeInstanceOf(RunAlreadyExistsError);
    try {
      await Promise.race([winnerDispatched.reached, winner, rejected]);
      const before = await captureRunState(fixture, runId);
      releaseLoser.release();
      await rejected;
      const after = await captureRunState(fixture, runId);
      expect(before.intent?.status).toBe('DISPATCHED');
      expect(after).toEqual(before);
    } finally {
      bothAtBootstrap.release();
      releaseLoser.release();
      finishWinner.release();
      await Promise.allSettled([winner, loser, rejected]);
    }
    await winner;
  });

  it.each(['existing', 'bootstrap-collision'] as const)(
    'does not fail a reused recovery through the %s path',
    async (path) => {
      const sourceId = `source-${path}`;
      const targetId = `recovery-${path}`;
      let targetStarts = 0;
      const adapter = makeEstimatedAdapter({
        async startRun(_plan, context) {
          if (context.runId === targetId && ++targetStarts === 2)
            throw new Error('losing recovery dispatch');
          return {
            provider: 'temporal',
            tenantId: context.tenantId,
            namespace: 'default',
            workflowId: `wf-${context.runId}`,
            runId: context.runId,
          };
        },
      });
      const fixture = createWorkflowEngineFixture({ adapter });
      await fixture.engine.startRun(makePlanRef(), makeContext(sourceId));
      await appendLifecycleEvent(fixture, sourceId, 'RunFailed');
      const sourceBefore = await captureRunState(fixture, sourceId);
      const bothPreparing = createBarrier();
      const releaseLoser = createBarrier();
      const winnerDispatched = createBarrier();
      const finishWinner = createBarrier();
      if (path === 'bootstrap-collision') {
        const bootstrap = fixture.store.bootstrapRecoveryRunTx.bind(fixture.store);
        let preparations = 0;
        vi.spyOn(fixture.store, 'bootstrapRecoveryRunTx').mockImplementation(async (...args) => {
          if (++preparations === 1) await bothPreparing.reached;
          else {
            bothPreparing.release();
            await releaseLoser.reached;
          }
          return bootstrap(...args);
        });
      }
      const resolve = fixture.intentStore.markResolved.bind(fixture.intentStore);
      vi.spyOn(fixture.intentStore, 'markResolved').mockImplementation(async (ref) => {
        winnerDispatched.release();
        await finishWinner.reached;
        return resolve(ref);
      });
      const winner = fixture.engine.recoverRun(sourceId, makePlanRef(), makeContext(targetId));
      const loser =
        path === 'bootstrap-collision'
          ? fixture.engine.recoverRun(sourceId, makePlanRef(), makeContext(targetId))
          : null;
      const rejected =
        loser == null ? null : expect(loser).rejects.toThrow('losing recovery dispatch');
      try {
        await Promise.race([
          winnerDispatched.reached,
          winner,
          ...(rejected == null ? [] : [rejected]),
        ]);
        const before = await captureRunState(fixture, targetId, 2);
        releaseLoser.release();
        if (rejected != null) await rejected;
        else
          await expect(
            fixture.engine.recoverRun(sourceId, makePlanRef(), makeContext(targetId))
          ).rejects.toThrow('losing recovery dispatch');
        const after = await captureRunState(fixture, targetId, 2);
        expect(before.intent?.status).toBe('DISPATCHED');
        expect(after).toEqual(before);
        expect(await captureRunState(fixture, sourceId)).toEqual(sourceBefore);
      } finally {
        bothPreparing.release();
        releaseLoser.release();
        finishWinner.release();
        await Promise.allSettled([winner, loser, rejected]);
      }
      await winner;
    }
  );

  it('retains a newly prepared recovery when intent creation fails', async () => {
    const fixture = createWorkflowEngineFixture({ adapter: makeEstimatedAdapter() });
    await fixture.engine.startRun(makePlanRef(), makeContext('intent-source'));
    await appendLifecycleEvent(fixture, 'intent-source', 'RunFailed');
    vi.spyOn(fixture.intentStore, 'createIntent').mockRejectedValueOnce(
      new Error('intent unavailable')
    );
    await expect(
      fixture.engine.recoverRun('intent-source', makePlanRef(), makeContext('intent-child'))
    ).rejects.toThrow('intent unavailable');
    const state = await captureRunState(fixture, 'intent-child', 2);
    expect(state.events.map((event) => event.eventType)).toEqual(['RunQueued']);
    expect(state.metadata?.logicalAttemptId).toBe(2);
    expect(state.intent).toBeNull();
    expect(state.snapshot?.status).toBe('PENDING');
  });

  it('still records the legitimate owner failure after provider reference reconciliation fails', async () => {
    const adapter = makeEstimatedAdapter({
      async startRun(_plan, context) {
        return {
          provider: 'temporal',
          tenantId: context.tenantId,
          namespace: 'default',
          workflowId: `wf-${context.runId}`,
          runId: 'actual-provider-execution',
        };
      },
    });
    const cancel = vi.spyOn(adapter, 'cancelRun');
    const fixture = createWorkflowEngineFixture({ adapter });
    const failure = new Error('owned provider ref persistence failure');
    vi.spyOn(fixture.store, 'saveProviderRef').mockRejectedValueOnce(failure);
    await expect(fixture.engine.startRun(makePlanRef(), makeContext('owned-failure'))).rejects.toBe(
      failure
    );
    const state = await captureRunState(fixture, 'owned-failure');
    expect(state.events.map((event) => event.eventType)).toEqual(['RunQueued', 'RunFailed']);
    expect(state.snapshot?.status).toBe('FAILED');
    expect(cancel).toHaveBeenCalledExactlyOnceWith({
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: 'wf-owned-failure',
      runId: 'actual-provider-execution',
    });
  });
});
