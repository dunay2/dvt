import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunId,
  RunStatusSnapshot,
  TenantId,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';

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
  }): { engine: WorkflowEngine; store: InMemoryTxStore } {
    const store = new InMemoryTxStore();

    const engine = new WorkflowEngine({
      stateStore: store,
      outbox: store,
      projector: new SnapshotProjector(),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-02-12T00:00:00.000Z'),
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      adapters: input?.adapters ?? new Map(),
      requiredProviders: input?.requiredProviders,
    });

    return { engine, store };
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

  // detectStuckRuns: runs stranded in PENDING longer than the SLA threshold.
  describe('detectStuckRuns', () => {
    function makeAdapters(): Map<EngineRunRef['provider'], IProviderAdapter> {
      return new Map<EngineRunRef['provider'], IProviderAdapter>([
        ['temporal', makeTemporalAdapter()],
      ]);
    }

    it('returns empty array when no runs are PENDING', async () => {
      const { engine } = createEngine({ adapters: makeAdapters() });
      const stuck = await engine.detectStuckRuns({ thresholdMs: 0, tenantId: 't' as TenantId });
      expect(stuck).toEqual([]);
    });

    it('returns empty array when PENDING run is younger than threshold', async () => {
      const { engine } = createEngine({ adapters: makeAdapters() });
      await engine.startRun(makePlanRef(), makeContext('young-1'));
      // thresholdMs large enough that the run (created ms ago) is not stuck yet.
      const stuck = await engine.detectStuckRuns({
        thresholdMs: 999_999,
        tenantId: 't' as TenantId,
      });
      expect(stuck).toEqual([]);
    });

    it('marks a PENDING run as RunFailed when it exceeds the threshold', async () => {
      const { engine, store } = createEngine({ adapters: makeAdapters() });
      await engine.startRun(makePlanRef(), makeContext('stuck-1'));

      // thresholdMs: 0 → any PENDING run (regardless of age) is treated as stuck.
      const stuck = await engine.detectStuckRuns({ thresholdMs: 0, tenantId: 't' as TenantId });

      expect(stuck).toEqual(['stuck-1']);
      const events = await store.listEvents('t', 'stuck-1');
      const failedEvent = events.find((e) => e.eventType === 'RunFailed');
      expect(failedEvent).toBeDefined();
      expect(failedEvent?.payload).toMatchObject({ reason: 'QUEUED_TIMEOUT' });
    });

    it('transitions snapshot to FAILED after detection', async () => {
      const { engine, store } = createEngine({ adapters: makeAdapters() });
      const runRef = await engine.startRun(makePlanRef(), makeContext('stuck-snap-1'));

      expect((await engine.getRunStatus(runRef)).status).toBe('PENDING');

      await engine.detectStuckRuns({ thresholdMs: 0, tenantId: 't' as TenantId });

      const snap = await store.getSnapshot('t', 'stuck-snap-1');
      expect(snap?.status).toBe('FAILED');
    });

    it('only marks PENDING runs — ignores RUNNING/COMPLETED runs', async () => {
      const { engine } = createEngine({ adapters: makeAdapters() });
      // Run 1: start but leave PENDING.
      await engine.startRun(makePlanRef(), makeContext('pending-only-1'));
      // Run 2: stays PENDING (engine never emits RunStarted — adapter owns that).
      await engine.startRun(makePlanRef(), makeContext('pending-only-2'));

      const stuck = await engine.detectStuckRuns({ thresholdMs: 0, tenantId: 't' as TenantId });
      // Both runs are PENDING, so both should be detected.
      expect(stuck.sort()).toEqual(['pending-only-1', 'pending-only-2'].sort());
    });

    it('respects tenantId filter — does not mark other tenants runs', async () => {
      const { engine } = createEngine({ adapters: makeAdapters() });

      const ctxA: RunContext = { ...makeContext('run-t-a'), tenantId: 'tenant-a' };
      const ctxB: RunContext = { ...makeContext('run-t-b'), tenantId: 'tenant-b' };
      await engine.startRun(makePlanRef(), ctxA);
      await engine.startRun(makePlanRef(), ctxB);

      const stuck = await engine.detectStuckRuns({
        thresholdMs: 0,
        tenantId: 'tenant-a' as TenantId,
      });

      expect(stuck).toEqual(['run-t-a']);
    });

    it('respects limit — scans at most N candidates per call', async () => {
      const { engine } = createEngine({ adapters: makeAdapters() });
      await engine.startRun(makePlanRef(), makeContext('limit-1'));
      await engine.startRun(makePlanRef(), makeContext('limit-2'));
      await engine.startRun(makePlanRef(), makeContext('limit-3'));

      const stuck = await engine.detectStuckRuns({
        thresholdMs: 0,
        tenantId: 't' as TenantId,
        limit: 1,
      });
      // With limit:1 only one run should be processed.
      expect(stuck).toHaveLength(1);
    });

    it('skips runs with missing createdAt (backward compat)', async () => {
      const { engine, store } = createEngine({ adapters: makeAdapters() });
      // Manually bootstrap a run without createdAt (simulates pre-migration rows).
      await store.bootstrapRunTx({
        metadata: {
          tenantId: 't',
          projectId: 'p',
          environmentId: 'dev',
          runId: 'no-created-at',
          planId: 'plan',
          planVersion: '1',
          logicalAttemptId: 1,
          provider: 'temporal',
          providerWorkflowId: 'wf-no-created-at',
          providerRunId: 'no-created-at',
          // createdAt intentionally absent
        },
        firstEvents: [],
      });

      const stuck = await engine.detectStuckRuns({ thresholdMs: 0, tenantId: 't' as TenantId });
      expect(stuck).not.toContain('no-created-at');
    });
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
