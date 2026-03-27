import { describe, expect, it, vi } from 'vitest';

import { ADMISSION_TELEMETRY_METRICS } from '../../../src/infrastructure/admissionTelemetry/admissionTelemetryMetrics.js';
import { ObservabilityBackpressureCapacityTelemetry } from '../../../src/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.js';

type GaugeCall = { name: string; value: number; labels?: Record<string, string> | undefined };

type ObservabilitySpy = {
  observability: {
    metrics: {
      counter: () => { add: ReturnType<typeof vi.fn> };
      histogram: () => { record: ReturnType<typeof vi.fn> };
      gauge: (name: string) => { set: (value: number, labels?: Record<string, string>) => void };
    };
    logs: {
      info: ReturnType<typeof vi.fn>;
      warn: ReturnType<typeof vi.fn>;
      debug: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
    };
    traces: { startSpan: ReturnType<typeof vi.fn>; withSpan: ReturnType<typeof vi.fn> };
    withContext: <T>(_ctx: unknown, fn: () => T) => T;
  };
  gaugeCalls: GaugeCall[];
};

function makeObservabilitySpy(): ObservabilitySpy {
  const gaugeCalls: GaugeCall[] = [];

  const observability = {
    metrics: {
      counter: () => ({ add: vi.fn() }),
      histogram: () => ({ record: vi.fn() }),
      gauge: (name: string) => ({
        set: (value: number, labels?: Record<string, string>) => {
          gaugeCalls.push({ name, value, labels });
        },
      }),
    },
    logs: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
    traces: { startSpan: vi.fn(), withSpan: vi.fn() },
    withContext: <T>(_ctx: unknown, fn: () => T): T => fn(),
  };

  return { observability, gaugeCalls };
}

describe('ObservabilityBackpressureCapacityTelemetry', () => {
  function setupAndRecordSnapshot(snapshot: {
    pendingEventsCount: number;
    outboxOldestAgeMs: number;
    source: 'live' | 'cache' | 'fallback';
  }): { gaugeCalls: GaugeCall[] } {
    const { observability, gaugeCalls } = makeObservabilitySpy();
    const telemetry = new ObservabilityBackpressureCapacityTelemetry({ observability });
    telemetry.recordSnapshot(snapshot);
    return { gaugeCalls };
  }

  it('sets pending_events gauge with value from snapshot', () => {
    const { gaugeCalls } = setupAndRecordSnapshot({
      pendingEventsCount: 42,
      outboxOldestAgeMs: 5_000,
      source: 'live',
    });

    expect(gaugeCalls).toContainEqual({
      name: ADMISSION_TELEMETRY_METRICS.pendingEventsGauge,
      value: 42,
      labels: { source: 'live' },
    });
  });

  it('sets outbox_oldest_age gauge with value from snapshot', () => {
    const { gaugeCalls } = setupAndRecordSnapshot({
      pendingEventsCount: 10,
      outboxOldestAgeMs: 90_000,
      source: 'live',
    });

    expect(gaugeCalls).toContainEqual({
      name: ADMISSION_TELEMETRY_METRICS.outboxOldestAgeGauge,
      value: 90_000,
      labels: { source: 'live' },
    });
  });

  it('uses source=cache label when snapshot source is cache', () => {
    const { gaugeCalls } = setupAndRecordSnapshot({
      pendingEventsCount: 5,
      outboxOldestAgeMs: 1_000,
      source: 'cache',
    });

    expect(gaugeCalls.every((c) => c.labels?.source === 'cache')).toBe(true);
  });

  it('uses source=fallback label for fallback snapshot', () => {
    const { gaugeCalls } = setupAndRecordSnapshot({
      pendingEventsCount: 0,
      outboxOldestAgeMs: 0,
      source: 'fallback',
    });

    expect(gaugeCalls.every((c) => c.labels?.source === 'fallback')).toBe(true);
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
        telemetry.recordSnapshot({
          pendingEventsCount: 1,
          outboxOldestAgeMs: 0,
          source: 'live',
        })
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
        telemetry.recordSnapshot({
          pendingEventsCount: 1,
          outboxOldestAgeMs: 0,
          source: 'live',
        })
      ).not.toThrow();
    });
  });
});
