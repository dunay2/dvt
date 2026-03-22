/**
 * @file packages/@dvt/engine/test/core/WorkflowEngine.test.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @baseline ADR-0015: getRunStatus read-model separation
 * @decision Verify engine lifecycle failure modes, observability, idempotency, and boundary validation
 * @consequence Regression coverage for core engine invariants
 * @version 1.0.0
 * @date 2026-03-03
 */
import type { EngineRunRef, PlanRef, RunContext, RunId, RunStatusSnapshot } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import type { IObservability } from '@dvt/observability';
import { describe, expect, it, vi } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { describeUnknownValue, WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunAccessPolicy } from '../../src/security/RunAccessPolicy.js';
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
  const adapter: IProviderAdapter = {
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
  };
  if (overrides) {
    Object.assign(adapter, overrides);
  }
  return adapter;
}

function makeAdapters(
  overrides?: Partial<IProviderAdapter>
): Map<EngineRunRef['provider'], IProviderAdapter> {
  return new Map([['temporal', makeTemporalAdapter(overrides)]]);
}

function makeEstimatedAdapters(): Map<EngineRunRef['provider'], IProviderAdapter> {
  return makeAdapters({
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
}

function makeStoreWithBootstrapFailure(failingRunId: string): InMemoryTxStore {
  const store = new InMemoryTxStore();
  const originalBootstrap = store.bootstrapRunTx.bind(store);
  store.bootstrapRunTx = async (input) => {
    if (input.metadata.runId === failingRunId) {
      throw new Error('bootstrap boom');
    }
    return originalBootstrap(input);
  };
  return store;
}

function makeTrackingObservability(): {
  obs: IObservability;
  counters: string[];
  histograms: string[];
  warns: string[];
} {
  const baseObs = createNoopObservability();
  const counters: string[] = [];
  const histograms: string[] = [];
  const warns: string[] = [];
  const obs: IObservability = {
    ...baseObs,
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
    logs: {
      debug(entry) {
        baseObs.logs.debug(entry);
      },
      info(entry) {
        baseObs.logs.info(entry);
      },
      warn(entry) {
        warns.push(entry.msg);
        baseObs.logs.warn(entry);
      },
      error(entry) {
        baseObs.logs.error(entry);
      },
    },
  };
  return { obs, counters, histograms, warns };
}

function makeWarnFailObservability(): {
  obs: IObservability;
  counters: string[];
  warnAttempts: { count: number };
} {
  const baseObs = createNoopObservability();
  const counters: string[] = [];
  const warnAttempts = { count: 0 };
  const obs: IObservability = {
    ...baseObs,
    metrics: {
      counter(name: string) {
        counters.push(name);
        return { add() {} };
      },
      histogram(name, labels) {
        return baseObs.metrics.histogram(name, labels);
      },
      gauge(name, labels) {
        return baseObs.metrics.gauge(name, labels);
      },
    },
    logs: {
      debug(entry) {
        baseObs.logs.debug(entry);
      },
      info(entry) {
        baseObs.logs.info(entry);
      },
      warn() {
        warnAttempts.count += 1;
        throw new Error('log backend unavailable');
      },
      error(entry) {
        baseObs.logs.error(entry);
      },
    },
  };
  return { obs, counters, warnAttempts };
}

function makeBothSinksFailObservability(): {
  obs: IObservability;
  metricAttempts: { count: number };
  warnAttempts: { count: number };
} {
  const baseObs = createNoopObservability();
  const metricAttempts = { count: 0 };
  const warnAttempts = { count: 0 };
  const obs: IObservability = {
    ...baseObs,
    metrics: {
      counter(name) {
        if (name !== 'dvt.intent.mark_resolved_failed_total') {
          return { add() {} };
        }
        return {
          add() {
            metricAttempts.count += 1;
            throw new Error('metrics backend unavailable');
          },
        };
      },
      histogram(name, labels) {
        return baseObs.metrics.histogram(name, labels);
      },
      gauge(name, labels) {
        return baseObs.metrics.gauge(name, labels);
      },
    },
    logs: {
      debug(entry) {
        baseObs.logs.debug(entry);
      },
      info(entry) {
        baseObs.logs.info(entry);
      },
      warn() {
        warnAttempts.count += 1;
        throw new Error('log backend unavailable');
      },
      error(entry) {
        baseObs.logs.error(entry);
      },
    },
  };
  return { obs, metricAttempts, warnAttempts };
}

function makeCustomObservability(opts: {
  throwOnMetricAddName?: string | null;
  throwOnCounterConstructName?: string | null;
}): { obs: IObservability; warns: string[]; counters: string[] } {
  const baseObs = createNoopObservability();
  const warns: string[] = [];
  const counters: string[] = [];

  const obs: IObservability = {
    ...baseObs,
    metrics: {
      counter(name: string) {
        counters.push(name);
        if (opts.throwOnCounterConstructName && name === opts.throwOnCounterConstructName) {
          throw new Error('metric label validation failed');
        }
        return { add() {} };
      },
      histogram(name, labels) {
        return baseObs.metrics.histogram(name, labels);
      },
      gauge(name, labels) {
        return baseObs.metrics.gauge(name, labels);
      },
    },
    logs: {
      debug(entry) {
        baseObs.logs.debug(entry);
      },
      info(entry) {
        baseObs.logs.info(entry);
      },
      warn(entry) {
        warns.push(entry.msg);
        baseObs.logs.warn(entry);
      },
      error(entry) {
        baseObs.logs.error(entry);
      },
    },
  };

  if (opts.throwOnMetricAddName) {
    const originalCounter = obs.metrics.counter.bind(obs.metrics);
    obs.metrics.counter = (name: string) => {
      const c = originalCounter(name);
      if (name === opts.throwOnMetricAddName) {
        return {
          add() {
            throw new Error('metrics backend unavailable');
          },
        } as any;
      }
      return c;
    };
  }

  return { obs, warns, counters };
}

async function runMarkResolvedFailCase(opts: {
  adapters?: Map<EngineRunRef['provider'], IProviderAdapter>;
  observability: IObservability;
  stateStore?: InMemoryTxStore;
  runId: string;
  expectReject?: boolean;
  useEstimatedAdapters?: boolean;
}): Promise<{ engine: WorkflowEngine; intentStore: InMemoryStartRunIntentStore }> {
  const adapters =
    opts.adapters ?? (opts.useEstimatedAdapters ? makeEstimatedAdapters() : makeAdapters());
  const { engine, intentStore } = createEngine({
    adapters,
    observability: opts.observability,
    stateStore: opts.stateStore,
  });
  vi.spyOn(intentStore, 'markResolved').mockRejectedValueOnce(new Error('resolve boom'));

  if (opts.expectReject) {
    await expect(engine.startRun(makePlanRef(), makeContext(opts.runId))).rejects.toThrow();
  } else {
    await expect(engine.startRun(makePlanRef(), makeContext(opts.runId))).resolves.toEqual(
      expect.objectContaining({ provider: 'temporal', runId: opts.runId })
    );
  }

  return { engine, intentStore };
}

function createEngine(input?: {
  adapters?: Map<EngineRunRef['provider'], IProviderAdapter>;
  requiredProviders?: EngineRunRef['provider'][];
  observability?: IObservability;
  stateStore?: InMemoryTxStore;
}): { engine: WorkflowEngine; store: InMemoryTxStore; intentStore: InMemoryStartRunIntentStore } {
  const store = input?.stateStore ?? new InMemoryTxStore();
  const intentStore = new InMemoryStartRunIntentStore();

  const engine = new WorkflowEngine({
    stateStore: store,
    projector: new SnapshotProjector(),
    idempotency: new IdempotencyKeyBuilder(),
    clock: new SequenceClock('2026-02-12T00:00:00.000Z'),
    policy: new RunAccessPolicy({
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
    }),
    intentStore,
    observability: input?.observability ?? createNoopObservability(),
    adapters: input?.adapters ?? new Map(),
    requiredProviders: input?.requiredProviders,
  });

  return { engine, store, intentStore };
}

// Test helpers to reduce duplication in expectations
function expectMarkResolvedWarnAndMetric(counters: string[], warns: string[]): void {
  expect(counters).toContain('dvt.intent.mark_resolved_failed_total');
  expect(warns).toContain('markResolved failed; leaving intent cleanup to reconciliation worker');
}

function expectMetricAndWarnAttempts(
  metricAttempts: { count: number },
  warnAttempts: { count: number }
): void {
  expect(metricAttempts.count).toBe(1);
  expect(warnAttempts.count).toBe(1);
}

describe('WorkflowEngine (basic failure modes)', () => {
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
    const { obs, counters, histograms } = makeTrackingObservability();
    const { engine } = createEngine({ adapters: makeAdapters(), observability: obs });

    await engine.startRun(makePlanRef(), makeContext('obs-ok-1'));
    expect(counters).toContain('dvt.run.started_total');
    expect(histograms).toContain('dvt.run.start.duration_ms');
  });

  it('emits startRun failure counter via observability', async () => {
    const { obs, counters } = makeTrackingObservability();
    const adapters = makeAdapters({
      async startRun() {
        throw new Error('forced failure');
      },
    });
    const { engine } = createEngine({ adapters, observability: obs });

    await expect(engine.startRun(makePlanRef(), makeContext('obs-fail-1'))).rejects.toThrow(
      /forced failure/
    );
    expect(counters).toContain('dvt.run.start_failed_total');
  });

  it('emits warning and metric when markResolved fails after dispatch', async () => {
    const { obs, counters, warns } = makeTrackingObservability();
    await runMarkResolvedFailCase({
      observability: obs,
      runId: 'obs-resolve-warn-1',
      useEstimatedAdapters: true,
    });

    expectMarkResolvedWarnAndMetric(counters, warns);
  });

  it('emits warning and metric when markResolved fails on legacy bootstrap-success path', async () => {
    const { obs, counters, warns } = makeTrackingObservability();
    await runMarkResolvedFailCase({
      adapters: makeAdapters(),
      observability: obs,
      runId: 'obs-legacy-resolve-warn-1',
    });

    expectMarkResolvedWarnAndMetric(counters, warns);
  });

  it('preserves bootstrap error and emits warning/metric when markResolved also fails on compensation path', async () => {
    const { obs, counters, warns } = makeTrackingObservability();
    const store = makeStoreWithBootstrapFailure('obs-compensation-resolve-warn-1');
    await runMarkResolvedFailCase({
      adapters: makeAdapters(),
      observability: obs,
      stateStore: store,
      runId: 'obs-compensation-resolve-warn-1',
      expectReject: true,
    });

    expectMarkResolvedWarnAndMetric(counters, warns);
  });

  it('keeps startRun non-fatal when observability throws while reporting markResolved failure', async () => {
    const { obs, metricAttempts, warnAttempts } = makeBothSinksFailObservability();
    await runMarkResolvedFailCase({
      adapters: makeAdapters(),
      observability: obs,
      runId: 'obs-telemetry-fail-soft-1',
    });

    expectMetricAndWarnAttempts(metricAttempts, warnAttempts);
  });

  it('emits warning when metric add throws during markResolved failure reporting', async () => {
    const { obs, warns } = makeCustomObservability({
      throwOnMetricAddName: 'dvt.intent.mark_resolved_failed_total',
    });
    await runMarkResolvedFailCase({
      adapters: makeAdapters(),
      observability: obs,
      runId: 'obs-metrics-fail-warn-survives-1',
    });

    expect(warns).toContain('markResolved failed; leaving intent cleanup to reconciliation worker');
  });

  it('keeps metric emission when warn sink throws during markResolved failure reporting', async () => {
    const { obs, counters, warnAttempts } = makeWarnFailObservability();
    await runMarkResolvedFailCase({
      observability: obs,
      adapters: makeAdapters(),
      runId: 'obs-log-fail-counter-survives-1',
    });

    expect(counters).toContain('dvt.intent.mark_resolved_failed_total');
    expect(warnAttempts.count).toBe(1);
  });

  it('keeps metric emission when warn sink throws on dispatch path', async () => {
    const { obs, counters, warnAttempts } = makeWarnFailObservability();
    await runMarkResolvedFailCase({
      observability: obs,
      adapters: makeEstimatedAdapters(),
      runId: 'obs-dispatch-log-fail-counter-survives-1',
    });

    expect(counters).toContain('dvt.intent.mark_resolved_failed_total');
    expect(warnAttempts.count).toBe(1);
  });

  it('preserves bootstrap error and keeps metric emission when warn sink throws on compensation path', async () => {
    const { obs, counters, warnAttempts } = makeWarnFailObservability();
    const store = makeStoreWithBootstrapFailure('obs-compensation-log-fail-counter-survives-1');
    await runMarkResolvedFailCase({
      adapters: makeAdapters(),
      observability: obs,
      stateStore: store,
      runId: 'obs-compensation-log-fail-counter-survives-1',
      expectReject: true,
    });

    expect(counters).toContain('dvt.intent.mark_resolved_failed_total');
    expect(warnAttempts.count).toBe(1);
  });

  it('keeps startRun non-fatal when both metric and warn sinks throw on dispatch path', async () => {
    const { obs, metricAttempts, warnAttempts } = makeBothSinksFailObservability();
    await runMarkResolvedFailCase({
      observability: obs,
      adapters: makeEstimatedAdapters(),
      runId: 'obs-dispatch-both-sinks-fail-soft-1',
    });

    expectMetricAndWarnAttempts(metricAttempts, warnAttempts);
  });

  it('preserves bootstrap error when both metric and warn sinks throw on compensation path', async () => {
    const { obs, metricAttempts, warnAttempts } = makeBothSinksFailObservability();
    const store = makeStoreWithBootstrapFailure('obs-compensation-both-sinks-fail-soft-1');
    await runMarkResolvedFailCase({
      adapters: makeAdapters(),
      observability: obs,
      stateStore: store,
      runId: 'obs-compensation-both-sinks-fail-soft-1',
      expectReject: true,
    });

    expectMetricAndWarnAttempts(metricAttempts, warnAttempts);
  });

  it('keeps startRun non-fatal when both metric and warn sinks throw on legacy path', async () => {
    const { obs, metricAttempts, warnAttempts } = makeBothSinksFailObservability();
    await runMarkResolvedFailCase({
      observability: obs,
      adapters: makeAdapters(),
      runId: 'obs-legacy-both-sinks-fail-soft-1',
    });

    expectMetricAndWarnAttempts(metricAttempts, warnAttempts);
  });

  it('emits warning when counter construction throws during markResolved failure reporting', async () => {
    const { obs, warns } = makeCustomObservability({
      throwOnCounterConstructName: 'dvt.intent.mark_resolved_failed_total',
    });
    await runMarkResolvedFailCase({
      observability: obs,
      adapters: makeEstimatedAdapters(),
      runId: 'obs-counter-construction-fail-warn-survives-1',
    });

    expect(warns).toContain('markResolved failed; leaving intent cleanup to reconciliation worker');
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
    const { engine } = createEngine({ adapters: makeAdapters() });
    await run(engine);
  });

  it('startRun rejects and stores no events when adapter throws before bootstrap', async () => {
    // ADR-0014: Adapter is called first. If it throws, bootstrapRunTx is never called,
    // so no run metadata or events are stored.
    const adapters = makeAdapters({
      async startRun() {
        throw new Error('provider failure');
      },
    });

    const { engine, store } = createEngine({ adapters });

    await expect(engine.startRun(makePlanRef(), makeContext('fail-1'))).rejects.toThrow(
      /provider failure/
    );

    const events = await store.listEvents('t', 'fail-1');
    expect(events).toHaveLength(0);
  });

  it('pre-bootstraps RunQueued before adapter.startRun when estimateRunRef is available', async () => {
    const store = new InMemoryTxStore();
    let sawQueuedEventBeforeStart = false;
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
      async startRun(_planRef, ctx) {
        const events = await store.listEvents(ctx.tenantId, ctx.runId);
        sawQueuedEventBeforeStart = events.some((event) => event.eventType === 'RunQueued');
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
    const engine = new WorkflowEngine({
      stateStore: store,
      projector: new SnapshotProjector(),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-02-12T00:00:00.000Z'),
      policy: new RunAccessPolicy({
        authorizer: new AllowAllAuthorizer(),
        planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      }),
      intentStore,
      observability: createNoopObservability(),
      adapters,
    });

    await engine.startRun(makePlanRef(), makeContext('pre-bootstrap-1'));

    expect(sawQueuedEventBeforeStart).toBe(true);
    const events = await store.listEvents('t', 'pre-bootstrap-1');
    expect(events.map((event) => event.eventType)).toEqual(['RunQueued']);
  });

  it('calls saveProviderRef when startRun returns a different runId than estimateRunRef', async () => {
    const savedRefs: Array<{ runId: string; update: unknown }> = [];
    const store = new InMemoryTxStore();
    const originalSaveProviderRef = store.saveProviderRef.bind(store);
    store.saveProviderRef = async (_tenantId, runId, update) => {
      savedRefs.push({ runId, update });
      return originalSaveProviderRef(_tenantId, runId, update);
    };

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
      async startRun(_planRef, ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: `actual-execution-id-for-${ctx.runId}`,
        } as EngineRunRef;
      },
    });

    const { engine } = createEngine({ adapters, stateStore: store });
    await engine.startRun(makePlanRef(), makeContext('g7-reconcile-1'));

    expect(savedRefs).toHaveLength(1);
    expect(savedRefs[0]).toMatchObject({
      runId: 'g7-reconcile-1',
      update: {
        providerWorkflowId: 'wf-g7-reconcile-1',
        providerRunId: 'actual-execution-id-for-g7-reconcile-1',
      },
    });

    const meta = await store.getRunMetadataByRunId('t', 'g7-reconcile-1');
    expect(meta?.providerRunId).toBe('actual-execution-id-for-g7-reconcile-1');
  });

  it('does not call saveProviderRef when startRun returns the same runId as estimateRunRef', async () => {
    const savedRefs: unknown[] = [];
    const store = new InMemoryTxStore();
    const originalSaveProviderRef = store.saveProviderRef.bind(store);
    store.saveProviderRef = async (_tenantId, runId, update) => {
      savedRefs.push({ runId, update });
      return originalSaveProviderRef(_tenantId, runId, update);
    };

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
      async startRun(_planRef, ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
    });

    const { engine } = createEngine({ adapters, stateStore: store });
    await engine.startRun(makePlanRef(), makeContext('g7-same-id-1'));

    expect(savedRefs).toHaveLength(0);
  });

  it('continues startRun when saveProviderRef fails (fail-soft)', async () => {
    const store = new InMemoryTxStore();
    store.saveProviderRef = async () => {
      throw new Error('metadata update failed');
    };

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
      async startRun(_planRef, ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: `actual-execution-id-for-${ctx.runId}`,
        } as EngineRunRef;
      },
    });

    const { engine } = createEngine({ adapters, stateStore: store });
    await expect(
      engine.startRun(makePlanRef(), makeContext('g7-fail-soft-1'))
    ).resolves.toBeDefined();
  });

  it('keeps a pre-bootstrapped run pending when adapter.startRun fails before dispatch', async () => {
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
      async startRun() {
        throw new Error('provider failure after bootstrap');
      },
    });

    const { engine, store, intentStore } = createEngine({ adapters });

    await expect(
      engine.startRun(makePlanRef(), makeContext('fail-after-bootstrap-1'))
    ).rejects.toThrow(/provider failure after bootstrap/);

    const events = await store.listEvents('t', 'fail-after-bootstrap-1');
    expect(events.map((event) => event.eventType)).toEqual(['RunQueued']);

    const orphaned = await intentStore.listOrphaned(0, Date.now());
    expect(orphaned).toHaveLength(1);
    expect(orphaned[0]?.status).toBe('PENDING');
  });

  it('keeps a pre-bootstrapped run pending when markDispatched fails after provider start', async () => {
    const store = new InMemoryTxStore();
    const intentStore = new InMemoryStartRunIntentStore();
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
    vi.spyOn(intentStore, 'markDispatched').mockRejectedValueOnce(new Error('dispatch boom'));

    const engine = new WorkflowEngine({
      stateStore: store,
      projector: new SnapshotProjector(),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-02-12T00:00:00.000Z'),
      policy: new RunAccessPolicy({
        authorizer: new AllowAllAuthorizer(),
        planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      }),
      intentStore,
      observability: createNoopObservability(),
      adapters,
    });

    await expect(engine.startRun(makePlanRef(), makeContext('dispatch-fail-1'))).rejects.toThrow(
      /dispatch boom/
    );

    const events = await store.listEvents('t', 'dispatch-fail-1');
    expect(events.map((event) => event.eventType)).toEqual(['RunQueued']);

    const orphaned = await intentStore.listOrphaned(0, Date.now());
    expect(orphaned).toHaveLength(1);
    expect(orphaned[0]?.status).toBe('PENDING');
  });

  // ADR-0015: getRunStatus must not call the adapter under any circumstances.
  it('getRunStatus returns projected state without calling the adapter', async () => {
    let adapterCalled = false;
    const adapters = makeAdapters({
      async getRunStatus() {
        adapterCalled = true;
        return { runId: 'x', status: 'RUNNING' } as RunStatusSnapshot;
      },
    });

    const { engine } = createEngine({ adapters });
    const runRef = await engine.startRun(makePlanRef(), makeContext('status-pure-1'));
    const snapshot = await engine.getRunStatus(runRef);

    expect(adapterCalled).toBe(false);
    expect(snapshot.runId).toBe('status-pure-1');
    expect(snapshot.status).toBe('PENDING');
  });

  it('enrichRunStatus calls adapter and merges substatus onto projected base', async () => {
    const adapters = makeAdapters({
      async getRunStatus(runRef) {
        return {
          runId: runRef.runId,
          status: 'RUNNING',
          substatus: 'DRAINING',
          message: 'graceful shutdown in progress',
        } as RunStatusSnapshot;
      },
    });

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
    const adapters = makeAdapters({
      async getRunStatus() {
        throw new Error('provider unavailable');
      },
    });

    const { engine } = createEngine({ adapters });
    const runRef = await engine.startRun(makePlanRef(), makeContext('enrich-err-1'));

    await expect(engine.enrichRunStatus(runRef)).rejects.toThrow(/provider unavailable/);
  });

  it('healthCheck reports degraded when an adapter ping fails', async () => {
    const adapters = makeAdapters({
      async ping() {
        throw new Error('ping failed');
      },
    });

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
      const { engine, store } = createEngine({ adapters: makeAdapters() });
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
      const { engine, store } = createEngine({ adapters: makeAdapters() });
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
      const { engine, store } = createEngine({ adapters: makeAdapters() });
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

describe('describeUnknownValue helper', () => {
  it('returns Error.message for Error inputs', () => {
    expect(describeUnknownValue(new Error('boom'))).toBe('boom');
  });

  it('returns strings as-is and numbers as strings', () => {
    expect(describeUnknownValue('hello')).toBe('hello');
    expect(describeUnknownValue(123)).toBe('123');
  });

  it('serializes plain objects to JSON or falls back to tag for circular', () => {
    expect(describeUnknownValue({ a: 1 })).toBe(JSON.stringify({ a: 1 }));

    const a: any = {};
    a.self = a; // circular
    const out = describeUnknownValue(a);
    expect(typeof out).toBe('string');
    expect(out.startsWith('[object') || out.includes('circular') || out.includes('self')).toBe(
      true
    );
  });
});
