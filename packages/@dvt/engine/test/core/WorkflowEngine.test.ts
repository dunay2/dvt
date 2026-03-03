import type { EngineRunRef, PlanRef, RunContext, RunId, RunStatusSnapshot } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import type { IObservability } from '@dvt/observability';
import { describe, expect, it } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';

type StoreEventInput = Parameters<InMemoryTxStore['appendAndEnqueueTx']>[1][number];

function makeRunEventInput(args: {
  runId: string;
  eventId: string;
  idempotencyKey: string;
  eventType?: 'RunQueued' | 'RunFailed' | 'RunStarted';
}): {
  eventId: string;
  eventType: 'RunQueued' | 'RunFailed' | 'RunStarted';
  runId: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  logicalAttemptId: number;
  engineAttemptId: number;
  emittedAt: string;
  idempotencyKey: string;
} {
  return {
    eventId: args.eventId,
    eventType: args.eventType ?? 'RunQueued',
    runId: args.runId,
    tenantId: 't',
    projectId: 'p',
    environmentId: 'dev',
    planId: 'plan-1',
    planVersion: '1',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-02-12T00:00:00.000Z',
    idempotencyKey: args.idempotencyKey,
  };
}

describe('WorkflowEngine (basic failure modes)', () => {
  function makePlanRef(): PlanRef {
    return {
      uri: 'https://example.com/plan',
      sha256: 'deadbeef',
      schemaVersion: 'v1.1',
      planId: 'p',
      planVersion: '1.0',
    };
  }

  function makeContext(runId = 'r1'): RunContext {
    return {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      runId,
      targetAdapter: 'temporal',
    };
  }

  function makeTemporalAdapter(overrides?: Partial<IProviderAdapter>): IProviderAdapter {
    return {
      provider: 'temporal',
      async startRun(_planRef: PlanRef, ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
      async cancelRun() {},
      async getRunStatus(runRef) {
        return { runId: runRef.runId, status: 'RUNNING' } as RunStatusSnapshot;
      },
      async signal() {},
      ...(overrides ?? {}),
    };
  }

  function createEngine(input?: {
    adapters?: Map<EngineRunRef['provider'], IProviderAdapter>;
    requiredProviders?: EngineRunRef['provider'][];
    observability?: IObservability;
  }): { engine: WorkflowEngine; store: InMemoryTxStore; intentStore: InMemoryStartRunIntentStore } {
    const store = new InMemoryTxStore();
    const intentStore = new InMemoryStartRunIntentStore();

    const engine = new WorkflowEngine({
      stateStore: store,
      outbox: store,
      projector: new SnapshotProjector(),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-02-12T00:00:00.000Z'),
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      intentStore,
      observability: input?.observability ?? createNoopObservability(),
      adapters: input?.adapters ?? new Map(),
      requiredProviders: input?.requiredProviders,
    });

    return { engine, store, intentStore };
  }

  it('startRun fails when no adapter registered for provider', async () => {
    const { engine } = createEngine();

    await expect(engine.startRun(makePlanRef(), makeContext())).rejects.toThrow(
      /No adapter registered for provider/
    );
  });

  it('cancelRun throws when run metadata missing', async () => {
    const { engine } = createEngine();

    await expect(
      engine.cancelRun({
        provider: 'temporal',
        tenantId: 't',
        namespace: 'n',
        workflowId: 'w',
        runId: 'missing',
      } as any)
    ).rejects.toThrow(/Run metadata not found/);
  });

  it('startRun rejects invalid runtime boundary payloads', async () => {
    const { engine } = createEngine();

    const invalidPlanRef = {
      uri: '',
      sha256: 'deadbeef',
      schemaVersion: 'v1.1',
      planId: 'p',
      planVersion: '1.0',
    } as any;

    const validContext = {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      runId: 'r',
      targetAdapter: 'temporal',
    } as any;

    await expect(engine.startRun(invalidPlanRef, validContext)).rejects.toThrow(
      /Validation failed/
    );

    const invalidContext = {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      runId: 'r',
      targetAdapter: 'unknown-provider',
    } as any;

    await expect(engine.startRun(makePlanRef(), invalidContext)).rejects.toThrow(
      /Validation failed/
    );
  });

  it('signal rejects invalid runtime boundary payloads', async () => {
    const { engine } = createEngine();

    const runRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'n',
      workflowId: 'w',
      runId: 'missing',
    } as any;

    const badSignal = {
      signalId: 's1',
      type: 'INVALID_SIGNAL',
    } as any;

    await expect(engine.signal(runRef, badSignal)).rejects.toThrow(/Validation failed/);
  });

  it('emits startRun success metrics via observability', async () => {
    const counters: string[] = [];
    const histograms: string[] = [];
    const obs: IObservability = {
      ...createNoopObservability(),
      metrics: {
        counter(name: string) {
          counters.push(name);
          return { add: () => {} };
        },
        histogram(name: string) {
          histograms.push(name);
          return { record: () => {} };
        },
        gauge() {
          return { set: () => {} };
        },
      },
    };
    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      ['temporal', makeTemporalAdapter()],
    ]);
    const { engine } = createEngine({ adapters, observability: obs });

    await engine.startRun(makePlanRef(), makeContext('obs-ok-1'));
    expect(counters).toContain('dvt.run.started_total');
    expect(histograms).toContain('dvt.run.start.duration_ms');
  });

  it('emits startRun failure counter via observability', async () => {
    const counters: string[] = [];
    const obs: IObservability = {
      ...createNoopObservability(),
      metrics: {
        counter(name: string) {
          counters.push(name);
          return { add: () => {} };
        },
        histogram() {
          return { record: () => {} };
        },
        gauge() {
          return { set: () => {} };
        },
      },
    };
    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      [
        'temporal',
        makeTemporalAdapter({
          async startRun() {
            throw new Error('forced failure');
          },
        }),
      ],
    ]);
    const { engine } = createEngine({ adapters, observability: obs });

    await expect(engine.startRun(makePlanRef(), makeContext('obs-fail-1'))).rejects.toThrow(
      /forced failure/
    );
    expect(counters).toContain('dvt.run.start_failed_total');
  });

  it('constructor validates requiredProviders', () => {
    expect(() =>
      createEngine({
        requiredProviders: ['temporal'],
      })
    ).toThrow(/No adapter registered for provider: temporal/);
  });

  it.each([
    {
      name: 'invalid runId format',
      run: async (engine: WorkflowEngine): Promise<void> => {
        await expect(engine.startRun(makePlanRef(), makeContext('bad run id'))).rejects.toThrow(
          /Invalid runId format/
        );
      },
    },
    {
      name: 'duplicate runId',
      run: async (engine: WorkflowEngine): Promise<void> => {
        await engine.startRun(makePlanRef(), makeContext('dup-1'));
        await expect(engine.startRun(makePlanRef(), makeContext('dup-1'))).rejects.toThrow(
          /already exists/
        );
      },
    },
  ])('startRun rejects $name', async ({ run }) => {
    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      ['temporal', makeTemporalAdapter()],
    ]);
    const { engine } = createEngine({ adapters });
    await run(engine);
  });

  it('startRun rejects and stores no events when adapter throws before bootstrap', async () => {
    // ADR-0014: Adapter is called first. If it throws, bootstrapRunTx is never called,
    // so no run metadata or events are stored.
    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      [
        'temporal',
        makeTemporalAdapter({
          async startRun() {
            throw new Error('provider failure');
          },
        }),
      ],
    ]);

    const { engine, store } = createEngine({ adapters });

    await expect(engine.startRun(makePlanRef(), makeContext('fail-1'))).rejects.toThrow(
      /provider failure/
    );

    const events = await store.listEvents('t', 'fail-1');
    expect(events).toHaveLength(0);
  });

  // ADR-0015: getRunStatus must not call the adapter under any circumstances.
  it('getRunStatus returns projected state without calling the adapter', async () => {
    let adapterCalled = false;
    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      [
        'temporal',
        makeTemporalAdapter({
          async getRunStatus() {
            adapterCalled = true;
            return { runId: 'x', status: 'RUNNING' } as RunStatusSnapshot;
          },
        }),
      ],
    ]);

    const { engine } = createEngine({ adapters });
    const runRef = await engine.startRun(makePlanRef(), makeContext('status-pure-1'));
    const snapshot = await engine.getRunStatus(runRef);

    expect(adapterCalled).toBe(false);
    expect(snapshot.runId).toBe('status-pure-1');
    expect(snapshot.status).toBe('PENDING');
  });

  it('enrichRunStatus calls adapter and merges substatus onto projected base', async () => {
    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      [
        'temporal',
        makeTemporalAdapter({
          async getRunStatus(runRef) {
            return {
              runId: runRef.runId,
              status: 'RUNNING',
              substatus: 'DRAINING',
              message: 'graceful shutdown in progress',
            } as RunStatusSnapshot;
          },
        }),
      ],
    ]);

    const { engine } = createEngine({ adapters });
    const runRef = await engine.startRun(makePlanRef(), makeContext('enrich-1'));
    const enriched = await engine.enrichRunStatus(runRef);

    expect(enriched.runId).toBe('enrich-1');
    // Base status comes from event log (PENDING after RunQueued).
    expect(enriched.status).toBe('PENDING');
    // Adapter-provided enrichment is merged on top.
    expect(enriched.substatus).toBe('DRAINING');
    expect(enriched.message).toBe('graceful shutdown in progress');
  });

  it('enrichRunStatus throws when adapter call fails (no silent swallow)', async () => {
    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      [
        'temporal',
        makeTemporalAdapter({
          async getRunStatus() {
            throw new Error('provider unavailable');
          },
        }),
      ],
    ]);

    const { engine } = createEngine({ adapters });
    const runRef = await engine.startRun(makePlanRef(), makeContext('enrich-err-1'));

    await expect(engine.enrichRunStatus(runRef)).rejects.toThrow(/provider unavailable/);
  });

  it('healthCheck reports degraded when an adapter ping fails', async () => {
    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      [
        'temporal',
        makeTemporalAdapter({
          async ping() {
            throw new Error('ping failed');
          },
        }),
      ],
    ]);

    const { engine } = createEngine({ adapters });
    const health = await engine.healthCheck();

    expect(health.status).toBe('degraded');
    expect(health.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'adapter-temporal',
          status: 'down',
        }),
      ])
    );
  });

  describe('A2 appendAndEnqueueTx / AppendResult', () => {
    it('returns appended + deduped and preserves runSeq monotonicity', async () => {
      const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
        ['temporal', makeTemporalAdapter()],
      ]);
      const { engine, store } = createEngine({ adapters });
      await engine.startRun(makePlanRef(), makeContext('a2-run-1'));

      const runId = 'a2-run-1' as RunId;

      const first = await store.appendAndEnqueueTx(runId, [
        makeRunEventInput({ runId: 'a2-run-1', eventId: 'evt-1', idempotencyKey: 'k-1' }),
      ]);
      expect(first.appended).toHaveLength(1);
      expect(first.deduped).toHaveLength(0);
      expect(first.lastSeq).toBe(2);

      const second = await store.appendAndEnqueueTx(runId, [
        // duplicate by idempotencyKey -> deduped
        makeRunEventInput({ runId: 'a2-run-1', eventId: 'evt-1b', idempotencyKey: 'k-1' }),
        // new event -> appended
        makeRunEventInput({ runId: 'a2-run-1', eventId: 'evt-2', idempotencyKey: 'k-2' }),
      ]);

      expect(second.appended).toHaveLength(1);
      expect(second.deduped).toHaveLength(1);
      expect(second.lastSeq).toBe(3);
      expect(second.deduped[0]?.idempotencyKey).toBe('k-1');
      expect(second.appended[0]?.idempotencyKey).toBe('k-2');

      const all = await store.listEvents('t', runId);
      const seqs = all.map((e) => e.runSeq);
      expect(seqs).toEqual([1, 2, 3]);
    });

    it('rejects write-shape inputs that preassign runSeq/persistedAt', async () => {
      const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
        ['temporal', makeTemporalAdapter()],
      ]);
      const { engine, store } = createEngine({ adapters });
      await engine.startRun(makePlanRef(), makeContext('a2-run-shape-1'));

      const runId = 'a2-run-shape-1' as RunId;

      const invalidWithRunSeq = {
        ...makeRunEventInput({
          runId: 'a2-run-shape-1',
          eventId: 'evt-shape-runseq',
          eventType: 'RunStarted',
          idempotencyKey: 'a2-shape-runseq',
        }),
        runSeq: 99,
      } as unknown as StoreEventInput;

      await expect(store.appendAndEnqueueTx(runId, [invalidWithRunSeq])).rejects.toThrow(
        /INVALID_EVENT_WRITE_SHAPE: runSeq forbidden/
      );

      const invalidWithPersistedAt = {
        ...makeRunEventInput({
          runId: 'a2-run-shape-1',
          eventId: 'evt-shape-persisted',
          eventType: 'RunStarted',
          idempotencyKey: 'a2-shape-persisted',
        }),
        persistedAt: '2026-02-12T00:00:01.000Z',
      } as unknown as StoreEventInput;

      await expect(store.appendAndEnqueueTx(runId, [invalidWithPersistedAt])).rejects.toThrow(
        /INVALID_EVENT_WRITE_SHAPE: persistedAt forbidden/
      );
    });
  });

  describe('A4 gatewayDecisions persistence', () => {
    it('reconstructs gatewayDecisions from persisted StepCompleted payloads', async () => {
      const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
        ['temporal', makeTemporalAdapter()],
      ]);
      const { engine, store } = createEngine({ adapters });
      await engine.startRun(makePlanRef(), makeContext('a4-run-1'));

      const runId = 'a4-run-1' as RunId;

      await store.appendAndEnqueueTx(runId, [
        {
          eventId: 'evt-gw-start-1',
          eventType: 'StepStarted',
          stepId: 'gw-1',
          runId: 'a4-run-1',
          tenantId: 't',
          projectId: 'p',
          environmentId: 'dev',
          planId: 'plan-1',
          planVersion: '1',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-02-12T00:00:00.000Z',
          idempotencyKey: 'a4-gw-start-1',
        },
        {
          eventId: 'evt-gw-complete-1',
          eventType: 'StepCompleted',
          stepId: 'gw-1',
          runId: 'a4-run-1',
          tenantId: 't',
          projectId: 'p',
          environmentId: 'dev',
          planId: 'plan-1',
          planVersion: '1',
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-02-12T00:00:01.000Z',
          idempotencyKey: 'a4-gw-complete-1',
          payload: { gatewayDecision: true },
        },
      ]);

      const snap = await store.getSnapshot('t', runId);
      expect(snap).not.toBeNull();
      expect(snap?.gatewayDecisions).toEqual({ 'gw-1': true });
      expect(snap?.gatewayDecisions?.['gw-1']).toBe(true);
    });
  });
});
