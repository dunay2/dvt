// @vitest-environment jsdom

import {
  createAppServicesTestOverrides,
  createMockCostAttributionSummaryPort,
} from '../../testing/appServicesTestDoubles';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CostAttributionSummary } from '../ports/cost';
import { AppServicesProvider } from '../services/AppServicesContext';
import { useExecutionStore } from '../stores/executionStore';
import type { Run } from '../types/dbt';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import CostView from './CostView';

function buildAttributionSummary(): CostAttributionSummary {
  return {
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    runCount: 1,
    completedStepCount: 1,
    failedStepCount: 1,
    totalStepDurationMs: 1500,
    totalCostAmount: null,
    currency: null,
    costCaptureStatus: 'unavailable',
    observedWindow: {
      firstEventAt: '2026-05-31T10:00:00.000Z',
      lastEventAt: '2026-05-31T10:01:00.000Z',
    },
    runs: [
      {
        runId: 'run_1',
        projectId: 'project-1',
        environmentId: 'env-1',
        planId: 'plan_1',
        planVersion: '1.0.0',
        status: 'COMPLETED',
        completedStepCount: 1,
        failedStepCount: 1,
        totalStepDurationMs: 1500,
        costAmount: null,
        currency: null,
      },
    ],
    steps: [
      {
        runId: 'run_1',
        stepId: 'step-fast',
        eventType: 'StepCompleted',
        durationMs: 500,
        costAmount: null,
        currency: null,
      },
      {
        runId: 'run_1',
        stepId: 'step-slow-failed',
        eventType: 'StepFailed',
        durationMs: 1000,
        costAmount: null,
        currency: null,
      },
    ],
    nextCursor: null,
  };
}

describe('CostView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

  beforeEach(() => {
    mounted = null;
    useExecutionStore.setState({ currentPlan: null, currentRun: null });
    globalThis.ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('renders runtime cost attribution without local monetary estimates', async () => {
    const currentRun: Run = {
      runId: 'run_1',
      planId: 'plan_1',
      status: 'running',
      environment: 'dev',
      gitSha: 'abc123def',
      startTime: '2026-04-04T10:00:00Z',
      events: [],
      steps: [],
    };
    useExecutionStore.setState({ currentPlan: null, currentRun });

    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          costAttributionSummaryPort:
            createMockCostAttributionSummaryPort(buildAttributionSummary()),
        }}
      >
        <CostView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('step-slow-failed') === true,
      { description: 'cost attribution data render' }
    );

    expect(mounted.container.textContent).toContain('Cost capture unavailable');
    expect(mounted.container.textContent).toContain('Top runtime usage drivers');
    expect(mounted.container.textContent).toContain('step-slow-failed');
    expect(mounted.container.textContent).toContain('Duration by run');
    expect(mounted.container.textContent).toContain('Duration by step');
    expect(mounted.container.textContent).toContain('Unavailable');
    expect(mounted.container.textContent).not.toContain('Current run estimate');
    expect(mounted.container.textContent).not.toContain('Average cost per run');
    expect(mounted.container.textContent).not.toContain('fct_sales');

    expect(
      mounted.container.querySelector('[data-slot="cost-capture-unavailable"]')
    ).not.toBeNull();
    expect(
      mounted.container.querySelector('[data-slot="cost-chart-duration-by-run"]')
    ).not.toBeNull();
    expect(
      mounted.container.querySelector('[data-slot="cost-chart-duration-by-step"]')
    ).not.toBeNull();
    expect(mounted.container.querySelector('[data-slot="cost-driver-list"]')).not.toBeNull();
    expect(mounted.container.querySelector('[data-slot="cost-alerts-list"]')).not.toBeNull();
    expect(mounted.container.querySelector('[data-slot="cost-coverage-card"]')).not.toBeNull();
  });

  it('renders error state when cost attribution service fails', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          costAttributionSummaryPort: {
            getCostAttributionSummary: async () =>
              Promise.reject(new Error('cost attribution unavailable')),
          },
        }}
      >
        <CostView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('cost attribution unavailable') === true,
      { description: 'cost error state render' }
    );

    expect(mounted.container.textContent).toContain('cost attribution unavailable');
    expect(mounted.container.textContent).toContain('Cost attribution unavailable');
  });
});
