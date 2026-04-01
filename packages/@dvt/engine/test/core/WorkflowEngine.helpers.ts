import type { EngineRunRef, PlanRef, RunContext, RunEventInput, EventType } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import type { IClock } from '../../src/utils/clock.js';
import { SequenceClock } from '../../src/utils/clock.js';
import {
  createWorkflowEngineFixture,
  makeProviderMap,
  makeTemporalAdapter as makeSharedTemporalAdapter,
} from '../helpers/workflowEngine.fixture.js';

export function makePlanRef(): PlanRef {
  return {
    uri: 'https://example.com/plan',
    sha256: 'deadbeef',
    schemaVersion: 'v1.1',
    planId: 'p',
    planVersion: '1.0',
  };
}

export function makeContext(runId = 'r1'): RunContext {
  return {
    tenantId: 't',
    projectId: 'p',
    environmentId: 'dev',
    runId,
    targetAdapter: 'temporal',
  };
}

export function makeTemporalAdapter(overrides?: Partial<IProviderAdapter>): IProviderAdapter {
  return makeSharedTemporalAdapter(overrides);
}

export function makeAdapters(
  overrides?: Partial<IProviderAdapter>
): Map<EngineRunRef['provider'], IProviderAdapter> {
  return makeProviderMap(makeTemporalAdapter(overrides));
}

export function makeTrackingObservability(): {
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
        type MetricCounter = { add: (value?: number) => void };
        counters.push(name);
        return { add: () => {} } as MetricCounter;
      },
      histogram(name: string) {
        type Histogram = { record: (value?: number) => void };
        histograms.push(name);
        return { record: () => {} } as Histogram;
      },
      gauge() {
        type Gauge = { set: (v: number) => void };
        return { set: () => {} } as Gauge;
      },
    },
    logs: {
      debug(entry) {
        baseObs.logs.debug(entry as unknown as Parameters<typeof baseObs.logs.debug>[0]);
      },
      info(entry) {
        baseObs.logs.info(entry as unknown as Parameters<typeof baseObs.logs.info>[0]);
      },
      warn(entry) {
        if (entry && typeof entry === 'object') {
          const e = entry as Record<string, unknown>;
          const msg = typeof e.msg === 'string' ? e.msg : undefined;
          warnCapture(e, warns);
          if (msg) warns.push(msg);
        } else if (typeof entry === 'string') {
          warns.push(entry);
        }
        baseObs.logs.warn(entry as unknown as Parameters<typeof baseObs.logs.warn>[0]);
      },
      error(entry) {
        baseObs.logs.error(entry as unknown as Parameters<typeof baseObs.logs.error>[0]);
      },
    },
  };
  return { obs, counters, histograms, warns };
}

function warnCapture(e: Record<string, unknown>, warns: string[]): void {
  const msg = typeof e.msg === 'string' ? e.msg : undefined;
  if (msg) warns.push(msg);
}

export function createEngine(input?: {
  adapters?: Map<EngineRunRef['provider'], IProviderAdapter>;
  requiredProviders?: EngineRunRef['provider'][];
  observability?: IObservability;
  stateStore?: InMemoryTxStore;
  stateStoreRead?: InMemoryTxStore;
  stateStoreWrite?: InMemoryTxStore;
  intentStore?: InMemoryStartRunIntentStore;
  observabilityFallbackThrottleMs?: number;
  clock?: IClock;
}): {
  engine: ReturnType<typeof createWorkflowEngineFixture>['engine'];
  store: InMemoryTxStore;
  intentStore: InMemoryStartRunIntentStore;
} {
  const fixture = createWorkflowEngineFixture({
    adapters: input?.adapters,
    requiredProviders: input?.requiredProviders,
    observability: input?.observability ?? createNoopObservability(),
    stateStore: input?.stateStore,
    stateStoreRead: input?.stateStoreRead,
    stateStoreWrite: input?.stateStoreWrite,
    intentStore: input?.intentStore,
    observabilityFallbackThrottleMs: input?.observabilityFallbackThrottleMs,
    clock: input?.clock ?? new SequenceClock('2026-02-12T00:00:00.000Z'),
  });

  return { engine: fixture.engine, store: fixture.store, intentStore: fixture.intentStore };
}

export function makeScriptedClock(values: string[]): IClock {
  let index = 0;
  return {
    nowIsoUtc(): string {
      const value = values.at(index) ?? values.at(-1) ?? '2026-02-12T00:00:00.000Z';
      index += 1;
      return value;
    },
  };
}

export function makeRunEventInput(input: {
  runId: string;
  eventId: string;
  eventType?: string;
  idempotencyKey?: string;
  payload?: unknown;
}): RunEventInput {
  const now = new SequenceClock('2026-02-12T00:00:00.000Z').nowIsoUtc();
  const out: RunEventInput = {
    eventId: input.eventId,
    eventType: (input.eventType ?? 'RunStarted') as EventType,
    runId: input.runId,
    emittedAt: now,
    tenantId: 't',
    projectId: 'p',
    environmentId: 'dev',
    planId: 'p',
    planVersion: '1.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: input.idempotencyKey ?? `idemp-${input.eventId}`,
    payload: (input.payload as Record<string, unknown>) ?? {},
  };

  return out;
}

export function makeObservabilityCollector(overrides?: {
  counter?: (
    name: string,
    labels?: Record<string, string>
  ) => { add: (value?: number) => void } | never;
  histogram?: (
    name: string,
    labels?: Record<string, string>
  ) => { record: (v?: number) => void } | never;
  gauge?: (name: string, labels?: Record<string, string>) => { set: (v: number) => void } | never;
  warn?: (entry: unknown) => void;
  info?: (entry: unknown) => void;
  debug?: (entry: unknown) => void;
  error?: (entry: unknown) => void;
}): {
  obs: IObservability;
  metricCalls: Array<Record<string, unknown>>;
  warns: string[];
  warnEntries: Array<{
    msg?: string;
    context?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
  }>;
  calls: string[];
  counters: string[];
  histograms: string[];
} {
  const baseObs = createNoopObservability();
  const metricCalls: Array<Record<string, unknown>> = [];
  const warns: string[] = [];
  const warnEntries: Array<{
    msg?: string;
    context?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
  }> = [];
  const calls: string[] = [];
  const counters: string[] = [];
  const histograms: string[] = [];

  const obs: IObservability = {
    ...baseObs,
    metrics: {
      counter(name: string, labels?: Record<string, string>) {
        type MetricCounter = { add: (value?: number) => void };
        counters.push(name);
        if (overrides?.counter) return overrides.counter(name, labels) as MetricCounter;
        return {
          add(value?: number) {
            metricCalls.push({ name, labels, value });
          },
        } as MetricCounter;
      },
      histogram(name: string, labels?: Record<string, string>) {
        histograms.push(name);
        if (overrides?.histogram)
          return overrides.histogram(name, labels) as { record: (v?: number) => void };
        return baseObs.metrics.histogram(name, labels);
      },
      gauge(name: string, labels?: Record<string, string>) {
        if (overrides?.gauge) return overrides.gauge(name, labels) as { set: (v: number) => void };
        return baseObs.metrics.gauge(name, labels);
      },
    },
    logs: {
      debug(entry) {
        if (overrides?.debug) return overrides.debug(entry);
        baseObs.logs.debug(entry as unknown as Parameters<typeof baseObs.logs.debug>[0]);
      },
      info(entry) {
        if (overrides?.info) return overrides.info(entry);
        baseObs.logs.info(entry as unknown as Parameters<typeof baseObs.logs.info>[0]);
      },
      warn(entry) {
        if (overrides?.warn) {
          try {
            return overrides.warn(entry);
          } finally {
            // best-effort recording for tests that expect recorded warnings
          }
        }
        // capture both simple and structured warn shapes (defensive, avoid throwing)
        if (entry && typeof entry === 'object') {
          const e = entry as Record<string, unknown>;
          warnEntries.push({
            msg: typeof e.msg === 'string' ? e.msg : undefined,
            context: e.context as Record<string, unknown> | undefined,
            attributes: e.attributes as Record<string, unknown> | undefined,
          });
          if (typeof e.msg === 'string') warns.push(e.msg);
        } else if (typeof entry === 'string') {
          warns.push(entry);
        }
        baseObs.logs.warn(entry as unknown as Parameters<typeof baseObs.logs.warn>[0]);
      },
      error(entry) {
        if (overrides?.error) return overrides.error(entry);
        baseObs.logs.error(entry as unknown as Parameters<typeof baseObs.logs.error>[0]);
      },
    },
  };

  return { obs, metricCalls, warns, warnEntries, calls, counters, histograms } as const;
}
