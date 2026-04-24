// @vitest-environment jsdom

import React, { act, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IWorkspacePort } from '../ports/workspace';
import type { IRunsPort } from '../ports/runs';
import { AppServicesProvider } from '../services/AppServicesContext';
import { useExecutionStore } from '../stores/executionStore';
import type { Run } from '../types/dbt';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import CostView from './CostView';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  const ReactModule = await import('react');

  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: unknown }) => {
      const width = 800;
      const height = 260;
      const chartWithFixedSize: ReactNode = ReactModule.isValidElement(children)
        ? ReactModule.cloneElement(
            children as ReactElement<{ readonly width?: number; readonly height?: number }>,
            { width, height }
          )
        : (children as ReactNode);

      return ReactModule.createElement(
        'div',
        {
          'data-slot': 'mock-responsive-container',
          style: { width, height },
        },
        chartWithFixedSize
      );
    },
  };
});

function buildWorkspaceService(overrides?: Partial<IWorkspacePort>): IWorkspacePort {
  return {
    getGraphSnapshot: async () => ({
      nodes: [
        {
          id: 'node-1',
          name: 'fct_sales',
          type: 'MODEL',
          package: 'analytics',
          path: 'models/fct_sales.sql',
          tags: [],
          status: 'success',
          lastCost: 0.8,
          lastDuration: 20,
          dependencies: [],
        },
      ],
      edges: [],
    }),
    getDiffChanges: async () => [],
    getPlugins: async () => [],
    getRoles: async () => [],
    getAuditLog: async () => [],
    listWarehouseConnections: async () => [],
    listWarehouseTables: async () => [],
    importSources: async () => ({
      success: true,
      sourcesCreated: 0,
      tablesImported: 0,
      yamlFiles: [],
      grouping: 'schema',
      options: {
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      },
    }),
    listFiles: async () => [],
    getFileContent: async (path) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content: '',
      lastModified: '2026-04-06T00:00:00Z',
    }),
    saveFileContent: async (path, content) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content,
      lastModified: '2026-04-06T00:00:00Z',
    }),
    ...overrides,
  };
}

function buildRunsService(overrides?: Partial<IRunsPort>): IRunsPort {
  return {
    listRunSummaries: async () => [
      {
        runId: 'run_1',
        status: 'completed',
        startedAt: '2026-04-04T10:00:00Z',
      },
    ],
    getRunSnapshot: async () => null,
    startRun: async () => ({
      runId: 'run_1',
      accepted: true,
    }),
    listRunEvents: async () => ({ events: [] }),
    ...overrides,
  };
}

describe('CostView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

  beforeEach(() => {
    mounted = null;
    useExecutionStore.setState({ currentPlan: null, currentRun: null });
    (
      globalThis as typeof globalThis & {
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as new (callback: ResizeObserverCallback) => ResizeObserver;
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('renders the cost summary view', async () => {
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
          mode: 'mock',
          workspaceService: buildWorkspaceService(),
          runsService: buildRunsService(),
        }}
      >
        <CostView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_sales') === true, {
      description: 'cost view data render',
    });

    expect(mounted.container.textContent).toContain('Cost');
    expect(mounted.container.textContent).toContain('Top cost drivers');
    expect(mounted.container.textContent).toContain('fct_sales');

    const routeFrame = mounted.container.querySelector('[data-slot="route-workbench-frame"]');
    const headerBand = mounted.container.querySelector('[data-slot="cost-view-header-band"]');
    const currentRunEstimate = mounted.container.querySelector(
      '[data-slot="cost-current-run-estimate"]'
    );
    const costByRunChart = mounted.container.querySelector('[data-slot="cost-chart-cost-by-run"]');
    const durationByModelChart = mounted.container.querySelector(
      '[data-slot="cost-chart-duration-by-model"]'
    );
    const driverList = mounted.container.querySelector('[data-slot="cost-driver-list"]');
    const alertsList = mounted.container.querySelector('[data-slot="cost-alerts-list"]');
    const alertCard = mounted.container.querySelector('[data-slot="cost-alert-card"]');
    const coverageCard = mounted.container.querySelector('[data-slot="cost-coverage-card"]');

    expect(routeFrame?.className).toContain('bg-[var(--surface-route)]');
    expect(headerBand?.className).toContain('bg-[var(--surface-panel)]');
    expect(headerBand?.className).toContain('border-[color:var(--border-default)]');
    expect(currentRunEstimate?.className).toContain('bg-[var(--status-success)]');
    expect(currentRunEstimate?.className).toContain('text-[var(--surface-app)]');
    expect(costByRunChart?.className).toContain('bg-[var(--surface-panel)]');
    expect(costByRunChart?.querySelector('[data-slot="chart"]')).not.toBeNull();
    expect(durationByModelChart?.querySelector('[data-slot="chart"]')).not.toBeNull();
    expect(driverList?.className).toContain('bg-[var(--surface-panel)]');
    expect(alertsList?.className).toContain('bg-[var(--surface-panel)]');
    expect(alertsList?.className).toContain('border-[color:var(--border-default)]');
    expect(alertCard?.className).toContain('border-[color:var(--status-warning)]');
    expect(alertCard?.className).toContain('bg-[var(--surface-elevated)]');
    expect(coverageCard?.className).toContain('bg-[var(--surface-panel)]');
    expect(mounted.container.innerHTML).not.toContain('bg-slate-900');
    expect(mounted.container.innerHTML).not.toContain('bg-slate-950');
    expect(mounted.container.innerHTML).not.toContain('border-slate-700');
    expect(alertCard?.innerHTML).not.toContain('border-yellow-800');
    expect(mounted.container.innerHTML).not.toContain('text-green-400');
    expect(alertCard?.innerHTML).not.toContain('text-yellow-400');
    expect(mounted.container.innerHTML).not.toContain('bg-emerald-700');
  });

  it('renders error state when services fail', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          mode: 'api',
          workspaceService: buildWorkspaceService({
            getGraphSnapshot: async () => {
              throw new Error('workspace unavailable');
            },
          }),
          runsService: buildRunsService(),
        }}
      >
        <CostView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('workspace unavailable') === true,
      { description: 'cost error state render' }
    );

    expect(mounted.container.textContent).toContain('workspace unavailable');
    expect(mounted.container.textContent).toContain('Cost alerts');
  });
});
