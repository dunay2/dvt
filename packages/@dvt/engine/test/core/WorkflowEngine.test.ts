import type { EngineRunRef, PlanRef, RunContext, RunStatusSnapshot } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';

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

    const events = await store.listEvents('fail-1');
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
});
