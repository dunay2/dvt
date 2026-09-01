// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { createMockRunsService } from '../../testing/runsPortDoubles';
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IRunsPort } from '../ports/runs';
import type { SessionContextPort } from '../ports/sessionContext';
import { ApiError } from '../services/api/createApiClient';
import { AppServicesProvider } from '../services/AppServicesContext';
import { useExecutionStore } from '../stores/executionStore';
import type { RunEvent } from '../types/engine';
import { iso, makeRunContext, stepId } from '../testing/contractTestUtils';
import { withTestQueryClient, waitForReactQuery } from '../../testing/reactQueryHarness';
import RunsView from './RunsView';
import { selectRunDetailTab } from './runs/test/RunStatesHarness';

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
    ...createMockRunsService(),
    listRunSummaries: async () => [],
    getRunSnapshot: async () => null,
    startRun: async () => {
      throw new Error('not used in RunsView test');
    },
    listRunEvents: async () => ({ events: [] }),
    ...overrides,
  };
}

function buildRunEvent(overrides: Partial<RunEvent>): RunEvent {
  return {
    eventId: 'evt-1',
    eventType: 'StepStarted',
    runId: 'run_1',
    emittedAt: iso('2026-05-18T10:00:00.000Z'),
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    planId: 'plan-1',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: 'id-1',
    payloadVersion: 1,
    runSeq: 1,
    persistedAt: iso('2026-05-18T10:00:00.000Z'),
    ...overrides,
  } as RunEvent;
}

function RunsDetailWithNavigation({
  targetRunId,
}: Readonly<{ targetRunId: string }>): React.ReactElement {
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void navigate(`/runs/${targetRunId}`);
        }}
      >
        Open target run
      </button>
      <RunsView />
    </>
  );
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
    expect(mounted.container.textContent).toContain('Go to canvas to preview and start a run');
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

    await waitForReactQuery(() => mounted?.container.querySelector('[role="tab"]') != null, {
      description: 'run detail tabs',
    });
    await selectRunDetailTab(mounted.container, 'Result');

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

    await waitForReactQuery(() => mounted?.container.querySelector('[role="tab"]') != null, {
      description: 'run detail tabs',
    });

    expect(mounted.container.textContent).toContain('Run run_failed');
    expect(mounted.container.textContent).toContain('Executor');
    expect(mounted.container.textContent).toContain('postgres');
    expect(
      mounted.container.querySelector('[data-slot="run-detail-diagnostics-tab"]')
    ).not.toBeNull();

    await selectRunDetailTab(mounted.container, 'Diagnostics and events');

    expect(mounted.container.textContent).toContain('Failure diagnostics');
    expect(mounted.container.textContent).toContain('step-transform');
    expect(mounted.container.textContent).toContain('STEP_FAILURE');
  });

  it('keeps the shell console observed run when returning from run detail to canvas', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          runsService: buildRunsService({
            getRunSnapshot: async () => ({
              runId: 'run_console_observed',
              planId: 'plan-console-observed',
              status: 'failed',
              executor: 'postgres',
              environment: 'env-1',
              startedAt: '2026-04-07T00:00:00.000Z',
              completedAt: '2026-04-07T00:00:10.000Z',
            }),
            listRunEvents: async () => ({ events: [] }),
          }),
          sessionContext: buildSessionContext(),
        }}
      >
        <MemoryRouter initialEntries={['/runs/run_console_observed']}>
          <Routes>
            <Route path="/runs/:runId" element={<RunsView />} />
            <Route path="/canvas" element={<div data-testid="canvas-route">Canvas route</div>} />
          </Routes>
        </MemoryRouter>
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => useExecutionStore.getState().currentRun?.runId === 'run_console_observed',
      { description: 'focused run published to shell console evidence' }
    );

    const backToCanvasLink = Array.from(mounted.container.querySelectorAll('a')).find((link) =>
      link.textContent?.includes('Back to Canvas')
    );

    expect(backToCanvasLink).toBeTruthy();
    await act(async () => {
      fireEvent.click(backToCanvasLink!);
    });

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('Canvas route') ?? false,
      { description: 'canvas route after leaving run detail' }
    );

    expect(useExecutionStore.getState().currentRun?.runId).toBe('run_console_observed');
  });

  it('restores current plan step status from authoritative run evidence for Canvas cards', async () => {
    useExecutionStore.setState({
      currentPlan: {
        planId: 'plan-canvas-status',
        planVersion: '1.0.0',
        generatedAt: '2026-04-07T00:00:00.000Z',
        adapter: 'postgres',
        target: 'env-1',
        capabilities: [],
        steps: [
          {
            id: 'step-transform',
            type: 'SQL_TRANSFORM',
            name: 'Transform orders',
            nodes: ['dvt-transform-1'],
            policies: {},
          },
        ],
      },
      currentRun: null,
    });

    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          runsService: buildRunsService({
            getRunSnapshot: async () => ({
              runId: 'run_canvas_status',
              planId: 'plan-canvas-status',
              status: 'completed',
              executor: 'postgres',
              environment: 'env-1',
              startedAt: '2026-04-07T00:00:00.000Z',
              completedAt: '2026-04-07T00:00:10.000Z',
            }),
            listRunEvents: async () => ({
              events: [
                buildRunEvent({
                  eventId: 'evt-step-completed',
                  eventType: 'StepCompleted',
                  runId: 'run_canvas_status',
                  stepId: stepId('step-transform'),
                  payload: { gatewayDecision: true },
                }),
              ],
            }),
          }),
          sessionContext: buildSessionContext(),
        }}
      >
        <MemoryRouter initialEntries={['/runs/run_canvas_status']}>
          <Routes>
            <Route path="/runs/:runId" element={<RunsView />} />
          </Routes>
        </MemoryRouter>
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => useExecutionStore.getState().currentRun?.steps[0]?.status === 'success',
      { description: 'completed plan step restored for Canvas runtime projection' }
    );

    expect(useExecutionStore.getState().currentRun?.steps).toEqual([
      expect.objectContaining({
        id: 'step-transform',
        nodes: ['dvt-transform-1'],
        status: 'success',
      }),
    ]);
  });

  it('clears the shell console observed run when another run detail has no workspace', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          runsService: buildRunsService({
            getRunSnapshot: async (requestedRunId) => {
              if (requestedRunId === 'run_previous') {
                return {
                  runId: 'run_previous',
                  planId: 'plan-previous',
                  status: 'running',
                  executor: 'postgres',
                  environment: 'env-1',
                  startedAt: '2026-04-07T00:00:00.000Z',
                };
              }

              return null;
            },
            listRunEvents: async () => ({ events: [] }),
          }),
          sessionContext: buildSessionContext(),
        }}
      >
        <MemoryRouter initialEntries={['/runs/run_previous']}>
          <Routes>
            <Route
              path="/runs/:runId"
              element={<RunsDetailWithNavigation targetRunId="run_missing" />}
            />
          </Routes>
        </MemoryRouter>
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => useExecutionStore.getState().currentRun?.runId === 'run_previous',
      { description: 'previous run published to shell console evidence' }
    );

    const openTargetRunButton = Array.from(mounted.container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Open target run')
    );

    expect(openTargetRunButton).toBeTruthy();
    await act(async () => {
      fireEvent.click(openTargetRunButton!);
    });

    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-slot="run-missing-state"]') != null,
      { description: 'new detail route missing state' }
    );

    expect(useExecutionStore.getState().currentRun).toBeNull();
  });

  it('renders available run timeline events as a dense semantic table', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          runsService: buildRunsService({
            getRunSnapshot: async () => ({
              runId: 'run_table_timeline',
              status: 'running',
              executor: 'postgres',
              startedAt: '2026-05-18T10:00:00.000Z',
            }),
            listRunEvents: async () => ({
              events: [
                buildRunEvent({
                  eventId: 'evt-step-started',
                  eventType: 'StepStarted',
                  runId: 'run_table_timeline',
                  stepId: stepId('step-load'),
                  payload: { message: 'Loading source rows' },
                }),
                buildRunEvent({
                  eventId: 'evt-run-started',
                  eventType: 'RunStarted',
                  runId: 'run_table_timeline',
                  runSeq: 2,
                  emittedAt: iso('2026-05-18T10:00:01.000Z'),
                }),
              ],
            }),
          }),
          sessionContext: buildSessionContext(),
        }}
      >
        <MemoryRouter initialEntries={['/runs/run_table_timeline']}>
          <Routes>
            <Route path="/runs/:runId" element={<RunsView />} />
          </Routes>
        </MemoryRouter>
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.querySelector('[role="tab"]') != null, {
      description: 'run detail tabs',
    });
    await selectRunDetailTab(mounted.container, 'Diagnostics and events');

    expect(mounted.container.textContent).toContain('Event timeline');
    expect(mounted.container.textContent).toContain('Step started');
    expect(mounted.container.textContent).toContain('Run started');
    expect(mounted.container.textContent).toContain('step-load');
    expect(mounted.container.textContent).toContain('Loading source rows');
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

  it('recovers a failed run and navigates to the server-created run identity', async () => {
    const recoverRun = vi.fn<IRunsPort['recoverRun']>(async (sourceRunId) => ({
      contractVersion: 'v1',
      sourceRunId,
      recoveryRunId: 'run_recovery',
      accepted: true,
    }));
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          runsService: buildRunsService({
            getRunSnapshot: async () => ({
              runId: 'run_failed',
              status: 'failed',
              controls: {
                cancel: { available: false, reason: 'run_terminal' },
                recover: { available: true },
              },
            }),
            recoverRun,
          }),
          sessionContext: buildSessionContext(),
        }}
      >
        <MemoryRouter initialEntries={['/runs/run_failed']}>
          <Routes>
            <Route path="/runs/run_recovery" element={<div>Recovery run route</div>} />
            <Route path="/runs/:runId" element={<RunsView />} />
          </Routes>
        </MemoryRouter>
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.querySelector('[aria-label="Run plan again"]') != null,
      { description: 'run-again control in run detail' }
    );
    await act(async () => {
      fireEvent.click(mounted!.container.querySelector('[aria-label="Run plan again"]')!);
    });

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('Recovery run route') ?? false,
      { description: 'server-created recovery run route' }
    );
    expect(recoverRun).toHaveBeenCalledWith('run_failed');
  });
});
