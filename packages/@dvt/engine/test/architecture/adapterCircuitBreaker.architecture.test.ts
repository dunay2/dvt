import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  AdapterCircuitOpenError,
  buildCircuitBreakingAdapterRegistry,
  CircuitBreakingProviderAdapter,
  getAdapterCircuitBreakerSnapshot,
} from '../../src/adapters/CircuitBreakingProviderAdapter.js';
import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { RunHealthService } from '../../src/services/RunHealthService.js';

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

describe('adapter circuit breaker architecture', () => {
  it('exposes adapter fail-fast semantics through one provider decorator API', async () => {
    let delegateCalls = 0;
    const protectedAdapter = new CircuitBreakingProviderAdapter(
      makeAdapter({
        startRun: async () => {
          delegateCalls += 1;
          throw new Error('provider unavailable');
        },
      }),
      { failureThreshold: 1, openStateMs: 1_000, nowMs: () => 1_000 }
    );

    await expect(protectedAdapter.startRun(PLAN_REF, CONTEXT)).rejects.toThrow(
      'provider unavailable'
    );
    await expect(protectedAdapter.startRun(PLAN_REF, CONTEXT)).rejects.toBeInstanceOf(
      AdapterCircuitOpenError
    );

    expect(delegateCalls).toBe(1);
    expect(getAdapterCircuitBreakerSnapshot(protectedAdapter)).toMatchObject({
      provider: 'temporal',
      state: 'open',
      failureCount: 1,
      lastOperation: 'startRun',
    });
  });

  it('forces protected registry composition before provider resolution consumers receive adapters', () => {
    const rawAdapter = makeAdapter();
    const registry = buildCircuitBreakingAdapterRegistry(new Map([['temporal', rawAdapter]]), {
      failureThreshold: 1,
    });

    const resolvedAdapter = registry.get('temporal');

    expect(resolvedAdapter).toBeInstanceOf(CircuitBreakingProviderAdapter);
    expect(resolvedAdapter).not.toBe(rawAdapter);
    expect(getAdapterCircuitBreakerSnapshot(resolvedAdapter)).toMatchObject({
      provider: 'temporal',
      state: 'closed',
      failureCount: 0,
    });
  });

  it('makes breaker posture part of the health read model', async () => {
    const registry = buildCircuitBreakingAdapterRegistry(new Map([['temporal', makeAdapter()]]), {
      failureThreshold: 1,
    });
    const healthService = new RunHealthService({
      stateStoreRead: {} as never,
      adapters: registry,
    });

    await expect(healthService.healthCheck()).resolves.toMatchObject({
      status: 'healthy',
      components: expect.arrayContaining([
        {
          name: 'adapter-temporal',
          status: 'up',
          breaker: {
            provider: 'temporal',
            state: 'closed',
            failureCount: 0,
          },
        },
      ]),
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
