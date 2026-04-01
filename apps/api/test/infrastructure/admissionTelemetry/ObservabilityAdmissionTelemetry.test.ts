import type { ICounter, IObservability } from '@dvt/observability';
import { describe, expect, it, vi } from 'vitest';

import { ADMISSION_TELEMETRY_METRICS } from '../../../src/infrastructure/admissionTelemetry/admissionTelemetryMetrics.js';
import { ObservabilityAdmissionTelemetry } from '../../../src/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.js';

function createCounterSpy(): { add: ReturnType<typeof vi.fn>; counter: ReturnType<typeof vi.fn> } {
  const add = vi.fn<ICounter['add']>();
  const counter = vi.fn().mockReturnValue({ add });
  return { add, counter };
}

describe('ObservabilityAdmissionTelemetry', () => {
  it('records decision_total and info log for accept', async () => {
    const decisionCounter = createCounterSpy();
    const rejectionCounter = createCounterSpy();
    const info = vi.fn();
    const warn = vi.fn();
    const telemetry = new ObservabilityAdmissionTelemetry({
      observability: {
        metrics: {
          counter: vi.fn((name: string) =>
            name === ADMISSION_TELEMETRY_METRICS.decisionTotal
              ? decisionCounter.counter()
              : rejectionCounter.counter()
          ),
          histogram: vi.fn(),
          gauge: vi.fn(),
        },
        logs: { debug: vi.fn(), info, warn, error: vi.fn() },
        traces: { startSpan: vi.fn(), withSpan: vi.fn() },
        withContext: vi.fn((_, fn) => fn()),
      } as unknown as IObservability,
    });

    await telemetry.record({
      requestId: 'req-1',
      tenantId: 'tenant-1',
      runId: 'run-1',
      mode: 'enforce',
      decision: 'accept',
    });

    expect(decisionCounter.add).toHaveBeenCalledWith(1, { mode: 'enforce', decision: 'accept' });
    expect(rejectionCounter.add).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });

  it('records rejection_total and warn log for reject decisions', async () => {
    const decisionCounter = createCounterSpy();
    const rejectionCounter = createCounterSpy();
    const info = vi.fn();
    const warn = vi.fn();
    const telemetry = new ObservabilityAdmissionTelemetry({
      observability: {
        metrics: {
          counter: vi.fn((name: string) =>
            name === ADMISSION_TELEMETRY_METRICS.decisionTotal
              ? decisionCounter.counter()
              : rejectionCounter.counter()
          ),
          histogram: vi.fn(),
          gauge: vi.fn(),
        },
        logs: { debug: vi.fn(), info, warn, error: vi.fn() },
        traces: { startSpan: vi.fn(), withSpan: vi.fn() },
        withContext: vi.fn((_, fn) => fn()),
      } as unknown as IObservability,
    });

    await telemetry.record({
      requestId: 'req-1',
      tenantId: 'tenant-1',
      runId: 'run-1',
      mode: 'observe',
      decision: 'would_reject_system',
      code: 'SYSTEM_BACKPRESSURE',
      retryAfterSeconds: 30,
    });

    expect(decisionCounter.add).toHaveBeenCalledWith(1, {
      mode: 'observe',
      decision: 'would_reject_system',
    });
    expect(rejectionCounter.add).toHaveBeenCalledWith(1, {
      mode: 'observe',
      decision: 'would_reject_system',
      code: 'SYSTEM_BACKPRESSURE',
    });
    expect(warn).toHaveBeenCalledOnce();
    expect(info).not.toHaveBeenCalled();
  });

  it('does not include tenantId or runId in metric labels', async () => {
    const decisionCounter = createCounterSpy();
    const rejectionCounter = createCounterSpy();
    const telemetry = new ObservabilityAdmissionTelemetry({
      observability: {
        metrics: {
          counter: vi.fn((name: string) =>
            name === ADMISSION_TELEMETRY_METRICS.decisionTotal
              ? decisionCounter.counter()
              : rejectionCounter.counter()
          ),
          histogram: vi.fn(),
          gauge: vi.fn(),
        },
        logs: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        traces: { startSpan: vi.fn(), withSpan: vi.fn() },
        withContext: vi.fn((_, fn) => fn()),
      } as unknown as IObservability,
    });

    await telemetry.record({
      requestId: 'req-1',
      tenantId: 'tenant-1',
      runId: 'run-1',
      mode: 'observe',
      decision: 'would_reject_tenant',
      code: 'TENANT_BACKPRESSURE',
      retryAfterSeconds: 15,
    });

    const decisionLabels = decisionCounter.add.mock.calls[0]?.[1] as Record<string, unknown>;
    const rejectionLabels = rejectionCounter.add.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.keys(decisionLabels).sort()).toEqual(['decision', 'mode']);
    expect(Object.keys(rejectionLabels).sort()).toEqual(['code', 'decision', 'mode']);
  });

  it('swallows observability errors and does not throw', async () => {
    const telemetry = new ObservabilityAdmissionTelemetry({
      observability: {
        metrics: {
          counter: vi.fn(() => {
            throw new Error('metric sink down');
          }),
          histogram: vi.fn(),
          gauge: vi.fn(),
        },
        logs: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        traces: { startSpan: vi.fn(), withSpan: vi.fn() },
        withContext: vi.fn((_, fn) => fn()),
      } as unknown as IObservability,
    });

    await expect(
      telemetry.record({
        requestId: 'req-1',
        tenantId: 'tenant-1',
        runId: 'run-1',
        mode: 'enforce',
        decision: 'accept',
      })
    ).resolves.toBeUndefined();
  });
});
