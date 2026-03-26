import { createNoopObservability } from '@dvt/observability';
import type { IObservability } from '@dvt/observability';
import { it, expect, vi } from 'vitest';

import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';

import {
  makePlanRef,
  makeContext,
  makeAdapters,
  makeTrackingObservability,
  makeObservabilityCollector,
  createEngine,
} from './WorkflowEngine.helpers';

type CollectorReturn = ReturnType<typeof makeObservabilityCollector>;
type EngineReturn = ReturnType<typeof createEngine>;
type AdaptersReturn = ReturnType<typeof makeAdapters>;

function setupMarkResolvedFailTest(opts?: {
  collectorOverrides?: Parameters<typeof makeObservabilityCollector>[0];
  adapterOverrides?: Parameters<typeof makeAdapters>[0];
  failOnce?: boolean;
  runId?: string;
}): Pick<CollectorReturn, 'obs' | 'warns' | 'metricCalls' | 'warnEntries'> & {
  adapters: AdaptersReturn;
  engine: EngineReturn['engine'];
  intentStore: EngineReturn['intentStore'];
} {
  const { obs, warns, metricCalls, warnEntries } = makeObservabilityCollector(
    opts?.collectorOverrides
  );
  const adapters = makeAdapters(opts?.adapterOverrides);
  const { engine, intentStore } = createEngine({ adapters, observability: obs });
  if (opts?.failOnce) {
    vi.spyOn(intentStore, 'markResolved').mockRejectedValueOnce(new Error('resolve boom'));
  } else {
    vi.spyOn(intentStore, 'markResolved').mockRejectedValue(new Error('resolve boom'));
  }
  return { obs, warns, metricCalls, warnEntries, adapters, engine, intentStore };
}

function startEngineWithFailingMarkResolved(opts?: { once?: boolean }): {
  engine: EngineReturn['engine'];
  intentStore: EngineReturn['intentStore'];
  obs: CollectorReturn['obs'];
  warns: CollectorReturn['warns'];
  metricCalls: CollectorReturn['metricCalls'];
  warnEntries: CollectorReturn['warnEntries'];
} {
  const { obs, warns, metricCalls, warnEntries } = makeObservabilityCollector();
  const adapters = makeAdapters();
  const { engine, intentStore } = createEngine({ adapters, observability: obs });
  if (opts?.once) {
    vi.spyOn(intentStore, 'markResolved').mockRejectedValueOnce(new Error('resolve boom'));
  } else {
    vi.spyOn(intentStore, 'markResolved').mockRejectedValue(new Error('resolve boom'));
  }
  return { engine, intentStore, obs, warns, metricCalls, warnEntries } as const;
}

/* Observability-focused tests moved from WorkflowEngine.test.ts to improve Code Health */

it('emits warning and metric when markResolved fails after dispatch', async () => {
  const { obs, counters, warns } = makeTrackingObservability();
  const adapters = makeAdapters({
    estimateRunRef(ctx) {
      return {
        provider: 'temporal',
        tenantId: ctx.tenantId,
        namespace: 'default',
        workflowId: `wf-${ctx.runId}`,
        runId: ctx.runId,
      };
    },
  });
  const { engine, intentStore } = createEngine({ adapters, observability: obs });
  vi.spyOn(intentStore, 'markResolved').mockRejectedValueOnce(new Error('intent resolve boom'));

  await expect(engine.startRun(makePlanRef(), makeContext('obs-resolve-warn-1'))).resolves.toEqual(
    expect.objectContaining({
      provider: 'temporal',
      runId: 'obs-resolve-warn-1',
    })
  );

  expect(counters).toContain('dvt.intent.mark_resolved_failed_total');
  expect(warns).toContain('markResolved failed; leaving intent cleanup to reconciliation worker');
});

it('emits warning and metric when markResolved fails on no-estimate bootstrap-success path', async () => {
  const { obs, counters, warns } = makeTrackingObservability();
  const adapters = makeAdapters();
  const { engine, intentStore } = createEngine({ adapters, observability: obs });
  vi.spyOn(intentStore, 'markResolved').mockRejectedValueOnce(
    new Error('no-estimate resolve boom')
  );

  await expect(
    engine.startRun(makePlanRef(), makeContext('obs-no-estimate-resolve-warn-1'))
  ).resolves.toEqual(
    expect.objectContaining({
      provider: 'temporal',
      runId: 'obs-no-estimate-resolve-warn-1',
    })
  );

  expect(counters).toContain('dvt.intent.mark_resolved_failed_total');
  expect(warns).toContain('markResolved failed; leaving intent cleanup to reconciliation worker');
});

it('preserves bootstrap error and emits warning/metric when markResolved also fails on compensation path', async () => {
  const { obs, counters, warns } = makeTrackingObservability();
  const adapters = makeAdapters();
  const store = new InMemoryTxStore();
  const originalBootstrap = store.bootstrapRunTx.bind(store);
  store.bootstrapRunTx = async (input) => {
    if (input.metadata.runId === 'obs-compensation-resolve-warn-1') {
      throw new Error('bootstrap boom');
    }
    return originalBootstrap(input);
  };

  const { engine, intentStore } = createEngine({
    adapters,
    observability: obs,
    stateStore: store,
  });
  vi.spyOn(intentStore, 'markResolved').mockRejectedValueOnce(
    new Error('compensation resolve boom')
  );

  await expect(
    engine.startRun(makePlanRef(), makeContext('obs-compensation-resolve-warn-1'))
  ).rejects.toThrow(/bootstrap boom/);

  expect(counters).toContain('dvt.intent.mark_resolved_failed_total');
  expect(warns).toContain('markResolved failed; leaving intent cleanup to reconciliation worker');
});

it('keeps startRun non-fatal when observability throws while reporting markResolved failure', async () => {
  const { engine } = setupMarkResolvedFailTest({
    collectorOverrides: undefined,
    adapterOverrides: undefined,
    failOnce: true,
  });

  await expect(
    engine.startRun(makePlanRef(), makeContext('obs-telemetry-fail-soft-1'))
  ).resolves.toEqual(
    expect.objectContaining({ provider: 'temporal', runId: 'obs-telemetry-fail-soft-1' })
  );
});

it('still emits warning when metric reporting fails for markResolved failure', async () => {
  const { engine, warns } = setupMarkResolvedFailTest({
    collectorOverrides: {
      counter(name: string, labels?: Record<string, string>) {
        if (name !== 'dvt.intent.mark_resolved_failed_total') return { add(value?: number) {} };
        return {
          add(value?: number) {
            throw new Error('metrics backend unavailable');
          },
        };
      },
    },
    failOnce: true,
  });

  await expect(
    engine.startRun(makePlanRef(), makeContext('obs-metrics-fail-warn-still-emits-1'))
  ).resolves.toEqual(
    expect.objectContaining({ provider: 'temporal', runId: 'obs-metrics-fail-warn-still-emits-1' })
  );

  expect(warns).toContain('markResolved failed; leaving intent cleanup to reconciliation worker');
});

it('still emits warning with semantic attributes when metrics counter creation fails', async () => {
  const runId = 'obs-counter-create-fail-warn-still-emits-1';
  const { engine, warnEntries, metricCalls } = setupMarkResolvedFailTest({
    collectorOverrides: {
      counter(name: string, labels?: Record<string, string>) {
        if (name === 'dvt.intent.mark_resolved_failed_total') {
          throw new Error('counter creation unavailable');
        }
        return { add(value?: number) {} };
      },
    },
    failOnce: true,
  });

  await expect(engine.startRun(makePlanRef(), makeContext(runId))).resolves.toEqual(
    expect.objectContaining({ provider: 'temporal', runId })
  );

  const warning = warnEntries.find(
    (entry) => entry.msg === 'markResolved failed; leaving intent cleanup to reconciliation worker'
  );
  expect(warning).toBeDefined();
  expect(warning?.attributes).toEqual(
    expect.objectContaining({
      runId,
      tenantId: 't',
      provider: 'temporal',
      intentId: expect.any(String),
      error: 'resolve boom',
    })
  );
  expect(metricCalls).toHaveLength(0);
});

it('keeps startRun non-fatal when both metric and warning sinks throw on markResolved failure', async () => {
  const { engine } = setupMarkResolvedFailTest({
    collectorOverrides: {
      counter(name: string, labels?: Record<string, string>) {
        if (name === 'dvt.intent.mark_resolved_failed_total') {
          throw new Error('counter unavailable');
        }
        return { add(value?: number) {} };
      },
      warn(entry?: unknown) {
        throw new Error('warn unavailable');
      },
    },
    failOnce: true,
  });

  await expect(
    engine.startRun(makePlanRef(), makeContext('obs-both-sinks-fail-soft-1'))
  ).resolves.toEqual(
    expect.objectContaining({ provider: 'temporal', runId: 'obs-both-sinks-fail-soft-1' })
  );
});

it('emits one warning per failed markResolved under concurrent starts', async () => {
  const { engine, warns } = startEngineWithFailingMarkResolved();

  await Promise.all([
    engine.startRun(makePlanRef(), makeContext('obs-concurrent-1')),
    engine.startRun(makePlanRef(), makeContext('obs-concurrent-2')),
  ]);

  const warningMsg = 'markResolved failed; leaving intent cleanup to reconciliation worker';
  expect(warns.filter((msg) => msg === warningMsg)).toHaveLength(2);
});

it('records expected metric labels when markResolved fails', async () => {
  const { engine, metricCalls } = startEngineWithFailingMarkResolved({ once: true });

  await expect(
    engine.startRun(makePlanRef(), makeContext('obs-metric-labels-on-resolve-fail-1'))
  ).resolves.toEqual(
    expect.objectContaining({
      provider: 'temporal',
      runId: 'obs-metric-labels-on-resolve-fail-1',
    })
  );

  expect(metricCalls).toContainEqual(
    expect.objectContaining({
      name: 'dvt.intent.mark_resolved_failed_total',
      labels: expect.objectContaining({
        tenantId: 't',
        provider: 'temporal',
        operation: 'markResolved',
      }),
      value: 1,
    })
  );
  const markResolvedMetricCalls = metricCalls.filter(
    (call) => call.name === 'dvt.intent.mark_resolved_failed_total'
  );
  expect(markResolvedMetricCalls).toHaveLength(1);
});

it('emits one warning per failed markResolved under burst concurrency', async () => {
  const { engine, warns } = startEngineWithFailingMarkResolved();

  const runIds = Array.from({ length: 5 }, (_, idx) => `obs-concurrent-burst-${idx + 1}`);
  await Promise.all(runIds.map((runId) => engine.startRun(makePlanRef(), makeContext(runId))));

  const warningMsg = 'markResolved failed; leaving intent cleanup to reconciliation worker';
  expect(warns.filter((msg) => msg === warningMsg)).toHaveLength(runIds.length);
});

it('emits warning with stable payload shape on markResolved failure', async () => {
  const runId = 'obs-warning-payload-shape-1';
  const { engine, warnEntries } = startEngineWithFailingMarkResolved({ once: true });

  await expect(engine.startRun(makePlanRef(), makeContext(runId))).resolves.toEqual(
    expect.objectContaining({
      provider: 'temporal',
      runId,
    })
  );

  const warning = warnEntries.find(
    (entry) => entry.msg === 'markResolved failed; leaving intent cleanup to reconciliation worker'
  );
  expect(warning).toBeDefined();
  expect(warning).toEqual(
    expect.objectContaining({
      msg: 'markResolved failed; leaving intent cleanup to reconciliation worker',
      context: expect.objectContaining({
        adapter: 'temporal',
        environmentId: 'dev',
        planId: 'p',
        projectId: 'p',
        runId,
        tenantId: 't',
      }),
      attributes: expect.objectContaining({
        intentId: expect.any(String),
        tenantId: 't',
        runId,
        provider: 'temporal',
        error: 'resolve boom',
      }),
    })
  );
});

it('attempts metric emission before warning emission when markResolved fails', async () => {
  const calls: string[] = [];
  const { obs } = makeObservabilityCollector({
    counter(name: string, labels?: Record<string, string>) {
      if (name === 'dvt.intent.mark_resolved_failed_total') {
        calls.push('metric.counter');
      }
      return {
        add(value?: number) {
          calls.push('metric.add');
        },
      };
    },
    warn() {
      calls.push('log.warn');
    },
  });

  const adapters = makeAdapters();
  const { engine, intentStore } = createEngine({ adapters, observability: obs });
  vi.spyOn(intentStore, 'markResolved').mockRejectedValueOnce(new Error('resolve boom'));

  await expect(
    engine.startRun(makePlanRef(), makeContext('obs-order-metric-before-warning-1'))
  ).resolves.toEqual(
    expect.objectContaining({
      provider: 'temporal',
      runId: 'obs-order-metric-before-warning-1',
    })
  );

  expect(calls).toEqual(expect.arrayContaining(['metric.counter', 'metric.add', 'log.warn']));
  expect(calls.indexOf('metric.add')).toBeGreaterThanOrEqual(0);
  expect(calls.indexOf('log.warn')).toBeGreaterThan(calls.indexOf('metric.add'));
});

it('emits one warning per failed markResolved under high burst concurrency', async () => {
  const { engine, warns } = startEngineWithFailingMarkResolved();

  const runIds = Array.from({ length: 20 }, (_, idx) => `obs-concurrent-high-burst-${idx + 1}`);
  await Promise.all(runIds.map((runId) => engine.startRun(makePlanRef(), makeContext(runId))));

  const warningMsg = 'markResolved failed; leaving intent cleanup to reconciliation worker';
  expect(warns.filter((msg) => msg === warningMsg)).toHaveLength(runIds.length);
});

it('keeps warning cardinality stable across repeated burst rounds', async () => {
  const { obs, warns } = makeObservabilityCollector();

  const adapters = makeAdapters();
  const { engine, intentStore } = createEngine({ adapters, observability: obs });
  vi.spyOn(intentStore, 'markResolved').mockRejectedValue(new Error('resolve boom'));

  const rounds = 3;
  const burstSize = 10;
  for (let round = 0; round < rounds; round++) {
    const runIds = Array.from(
      { length: burstSize },
      (_, idx) => `obs-concurrent-round-${round + 1}-${idx + 1}`
    );
    await Promise.all(runIds.map((runId) => engine.startRun(makePlanRef(), makeContext(runId))));
  }

  const warningMsg = 'markResolved failed; leaving intent cleanup to reconciliation worker';
  expect(warns.filter((msg) => msg === warningMsg)).toHaveLength(rounds * burstSize);
});

it('falls back to stderr when both observability sinks fail', async () => {
  const baseObs = createNoopObservability();
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  const obs: IObservability = {
    ...baseObs,
    metrics: {
      counter(name: string, labels?: Record<string, string>) {
        if (name === 'dvt.intent.mark_resolved_failed_total') {
          throw new Error('counter unavailable');
        }
        return { add(value?: number) {} };
      },
      histogram(name, labels) {
        return baseObs.metrics.histogram(name, labels);
      },
      gauge(name, labels) {
        return baseObs.metrics.gauge(name, labels);
      },
    },
    logs: {
      debug(entry?: unknown) {
        baseObs.logs.debug(entry as Parameters<typeof baseObs.logs.debug>[0]);
      },
      info(entry?: unknown) {
        baseObs.logs.info(entry as Parameters<typeof baseObs.logs.info>[0]);
      },
      warn() {
        throw new Error('warn unavailable');
      },
      error(entry?: unknown) {
        baseObs.logs.error(entry as Parameters<typeof baseObs.logs.error>[0]);
      },
    },
  } as IObservability;

  try {
    const adapters = makeAdapters();
    const { engine, intentStore } = createEngine({ adapters, observability: obs });
    vi.spyOn(intentStore, 'markResolved').mockRejectedValueOnce(new Error('resolve boom'));

    await expect(
      engine.startRun(makePlanRef(), makeContext('obs-fallback-stderr-1'))
    ).resolves.toEqual(
      expect.objectContaining({
        provider: 'temporal',
        runId: 'obs-fallback-stderr-1',
      })
    );

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '[dvt][StartRunCoordinator] markResolved observability reporting failed;'
      )
    );
  } finally {
    stderrSpy.mockRestore();
  }
});
