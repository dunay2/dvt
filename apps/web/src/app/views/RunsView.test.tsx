// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { IRunsPort } from '../ports/runs';
import type { SessionContextPort } from '../ports/sessionContext';
import { ApiError } from '../services/api/createApiClient';
import { AppServicesProvider } from '../services/AppServicesContext';
import { useExecutionStore } from '../stores/executionStore';
import { makeRunContext } from '../testing/contractTestUtils';
import { withTestQueryClient, waitForReactQuery } from '../../testing/reactQueryHarness';
import RunsView from './RunsView';

function buildSessionContext(): SessionContextPort {
  const workspaceScope = {
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    targetAdapter: 'temporal' as const,
  };

  return {
    getWorkspaceScope: () => workspaceScope,
    getWorkspaceScopeSnapshot: () => workspaceScope,
    subscribeWorkspaceScope: () => () => {},
    buildRunContext: (runId: string) =>
      makeRunContext(runId, {
        tenantId: workspaceScope.tenantId,
        projectId: workspaceScope.projectId,
        environmentId: workspaceScope.environmentId,
        targetAdapter: workspaceScope.targetAdapter,
      }),
  };
}

function buildRunsService(overrides?: Partial<IRunsPort>): IRunsPort {
  return {
    listRunSummaries: async () => [],
    getRunSnapshot: async () => null,
    startRun: async () => {
      throw new Error('not used in RunsView test');
    },
    listRunEvents: async () => ({ events: [] }),
    ...overrides,
  };
}

describe('RunsView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

  beforeEach(() => {
    mounted = null;
    useExecutionStore.setState({ currentPlan: null, currentRun: null });
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }
  });

  it('renders the governed empty state for /runs with no records', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          runsService: buildRunsService(),
          sessionContext: buildSessionContext(),
        }}
      >
        <MemoryRouter initialEntries={['/runs']}>
          <Routes>
            <Route path="/runs" element={<RunsView />} />
          </Routes>
        </MemoryRouter>
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-slot="runs-empty-state"]') != null,
      { description: 'runs empty state' }
    );

    expect(mounted.container.textContent).toContain('No runs available');
    expect(mounted.container.textContent).toContain('Go to canvas to plan and start a run');
  });

  it('renders the governed missing state for /runs/:runId when the snapshot is absent', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          runsService: buildRunsService({
            getRunSnapshot: async () => null,
          }),
          sessionContext: buildSessionContext(),
        }}
      >
        <MemoryRouter initialEntries={['/runs/run_404']}>
          <Routes>
            <Route path="/runs/:runId" element={<RunsView />} />
          </Routes>
        </MemoryRouter>
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-slot="run-missing-state"]') != null,
      { description: 'run missing state' }
    );

    expect(mounted.container.textContent).toContain('Run not found');
    expect(mounted.container.textContent).toContain('run_404');
  });

  it('renders completed result evidence on the run detail route', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          runsService: buildRunsService({
            getRunSnapshot: async () => ({
              runId: 'run_completed',
              status: 'completed',
              executor: 'postgres',
              startedAt: '2026-04-07T00:00:00.000Z',
              completedAt: '2026-04-07T00:00:10.000Z',
              execution: {
                materialization: {
                  executor: 'postgres',
                  environmentId: 'env-1',
                  sinkTable: 'analytics.orders_daily',
                  rowsWritten: 42,
                  startedAt: '2026-04-07T00:00:01.000Z',
                  completedAt: '2026-04-07T00:00:10.000Z',
                  durationMs: 9000,
                },
              },
            }),
            listRunEvents: async () => ({ events: [] }),
          }),
          sessionContext: buildSessionContext(),
        }}
      >
        <MemoryRouter initialEntries={['/runs/run_completed']}>
          <Routes>
            <Route path="/runs/:runId" element={<RunsView />} />
          </Routes>
        </MemoryRouter>
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('Materialization evidence') ?? false,
      { description: 'run detail materialization evidence' }
    );

    expect(mounted.container.textContent).toContain('Run run_completed');
    expect(mounted.container.textContent).toContain('Materialization evidence');
    expect(mounted.container.textContent).toContain('postgres');
    expect(mounted.container.textContent).toContain('analytics.orders_daily');
    expect(mounted.container.textContent).toContain('42');
  });

  it('renders failed result diagnostics on the run detail route', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          runsService: buildRunsService({
            getRunSnapshot: async () => ({
              runId: 'run_failed',
              status: 'failed',
              executor: 'postgres',
              startedAt: '2026-04-07T00:00:00.000Z',
              completedAt: '2026-04-07T00:00:10.000Z',
              failedStepId: 'step-transform',
              errorReason: 'STEP_FAILURE',
              execution: {
                failure: {
                  stepId: 'step-transform',
                  reason: 'STEP_FAILURE',
                  failedAt: '2026-04-07T00:00:08.000Z',
                },
              },
            }),
            listRunEvents: async () => ({ events: [] }),
          }),
          sessionContext: buildSessionContext(),
        }}
      >
        <MemoryRouter initialEntries={['/runs/run_failed']}>
          <Routes>
            <Route path="/runs/:runId" element={<RunsView />} />
          </Routes>
        </MemoryRouter>
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('Failure diagnostics') ?? false,
      { description: 'run detail failure diagnostics' }
    );

    expect(mounted.container.textContent).toContain('Run run_failed');
    expect(mounted.container.textContent).toContain('Failure diagnostics');
    expect(mounted.container.textContent).toContain('Executor');
    expect(mounted.container.textContent).toContain('postgres');
    expect(mounted.container.textContent).toContain('step-transform');
    expect(mounted.container.textContent).toContain('STEP_FAILURE');
  });

  it('renders the governed list error state for /runs when the summaries query fails', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          runsService: buildRunsService({
            listRunSummaries: async () => {
              throw new ApiError({
                message: 'HTTP 500',
                endpoint: '/runs',
                statusCode: 500,
                category: 'server',
              });
            },
          }),
          sessionContext: buildSessionContext(),
        }}
      >
        <MemoryRouter initialEntries={['/runs']}>
          <Routes>
            <Route path="/runs" element={<RunsView />} />
          </Routes>
        </MemoryRouter>
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-slot="runs-error-state"]') != null,
      { description: 'runs error state' }
    );

    expect(mounted.container.textContent).toContain('Run list unavailable');
    expect(mounted.container.textContent).toContain('Runtime service is unavailable');
  });
});
