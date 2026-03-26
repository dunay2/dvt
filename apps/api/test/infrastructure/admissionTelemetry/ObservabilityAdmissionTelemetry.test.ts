import { describe, expect, it, vi } from 'vitest';

import { ADMISSION_TELEMETRY_METRICS } from '../../../src/infrastructure/admissionTelemetry/admissionTelemetryMetrics.js';
import { ObservabilityAdmissionTelemetry } from '../../../src/infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.js';

// ---------------------------------------------------------------------------
// Spy factory — minimal in-memory IObservability double
// ---------------------------------------------------------------------------

type CounterCall = { name: string; value: number; labels?: Record<string, string> };
type LogCall = { level: string; msg: string; attributes?: Record<string, unknown> };

function makeObservabilitySpy() {
  const counterCalls: CounterCall[] = [];
  const logCalls: LogCall[] = [];

  const observability = {
    metrics: {
      counter: (name: string) => ({
        add: (value: number, labels?: Record<string, string>) => {
          counterCalls.push({ name, value, labels });
        },
      }),
      histogram: () => ({ record: vi.fn() }),
      gauge: () => ({ set: vi.fn() }),
    },
    logs: {
      info: (entry: { msg: string; attributes?: Record<string, unknown> }) =>
        logCalls.push({ level: 'info', ...entry }),
      warn: (entry: { msg: string; attributes?: Record<string, unknown> }) =>
        logCalls.push({ level: 'warn', ...entry }),
      debug: (entry: { msg: string }) => logCalls.push({ level: 'debug', msg: entry.msg }),
      error: (entry: { msg: string }) => logCalls.push({ level: 'error', msg: entry.msg }),
    },
    traces: { startSpan: vi.fn(), withSpan: vi.fn() },
    withContext: (_ctx: unknown, fn: () => unknown) => fn(),
  };

  return { observability, counterCalls, logCalls };
}

const COMMON = {
  requestId: 'req-1',
  tenantId: 'tenant-1',
  runId: 'run-1',
  mode: 'enforce' as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ObservabilityAdmissionTelemetry', () => {
  describe('accept decision', () => {
    it('increments decision_total counter', async () => {
      const { observability, counterCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({ ...COMMON, decision: 'accept' });

      expect(counterCalls).toContainEqual({
        name: ADMISSION_TELEMETRY_METRICS.decisionTotal,
        value: 1,
        labels: { mode: 'enforce', decision: 'accept' },
      });
    });

    it('does not increment rejection_total counter', async () => {
      const { observability, counterCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({ ...COMMON, decision: 'accept' });

      expect(counterCalls.some((c) => c.name === ADMISSION_TELEMETRY_METRICS.rejectionTotal)).toBe(
        false
      );
    });

    it('logs at info level', async () => {
      const { observability, logCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({ ...COMMON, decision: 'accept' });

      expect(logCalls).toContainEqual(expect.objectContaining({ level: 'info' }));
    });

    it('does not include tenantId or runId in counter labels', async () => {
      const { observability, counterCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({ ...COMMON, decision: 'accept' });

      const call = counterCalls.find((c) => c.name === ADMISSION_TELEMETRY_METRICS.decisionTotal);
      expect(Object.keys(call?.labels ?? {})).not.toContain('tenantId');
      expect(Object.keys(call?.labels ?? {})).not.toContain('runId');
    });
  });

  describe('duplicate decision', () => {
    it('increments decision_total counter', async () => {
      const { observability, counterCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({ ...COMMON, decision: 'duplicate', duplicateOf: 'intent' });

      expect(counterCalls).toContainEqual({
        name: ADMISSION_TELEMETRY_METRICS.decisionTotal,
        value: 1,
        labels: { mode: 'enforce', decision: 'duplicate' },
      });
    });

    it('logs at info level', async () => {
      const { observability, logCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({ ...COMMON, decision: 'duplicate', duplicateOf: 'run' });

      expect(logCalls).toContainEqual(expect.objectContaining({ level: 'info' }));
    });
  });

  describe('reject_tenant decision (enforce mode)', () => {
    it('increments decision_total counter', async () => {
      const { observability, counterCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({
        ...COMMON,
        decision: 'reject_tenant',
        code: 'TENANT_BACKPRESSURE',
        retryAfterSeconds: 30,
      });

      expect(counterCalls).toContainEqual({
        name: ADMISSION_TELEMETRY_METRICS.decisionTotal,
        value: 1,
        labels: { mode: 'enforce', decision: 'reject_tenant' },
      });
    });

    it('increments rejection_total counter with code label', async () => {
      const { observability, counterCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({
        ...COMMON,
        decision: 'reject_tenant',
        code: 'TENANT_BACKPRESSURE',
        retryAfterSeconds: 30,
      });

      expect(counterCalls).toContainEqual({
        name: ADMISSION_TELEMETRY_METRICS.rejectionTotal,
        value: 1,
        labels: { mode: 'enforce', decision: 'reject_tenant', code: 'TENANT_BACKPRESSURE' },
      });
    });

    it('logs at warn level', async () => {
      const { observability, logCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({
        ...COMMON,
        decision: 'reject_tenant',
        code: 'TENANT_BACKPRESSURE',
        retryAfterSeconds: 30,
      });

      expect(logCalls).toContainEqual(expect.objectContaining({ level: 'warn' }));
    });
  });

  describe('reject_system decision (enforce mode)', () => {
    it('increments rejection_total with SYSTEM_BACKPRESSURE code', async () => {
      const { observability, counterCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({
        ...COMMON,
        decision: 'reject_system',
        code: 'SYSTEM_BACKPRESSURE',
        retryAfterSeconds: 30,
      });

      expect(counterCalls).toContainEqual({
        name: ADMISSION_TELEMETRY_METRICS.rejectionTotal,
        value: 1,
        labels: { mode: 'enforce', decision: 'reject_system', code: 'SYSTEM_BACKPRESSURE' },
      });
    });

    it('increments rejection_total with BACKPRESSURE_SNAPSHOT_UNAVAILABLE code', async () => {
      const { observability, counterCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({
        ...COMMON,
        decision: 'reject_system',
        code: 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE',
        retryAfterSeconds: 30,
      });

      expect(counterCalls).toContainEqual(
        expect.objectContaining({
          name: ADMISSION_TELEMETRY_METRICS.rejectionTotal,
          labels: expect.objectContaining({ code: 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE' }),
        })
      );
    });
  });

  describe('would_reject_tenant decision (observe mode)', () => {
    it('increments decision_total with observe mode label', async () => {
      const { observability, counterCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({
        requestId: 'req-1',
        tenantId: 'tenant-1',
        runId: 'run-1',
        mode: 'observe',
        decision: 'would_reject_tenant',
        code: 'TENANT_BACKPRESSURE',
        retryAfterSeconds: 30,
      });

      expect(counterCalls).toContainEqual({
        name: ADMISSION_TELEMETRY_METRICS.decisionTotal,
        value: 1,
        labels: { mode: 'observe', decision: 'would_reject_tenant' },
      });
    });

    it('increments rejection_total counter', async () => {
      const { observability, counterCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({
        requestId: 'req-1',
        tenantId: 'tenant-1',
        runId: 'run-1',
        mode: 'observe',
        decision: 'would_reject_tenant',
        code: 'TENANT_BACKPRESSURE',
        retryAfterSeconds: 30,
      });

      expect(
        counterCalls.some((c) => c.name === ADMISSION_TELEMETRY_METRICS.rejectionTotal)
      ).toBe(true);
    });

    it('logs at warn level', async () => {
      const { observability, logCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({
        requestId: 'req-1',
        tenantId: 'tenant-1',
        runId: 'run-1',
        mode: 'observe',
        decision: 'would_reject_tenant',
        code: 'TENANT_BACKPRESSURE',
        retryAfterSeconds: 30,
      });

      expect(logCalls).toContainEqual(expect.objectContaining({ level: 'warn' }));
    });
  });

  describe('would_reject_system decision (observe mode)', () => {
    it('increments rejection_total with would_reject_system decision', async () => {
      const { observability, counterCalls } = makeObservabilitySpy();
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await telemetry.record({
        requestId: 'req-1',
        tenantId: 'tenant-1',
        runId: 'run-1',
        mode: 'observe',
        decision: 'would_reject_system',
        code: 'SYSTEM_BACKPRESSURE',
        retryAfterSeconds: 30,
      });

      expect(counterCalls).toContainEqual({
        name: ADMISSION_TELEMETRY_METRICS.rejectionTotal,
        value: 1,
        labels: { mode: 'observe', decision: 'would_reject_system', code: 'SYSTEM_BACKPRESSURE' },
      });
    });
  });

  describe('error resilience', () => {
    it('resolves even when counter.add throws at record time', async () => {
      const observability = {
        metrics: {
          counter: () => ({
            add: () => {
              throw new Error('metrics unavailable');
            },
          }),
          histogram: () => ({ record: vi.fn() }),
          gauge: () => ({ set: vi.fn() }),
        },
        logs: {
          info: vi.fn(),
          warn: vi.fn(),
          debug: vi.fn(),
          error: vi.fn(),
        },
        traces: { startSpan: vi.fn(), withSpan: vi.fn() },
        withContext: (_ctx: unknown, fn: () => unknown) => fn(),
      };
      const telemetry = new ObservabilityAdmissionTelemetry({ observability });

      await expect(telemetry.record({ ...COMMON, decision: 'accept' })).resolves.toBeUndefined();
    });
  });
});
