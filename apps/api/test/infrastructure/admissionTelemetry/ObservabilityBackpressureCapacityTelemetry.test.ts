import type { IGauge, IObservability } from '@dvt/observability';
import { describe, expect, it, vi } from 'vitest';

import { ADMISSION_TELEMETRY_METRICS } from '../../../src/infrastructure/admissionTelemetry/admissionTelemetryMetrics.js';
import { ObservabilityBackpressureCapacityTelemetry } from '../../../src/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.js';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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

  describe('error resilience', () => {
    it('emits capacity_telemetry_drop warn when gauge.set throws', () => {
      const warn = vi.fn();
      const observability = {
        metrics: {
          counter: () => ({ add: vi.fn() }),
          histogram: () => ({ record: vi.fn() }),
          gauge: () => ({
            set: () => {
              throw new Error('gauge unavailable');
            },
          }),
        },
        logs: { info: vi.fn(), warn, debug: vi.fn(), error: vi.fn() },
        traces: { startSpan: vi.fn(), withSpan: vi.fn() },
        withContext: <T>(_ctx: unknown, fn: () => T): T => fn(),
      };
      const telemetry = new ObservabilityBackpressureCapacityTelemetry({ observability });

      expect(() =>
        telemetry.recordSnapshot({ tenantId: 't', pendingEventsCount: 1, outboxOldestAgeMs: 0, source: 'live' })
      ).not.toThrow();
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({ msg: 'backpressure.capacity_telemetry_drop' })
      );
    });

    it('does not throw when both gauge.set and logs.warn throw', () => {
      const observability = {
        metrics: {
          counter: () => ({ add: vi.fn() }),
          histogram: () => ({ record: vi.fn() }),
          gauge: () => ({
            set: () => {
              throw new Error('gauge unavailable');
            },
          }),
        },
        logs: {
          info: vi.fn(),
          warn: () => {
            throw new Error('logger unavailable');
          },
          debug: vi.fn(),
          error: vi.fn(),
        },
        traces: { startSpan: vi.fn(), withSpan: vi.fn() },
        withContext: <T>(_ctx: unknown, fn: () => T): T => fn(),
      };
      const telemetry = new ObservabilityBackpressureCapacityTelemetry({ observability });

      expect(() =>
        telemetry.recordSnapshot({ tenantId: 't', pendingEventsCount: 1, outboxOldestAgeMs: 0, source: 'live' })
      ).not.toThrow();
    });
  });
});
