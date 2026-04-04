// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { IWorkspacePort } from '../ports/workspace';
import type { IRunsPort } from '../ports/runs';
import { AppServicesProvider } from '../services/AppServicesContext';
import { useExecutionStore } from '../stores/executionStore';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import CostView from './CostView';

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
      provider: 'mock',
      tenantId: 'tenant-1',
      workflowId: 'workflow-1',
      runId: 'run_1',
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

    await act(async () => {
      await Promise.resolve();
    });

    expect(mounted.container.textContent).toContain('Cost data unavailable');
    expect(mounted.container.textContent).toContain('workspace unavailable');
  });
});
