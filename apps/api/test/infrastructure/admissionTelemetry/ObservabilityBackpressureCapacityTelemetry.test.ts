import type { IGauge, IObservability } from '@dvt/observability';
import { describe, expect, it, vi } from 'vitest';

import { ObservabilityBackpressureCapacityTelemetry } from '../../../src/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.js';
import { ADMISSION_TELEMETRY_METRICS } from '../../../src/infrastructure/admissionTelemetry/admissionTelemetryMetrics.js';

function createGaugeSpy() {
  const set = vi.fn<IGauge['set']>();
  const gauge = vi.fn().mockReturnValue({ set });
  return { set, gauge };
}

describe('ObservabilityBackpressureCapacityTelemetry', () => {
  it('sets both gauges with source label', () => {
    const pendingGauge = createGaugeSpy();
    const outboxGauge = createGaugeSpy();
    const telemetry = new ObservabilityBackpressureCapacityTelemetry({
      observability: {
        metrics: {
          counter: vi.fn(),
          histogram: vi.fn(),
          gauge: vi.fn((name: string) =>
            name === ADMISSION_TELEMETRY_METRICS.pendingEventsGauge
              ? pendingGauge.gauge()
              : outboxGauge.gauge()
          ),
        },
        logs: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        traces: { startSpan: vi.fn(), withSpan: vi.fn() },
        withContext: vi.fn((_, fn) => fn()),
      } as unknown as IObservability,
    });

    telemetry.recordSnapshot({
      tenantId: 'tenant-a',
      pendingEventsCount: 7,
      outboxOldestAgeMs: 12_000,
      source: 'cache',
    });

    expect(pendingGauge.set).toHaveBeenCalledWith(7, { source: 'cache' });
    expect(outboxGauge.set).toHaveBeenCalledWith(12_000, { source: 'cache' });
  });
});
