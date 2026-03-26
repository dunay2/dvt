import { describe, expect, it, vi } from 'vitest';

import { ADMISSION_TELEMETRY_METRICS } from '../../../src/infrastructure/admissionTelemetry/admissionTelemetryMetrics.js';
import { ObservabilityBackpressureCapacityTelemetry } from '../../../src/infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.js';

type GaugeCall = { name: string; value: number; labels?: Record<string, string> };

function makeObservabilitySpy() {
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
    withContext: (_ctx: unknown, fn: () => unknown) => fn(),
  };

  return { observability, gaugeCalls };
}

describe('ObservabilityBackpressureCapacityTelemetry', () => {
  it('sets pending_events gauge with value from snapshot', () => {
    const { observability, gaugeCalls } = makeObservabilitySpy();
    const telemetry = new ObservabilityBackpressureCapacityTelemetry({ observability });

    telemetry.recordSnapshot({
      tenantId: 'tenant-1',
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
    const { observability, gaugeCalls } = makeObservabilitySpy();
    const telemetry = new ObservabilityBackpressureCapacityTelemetry({ observability });

    telemetry.recordSnapshot({
      tenantId: 'tenant-1',
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
    const { observability, gaugeCalls } = makeObservabilitySpy();
    const telemetry = new ObservabilityBackpressureCapacityTelemetry({ observability });

    telemetry.recordSnapshot({
      tenantId: 'tenant-1',
      pendingEventsCount: 5,
      outboxOldestAgeMs: 1_000,
      source: 'cache',
    });

    expect(gaugeCalls.every((c) => c.labels?.source === 'cache')).toBe(true);
  });

  it('uses source=fallback label for fallback snapshot', () => {
    const { observability, gaugeCalls } = makeObservabilitySpy();
    const telemetry = new ObservabilityBackpressureCapacityTelemetry({ observability });

    telemetry.recordSnapshot({
      tenantId: 'tenant-1',
      pendingEventsCount: 0,
      outboxOldestAgeMs: 0,
      source: 'fallback',
    });

    expect(gaugeCalls.every((c) => c.labels?.source === 'fallback')).toBe(true);
  });

  it('does not include tenantId in gauge labels', () => {
    const { observability, gaugeCalls } = makeObservabilitySpy();
    const telemetry = new ObservabilityBackpressureCapacityTelemetry({ observability });

    telemetry.recordSnapshot({
      tenantId: 'tenant-1',
      pendingEventsCount: 3,
      outboxOldestAgeMs: 2_000,
      source: 'live',
    });

    expect(gaugeCalls.every((c) => !Object.keys(c.labels ?? {}).includes('tenantId'))).toBe(true);
  });
});
