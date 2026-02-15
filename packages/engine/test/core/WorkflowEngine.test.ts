import type { EngineRunRef, PlanRef, RunContext } from '@dvt/contracts';
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
    } as any;
  }

  function makeContext(runId = 'r1'): RunContext {
    return {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      runId,
      targetAdapter: 'temporal',
    } as any;
  }

  function makeTemporalAdapter(overrides?: Partial<IProviderAdapter>): IProviderAdapter {
    return {
      provider: 'temporal',
      async startRun(_planRef, ctx) {
        return {
          provider: 'temporal',
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
      async cancelRun() {},
      async getRunStatus(runRef) {
        return { runId: runRef.runId, status: 'RUNNING' } as any;
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
      planIntegrity: {
        async fetchAndValidate() {
          return new Uint8Array();
        },
      } as any,
      planFetcher: {
        async fetch() {
          return new Uint8Array();
        },
      } as any,
      adapters: input?.adapters ?? new Map(),
      requiredProviders: input?.requiredProviders,
    } as any);

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
    ).toThrow(/No adapter registered for required provider: temporal/);
  });

  it.each([
    {
      name: 'invalid runId format',
      run: async (engine: WorkflowEngine) => {
        await expect(engine.startRun(makePlanRef(), makeContext('bad run id'))).rejects.toThrow(
          /Invalid runId format/
        );
      },
    },
    {
      name: 'duplicate runId',
      run: async (engine: WorkflowEngine) => {
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

  it('startRun emits RunFailed when adapter start throws', async () => {
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
    expect(events.some((event) => event.eventType === 'RunFailed')).toBe(true);
  });

  it('getRunStatus falls back to projected snapshot when adapter status fails', async () => {
    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      [
        'temporal',
        makeTemporalAdapter({
          async getRunStatus() {
            throw new Error('status unavailable');
          },
        }),
      ],
    ]);

    const { engine } = createEngine({ adapters });

    const runRef = await engine.startRun(makePlanRef(), makeContext('status-fallback-1'));
    const snapshot = await engine.getRunStatus(runRef);

    expect(snapshot.runId).toBe('status-fallback-1');
    expect(snapshot.status).toBe('RUNNING');
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
