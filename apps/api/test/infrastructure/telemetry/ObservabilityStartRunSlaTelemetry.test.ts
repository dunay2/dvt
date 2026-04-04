import type { IHistogram, IObservability } from '@dvt/observability';
import { describe, expect, it, vi } from 'vitest';

import { ObservabilityStartRunSlaTelemetry } from '../../../src/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.js';
import { START_RUN_SLA_METRICS } from '../../../src/infrastructure/telemetry/startRunSlaMetrics.js';

function createHistogramSpy(): { record: ReturnType<typeof vi.fn>; histogram: ReturnType<typeof vi.fn> } {
  const record = vi.fn<IHistogram['record']>();
  const histogram = vi.fn().mockReturnValue({ record });
  return { record, histogram };
}

describe('ObservabilityStartRunSlaTelemetry', () => {
  it('records start-run and plan-compile latencies with outcome labels', () => {
    const runStart = createHistogramSpy();
    const planCompile = createHistogramSpy();
    const telemetry = new ObservabilityStartRunSlaTelemetry({
      observability: {
        metrics: {
          counter: vi.fn(),
          gauge: vi.fn(),
          histogram: vi.fn((name: string) =>
            name === START_RUN_SLA_METRICS.runStartLatencyMs
              ? runStart.histogram()
              : planCompile.histogram()
          ),
        },
        logs: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        traces: { startSpan: vi.fn(), withSpan: vi.fn() },
        withContext: vi.fn((_, fn) => fn()),
      } as unknown as IObservability,
    });

    telemetry.recordStartRunLatency(321, 'accepted');
    telemetry.recordPlanCompileLatency(123, 'built');

    expect(runStart.record).toHaveBeenCalledWith(321, { outcome: 'accepted' });
    expect(planCompile.record).toHaveBeenCalledWith(123, { outcome: 'built' });
  });
});

