import type {
  ICounter,
  IGauge,
  IHistogram,
  ILogs,
  IObservability,
  ITraces,
} from '@dvt/observability';
import { describe, expect, it, vi } from 'vitest';

import { ObservabilityStartRunSlaTelemetry } from '../../../src/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.js';
import { START_RUN_SLA_METRICS } from '../../../src/infrastructure/telemetry/startRunSlaMetrics.js';

function createHistogramSpy(): {
  record: ReturnType<typeof vi.fn>;
  histogram: ReturnType<typeof vi.fn>;
} {
  const record = vi.fn<IHistogram['record']>();
  const histogram = vi.fn().mockReturnValue({ record });
  return { record, histogram };
}

function createCounterStub(): ICounter {
  return { add: vi.fn() };
}

function createGaugeStub(): IGauge {
  return { set: vi.fn() };
}

function createLogStub(): ILogs {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function createTraceStub(): ITraces {
  return {
    startSpan: vi.fn(() => ({
      setAttribute: vi.fn(),
      setAttributes: vi.fn(),
      recordException: vi.fn(),
      setStatus: vi.fn(),
      end: vi.fn(),
    })),
    withSpan: vi.fn((_, __, fn) =>
      fn({
        setAttribute: vi.fn(),
        setAttributes: vi.fn(),
        recordException: vi.fn(),
        setStatus: vi.fn(),
        end: vi.fn(),
      })
    ),
  };
}

function createObservabilityForSlaTest(args: {
  runStart: ReturnType<typeof createHistogramSpy>;
  planCompile: ReturnType<typeof createHistogramSpy>;
}): IObservability {
  return {
    metrics: {
      counter: vi.fn(() => createCounterStub()),
      gauge: vi.fn(() => createGaugeStub()),
      histogram: vi.fn((name: string) =>
        name === START_RUN_SLA_METRICS.runStartLatencySeconds
          ? args.runStart.histogram()
          : args.planCompile.histogram()
      ),
    },
    logs: createLogStub(),
    traces: createTraceStub(),
    withContext: vi.fn((_, fn) => fn()),
  };
}

describe('ObservabilityStartRunSlaTelemetry', () => {
  it('records start-run and plan-compile latencies with outcome labels', () => {
    const runStart = createHistogramSpy();
    const planCompile = createHistogramSpy();
    const telemetry = new ObservabilityStartRunSlaTelemetry({
      observability: createObservabilityForSlaTest({ runStart, planCompile }),
    });

    telemetry.recordStartRunLatency(0.321, 'accepted');
    telemetry.recordPlanCompileLatency(0.123, 'built');

    expect(runStart.record).toHaveBeenCalledWith(0.321, { outcome: 'accepted' });
    expect(planCompile.record).toHaveBeenCalledWith(0.123, { outcome: 'built' });
  });
});
