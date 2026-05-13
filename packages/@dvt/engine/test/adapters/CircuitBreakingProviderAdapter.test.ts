import type { EngineRunRef, PlanRef, ResolvedRunContext, SignalRequest } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import type { IObservability } from '@dvt/observability';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AdapterCircuitOpenError,
  buildCircuitBreakingAdapterRegistry,
  CircuitBreakingProviderAdapter,
  getAdapterCircuitBreakerSnapshot,
} from '../../src/adapters/CircuitBreakingProviderAdapter.js';
import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';

const RUN_REF: EngineRunRef = {
  provider: 'temporal',
  tenantId: 'tenant-1',
  runId: 'run-1',
  workflowId: 'workflow-1',
};

const PLAN_REF: PlanRef = {
  uri: 'https://plans.example.test/plan.json',
  sha256: '0'.repeat(64),
  schemaVersion: 1,
  planId: 'plan-1',
  planVersion: '1.0.0',
};

const CONTEXT: ResolvedRunContext = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'dev',
  runId: 'run-1',
  targetAdapter: 'temporal',
};

const SIGNAL: SignalRequest = {
  type: 'PAUSE',
  payload: { reason: 'operator-request' },
};

describe('CircuitBreakingProviderAdapter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens after the failure threshold and fails fast without invoking startRun', async () => {
    let startCalls = 0;
    const adapter = new CircuitBreakingProviderAdapter(
      makeAdapter({
        startRun: async () => {
          startCalls += 1;
          throw new Error('temporal unavailable');
        },
      }),
      { failureThreshold: 2, openStateMs: 1_000, nowMs: () => 1_000 }
    );

    await expect(adapter.startRun(PLAN_REF, CONTEXT)).rejects.toThrow('temporal unavailable');
    await expect(adapter.startRun(PLAN_REF, CONTEXT)).rejects.toThrow('temporal unavailable');
    await expect(adapter.startRun(PLAN_REF, CONTEXT)).rejects.toBeInstanceOf(
      AdapterCircuitOpenError
    );

    expect(startCalls).toBe(2);
    expect(getAdapterCircuitBreakerSnapshot(adapter)).toMatchObject({
      provider: 'temporal',
      state: 'open',
      failureCount: 2,
      openedAtEpochMs: 1_000,
      retryAtEpochMs: 2_000,
      lastFailureMessage: 'temporal unavailable',
    });
  });

  it('moves from open to half-open after retry and closes after a successful probe', async () => {
    let now = 1_000;
    let startCalls = 0;
    const adapter = new CircuitBreakingProviderAdapter(
      makeAdapter({
        startRun: async () => {
          startCalls += 1;
          if (startCalls === 1) throw new Error('single outage');
          return RUN_REF;
        },
      }),
      { failureThreshold: 1, openStateMs: 500, nowMs: () => now }
    );

    await expect(adapter.startRun(PLAN_REF, CONTEXT)).rejects.toThrow('single outage');
    expect(getAdapterCircuitBreakerSnapshot(adapter)?.state).toBe('open');

    now = 1_600;
    await expect(adapter.startRun(PLAN_REF, CONTEXT)).resolves.toEqual(RUN_REF);

    expect(startCalls).toBe(2);
    expect(getAdapterCircuitBreakerSnapshot(adapter)).toMatchObject({
      provider: 'temporal',
      state: 'closed',
      failureCount: 0,
    });
  });

  it('uses a live default clock so an opened breaker can reach half-open', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T00:00:00.000Z'));
    let startCalls = 0;
    const adapter = new CircuitBreakingProviderAdapter(
      makeAdapter({
        startRun: async () => {
          startCalls += 1;
          if (startCalls === 1) throw new Error('transient outage');
          return RUN_REF;
        },
      }),
      { failureThreshold: 1, openStateMs: 500 }
    );

    await expect(adapter.startRun(PLAN_REF, CONTEXT)).rejects.toThrow('transient outage');
    await vi.advanceTimersByTimeAsync(600);
    await expect(adapter.startRun(PLAN_REF, CONTEXT)).resolves.toEqual(RUN_REF);

    expect(startCalls).toBe(2);
    expect(getAdapterCircuitBreakerSnapshot(adapter)).toMatchObject({
      state: 'closed',
      failureCount: 0,
    });
  });

  it('rejects concurrent calls while a half-open probe is in flight', async () => {
    let now = 1_000;
    let releaseProbe: ((value: EngineRunRef) => void) | undefined;
    let startCalls = 0;
    const adapter = new CircuitBreakingProviderAdapter(
      makeAdapter({
        startRun: async () => {
          startCalls += 1;
          if (startCalls === 1) throw new Error('initial outage');
          if (startCalls > 2) return RUN_REF;
          return new Promise<EngineRunRef>((resolve) => {
            releaseProbe = resolve;
          });
        },
      }),
      { failureThreshold: 1, openStateMs: 500, nowMs: () => now }
    );

    await expect(adapter.startRun(PLAN_REF, CONTEXT)).rejects.toThrow('initial outage');
    now = 1_600;
    const probe = adapter.startRun(PLAN_REF, CONTEXT);

    await expect(adapter.startRun(PLAN_REF, CONTEXT)).rejects.toBeInstanceOf(
      AdapterCircuitOpenError
    );
    expect(startCalls).toBe(2);

    releaseProbe?.(RUN_REF);
    await expect(probe).resolves.toEqual(RUN_REF);
    expect(getAdapterCircuitBreakerSnapshot(adapter)?.state).toBe('closed');
  });

  it('reopens when the half-open probe fails', async () => {
    let now = 1_000;
    const adapter = new CircuitBreakingProviderAdapter(
      makeAdapter({
        cancelRun: async () => {
          throw new Error('cancel outage');
        },
      }),
      { failureThreshold: 1, openStateMs: 500, nowMs: () => now }
    );

    await expect(adapter.cancelRun(RUN_REF)).rejects.toThrow('cancel outage');
    now = 1_600;
    await expect(adapter.cancelRun(RUN_REF)).rejects.toThrow('cancel outage');

    expect(getAdapterCircuitBreakerSnapshot(adapter)).toMatchObject({
      state: 'open',
      retryAtEpochMs: 2_100,
      lastOperation: 'cancelRun',
    });
  });

  it('protects cancel, signal, and enrichment provider calls', async () => {
    const called: string[] = [];
    const adapter = new CircuitBreakingProviderAdapter(
      makeAdapter({
        cancelRun: async () => {
          called.push('cancelRun');
          throw new Error('provider outage');
        },
        signal: async () => {
          called.push('signal');
        },
        getProviderStatusView: async () => {
          called.push('getProviderStatusView');
          return { provider: 'temporal', providerStatus: 'RUNNING' };
        },
      }),
      { failureThreshold: 1, openStateMs: 1_000, nowMs: () => 1_000 }
    );

    await expect(adapter.cancelRun(RUN_REF)).rejects.toThrow('provider outage');
    await expect(adapter.signal(RUN_REF, SIGNAL)).rejects.toBeInstanceOf(AdapterCircuitOpenError);
    await expect(adapter.getProviderStatusView(RUN_REF)).rejects.toBeInstanceOf(
      AdapterCircuitOpenError
    );

    expect(called).toEqual(['cancelRun']);
  });

  it('emits breaker transition and fail-fast metrics without changing behavior', async () => {
    const metricCalls: Array<{ name: string; labels?: Record<string, string>; value: number }> = [];
    const observability = makeMetricObservability(metricCalls);
    const adapter = new CircuitBreakingProviderAdapter(
      makeAdapter({
        startRun: async () => {
          throw new Error('provider outage');
        },
      }),
      {
        failureThreshold: 1,
        openStateMs: 1_000,
        nowMs: () => 1_000,
        observability,
      }
    );

    await expect(adapter.startRun(PLAN_REF, CONTEXT)).rejects.toThrow('provider outage');
    await expect(adapter.startRun(PLAN_REF, CONTEXT)).rejects.toBeInstanceOf(
      AdapterCircuitOpenError
    );

    expect(metricCalls).toContainEqual({
      name: 'dvt.engine.adapter_circuit_breaker.state',
      labels: { provider: 'temporal', state: 'open' },
      value: 1,
    });
    expect(metricCalls).toContainEqual({
      name: 'dvt.engine.adapter_circuit_breaker.fail_fast_total',
      labels: { operation: 'startRun', provider: 'temporal', state: 'open' },
      value: 1,
    });
  });

  it('builds a protected registry and keeps local adapter metadata outside breaker transitions', () => {
    const raw = makeAdapter({
      capabilities: () => ['basic-execution'],
      estimateRunRef: () => RUN_REF,
      signalSemanticsVersions: () => ['2026-02-01'],
    });

    const registry = buildCircuitBreakingAdapterRegistry(new Map([['temporal', raw]]), {
      failureThreshold: 1,
      openStateMs: 500,
    });
    const protectedAdapter = registry.get('temporal');

    expect(protectedAdapter).toBeInstanceOf(CircuitBreakingProviderAdapter);
    expect(protectedAdapter?.capabilities?.()).toEqual(['basic-execution']);
    expect(protectedAdapter?.estimateRunRef?.(CONTEXT)).toEqual(RUN_REF);
    expect(protectedAdapter?.signalSemanticsVersions()).toEqual(['2026-02-01']);
    expect(getAdapterCircuitBreakerSnapshot(protectedAdapter)).toMatchObject({
      state: 'closed',
      failureCount: 0,
    });
  });
});

function makeAdapter(overrides: Partial<IProviderAdapter> = {}): IProviderAdapter {
  return {
    provider: 'temporal',
    startRun: async () => RUN_REF,
    cancelRun: async () => {},
    getProviderStatusView: async () => ({ provider: 'temporal', providerStatus: 'RUNNING' }),
    signal: async () => {},
    signalSemanticsVersions: () => ['2026-02-01'],
    ...overrides,
  };
}

function makeMetricObservability(
  metricCalls: Array<{ name: string; labels?: Record<string, string>; value: number }>
): IObservability {
  const base = createNoopObservability();
  return {
    ...base,
    metrics: {
      ...base.metrics,
      counter(name, baseLabels) {
        return {
          add(value: number) {
            metricCalls.push({ name, labels: baseLabels, value });
          },
        };
      },
      gauge(name, baseLabels) {
        return {
          set(value: number) {
            metricCalls.push({ name, labels: baseLabels, value });
          },
        };
      },
    },
  };
}
