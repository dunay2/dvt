// @vitest-environment jsdom

import { ContractValidationError } from '@dvt/contracts';
import React, { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { createMockRunsService } from '../../testing/runsPortDoubles';
import {
  createTestQueryClient,
  waitForReactQuery,
  withTestQueryClient,
} from '../../testing/reactQueryHarness';
import { makeRunContext } from '../testing/contractTestUtils';
import type { IRunsPort, UiRunStatus } from '../ports/runs';
import type { SessionContextPort, WorkspaceScope } from '../ports/sessionContext';
import { ApiError } from '../services/api/createApiClient';
import type { RunEvent } from '../types/engine';
import { AppServicesProvider } from '../services/AppServicesContext';
import { RUN_EVENT_LIVE_POLL_INTERVAL_MS } from '../services/runs/runEventTimelineModel';
import { queryKeys } from './queryKeys';
import {
  classifyRunEventFeedFailure,
  getRunEventFeedRefetchInterval,
  useRunEventFeedQuery,
} from './runEventFeedQuery';

const TEST_WORKSPACE_LAYOUT_KEY = 'tenant-1::project-1::env-1';

function makeEvent(runId: string, eventId: string, runSeq: number): RunEvent {
  return {
    eventId,
    eventType: 'StepStarted',
    runId,
    emittedAt: `2026-07-10T10:00:0${runSeq}.000Z`,
    tenantId: 'tenant_1',
    projectId: 'project_1',
    environmentId: 'environment_1',
    planId: 'plan_1',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: `${runId}-${eventId}`,
    payloadVersion: 1,
    stepId: 'model.orders',
    runSeq,
    persistedAt: `2026-07-10T10:00:0${runSeq}.000Z`,
  } as RunEvent;
}

function buildRunsService(listRunEvents: IRunsPort['listRunEvents']): IRunsPort {
  return {
    ...createMockRunsService(),
    listRunSummaries: vi.fn(async () => []),
    getRunSnapshot: vi.fn(async () => null),
    startRun: vi.fn(async () => ({ runId: 'run_started', accepted: true })),
    listRunEvents,
  };
}

function createReactiveSessionContext(initialScope: WorkspaceScope): {
  sessionContext: SessionContextPort;
  setWorkspaceScope: (scope: WorkspaceScope) => void;
} {
  let workspaceScope = initialScope;
  const listeners = new Set<() => void>();

  return {
    sessionContext: {
      getWorkspaceScope: () => workspaceScope,
      getWorkspaceScopeSnapshot: () => workspaceScope,
      subscribeWorkspaceScope: (onStoreChange) => {
        listeners.add(onStoreChange);
        return () => listeners.delete(onStoreChange);
      },
      buildRunContext: (runId) => makeRunContext(runId, workspaceScope),
    },
    setWorkspaceScope: (scope) => {
      workspaceScope = scope;
      listeners.forEach((listener) => listener());
    },
  };
}

function FeedConsumer({
  consumerId,
  runId,
  runStatus,
}: Readonly<{
  consumerId: string;
  runId: string;
  runStatus?: UiRunStatus;
}>): React.JSX.Element {
  const query = useRunEventFeedQuery(runId, { runStatus });
  const eventIds =
    query.feedState.phase === 'idle' ? [] : query.feedState.events.map(({ eventId }) => eventId);

  return (
    <div>
      <div data-testid={consumerId}>{eventIds?.join(',') ?? 'loading'}</div>
      <div data-testid={`${consumerId}-phase`}>{query.feedState.phase}</div>
      <button
        type="button"
        data-testid={`${consumerId}-retry`}
        onClick={() => {
          void query.retryNow();
        }}
      >
        Retry
      </button>
    </div>
  );
}

describe('useRunEventFeedQuery', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null = null;

  afterEach(async () => {
    await mounted?.cleanup();
    mounted = null;
    vi.useRealTimers();
  });

  function withServices(
    runsService: IRunsPort,
    consumers: React.ReactNode,
    sessionContext?: SessionContextPort
  ): React.ReactNode {
    return (
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          runsService,
          ...(sessionContext ? { sessionContext } : {}),
        }}
      >
        {consumers}
      </AppServicesProvider>
    );
  }

  it('publishes the canonical initial-loading state before the first page resolves', async () => {
    let resolvePage: ((page: { events: RunEvent[] }) => void) | undefined;
    const listRunEvents = vi.fn<IRunsPort['listRunEvents']>(
      () =>
        new Promise((resolve) => {
          resolvePage = resolve;
        })
    );

    mounted = await withTestQueryClient(
      withServices(
        buildRunsService(listRunEvents),
        <FeedConsumer consumerId="feed" runId="run_1" />
      )
    );

    expect(mounted.container.querySelector('[data-testid="feed-phase"]')?.textContent).toBe(
      'initial-loading'
    );

    await act(async () => {
      resolvePage?.({ events: [] });
      await Promise.resolve();
    });
  });

  it('shares one accumulated cursor across consumers, invalidation, and remount', async () => {
    const listRunEvents = vi
      .fn<IRunsPort['listRunEvents']>()
      .mockResolvedValueOnce({ events: [makeEvent('run_1', 'evt_1', 1)], nextAfterSeq: 1 })
      .mockResolvedValueOnce({
        events: [makeEvent('run_1', 'evt_1', 1), makeEvent('run_1', 'evt_2', 2)],
        nextAfterSeq: 2,
      });
    const runsService = buildRunsService(listRunEvents);
    const queryClient = createTestQueryClient();

    mounted = await withTestQueryClient(
      withServices(
        runsService,
        <>
          <FeedConsumer consumerId="console" runId="run_1" />
          <FeedConsumer consumerId="runs" runId="run_1" />
        </>
      ),
      queryClient
    );
    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-testid="console"]')?.textContent === 'evt_1'
    );
    expect(listRunEvents).toHaveBeenCalledTimes(1);

    await queryClient.invalidateQueries({
      queryKey: queryKeys.runs.eventFeed(TEST_WORKSPACE_LAYOUT_KEY, 'run_1'),
    });
    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-testid="runs"]')?.textContent === 'evt_1,evt_2'
    );
    expect(listRunEvents).toHaveBeenNthCalledWith(2, 'run_1', 1);

    await mounted.render(
      withServices(runsService, <FeedConsumer consumerId="remount" runId="run_1" />)
    );
    expect(mounted.container.querySelector('[data-testid="remount"]')?.textContent).toBe(
      'evt_1,evt_2'
    );
    expect(listRunEvents).toHaveBeenCalledTimes(2);
  });

  it('isolates event and cursor state when consumers switch runs', async () => {
    const listRunEvents = vi.fn<IRunsPort['listRunEvents']>(async (runId, afterSeq) => ({
      events: [makeEvent(runId, `${runId}-evt`, 1)],
      nextAfterSeq: afterSeq === undefined ? 1 : afterSeq,
    }));
    const runsService = buildRunsService(listRunEvents);
    const queryClient = createTestQueryClient();

    mounted = await withTestQueryClient(
      withServices(runsService, <FeedConsumer consumerId="active" runId="run_1" />),
      queryClient
    );
    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-testid="active"]')?.textContent === 'run_1-evt'
    );

    await mounted.render(
      withServices(runsService, <FeedConsumer consumerId="active" runId="run_2" />)
    );
    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-testid="active"]')?.textContent === 'run_2-evt'
    );

    expect(listRunEvents).toHaveBeenNthCalledWith(1, 'run_1', undefined);
    expect(listRunEvents).toHaveBeenNthCalledWith(2, 'run_2', undefined);
  });

  it('isolates terminal feed caches when the workspace scope changes', async () => {
    const { sessionContext, setWorkspaceScope } = createReactiveSessionContext({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
      targetAdapter: 'temporal',
    });
    const listRunEvents = vi.fn<IRunsPort['listRunEvents']>(async (runId) => {
      const tenantId = sessionContext.getWorkspaceScope().tenantId;
      return {
        events: [
          {
            ...makeEvent(runId, `${tenantId}-terminal`, 1),
            eventType: 'RunCompleted',
          },
        ],
        nextAfterSeq: 1,
      };
    });

    mounted = await withTestQueryClient(
      withServices(
        buildRunsService(listRunEvents),
        <FeedConsumer consumerId="scoped" runId="shared-run" runStatus="completed" />,
        sessionContext
      ),
      createTestQueryClient()
    );
    await waitForReactQuery(
      () =>
        mounted?.container.querySelector('[data-testid="scoped"]')?.textContent ===
        'tenant-a-terminal'
    );

    await act(async () => {
      setWorkspaceScope({
        tenantId: 'tenant-b',
        projectId: 'project-b',
        environmentId: 'env-b',
        targetAdapter: 'temporal',
      });
    });
    await waitForReactQuery(
      () =>
        mounted?.container.querySelector('[data-testid="scoped"]')?.textContent ===
        'tenant-b-terminal'
    );

    expect(listRunEvents).toHaveBeenCalledTimes(2);
  });

  it('classifies retryable and fail-closed event-feed errors', () => {
    const makeApiError = (statusCode: number, category: ApiError['category']): ApiError =>
      new ApiError({
        message: `HTTP ${statusCode}`,
        endpoint: '/runs/run_1/events',
        statusCode,
        category,
      });

    expect(classifyRunEventFeedFailure(makeApiError(401, 'unauthorized'))).toMatchObject({
      kind: 'authorization',
      retryable: false,
      statusCode: 401,
    });
    expect(classifyRunEventFeedFailure(makeApiError(404, 'client'))).toMatchObject({
      kind: 'missing-run',
      retryable: false,
      statusCode: 404,
    });
    expect(classifyRunEventFeedFailure(makeApiError(422, 'client'))).toMatchObject({
      kind: 'validation',
      retryable: false,
      statusCode: 422,
    });
    expect(classifyRunEventFeedFailure(makeApiError(429, 'client'))).toMatchObject({
      kind: 'transport',
      retryable: true,
      statusCode: 429,
    });
    expect(classifyRunEventFeedFailure(makeApiError(503, 'server'))).toMatchObject({
      kind: 'transport',
      retryable: true,
      statusCode: 503,
    });
    expect(
      classifyRunEventFeedFailure(
        new ContractValidationError([
          { path: 'events.0.runSeq', code: 'invalid_type', message: 'Expected number' },
        ])
      )
    ).toMatchObject({
      kind: 'validation',
      retryable: false,
      statusCode: 400,
    });
  });

  it('schedules only bounded recovery and terminal-drain polling', () => {
    const retrying = {
      phase: 'retrying',
      runId: 'run_1',
      events: [],
      consecutiveFailures: 1,
      nextRetryAt: '2026-07-10T10:00:01.000Z',
    } as const;
    const exhaustedStale = {
      ...retrying,
      phase: 'stale',
      consecutiveFailures: 4,
      nextRetryAt: undefined,
    } as const;
    const terminalDraining = {
      ...retrying,
      phase: 'terminal-draining',
      consecutiveFailures: 0,
      nextRetryAt: undefined,
      expectedTerminalEventType: 'RunCompleted',
      terminalDrainPages: 1,
    } as const;
    const complete = { ...terminalDraining, phase: 'complete' } as const;

    expect(
      getRunEventFeedRefetchInterval(retrying, 'running', Date.parse('2026-07-10T10:00:00.000Z'))
    ).toBe(1_000);
    expect(getRunEventFeedRefetchInterval(exhaustedStale, 'running')).toBe(false);
    expect(getRunEventFeedRefetchInterval(terminalDraining, 'completed')).toBe(
      RUN_EVENT_LIVE_POLL_INTERVAL_MS
    );
    expect(getRunEventFeedRefetchInterval(complete, 'completed')).toBe(false);
  });

  it('models a retryable first-load failure without inventing events or a cursor', async () => {
    const listRunEvents = vi.fn<IRunsPort['listRunEvents']>().mockRejectedValue(
      new ApiError({
        message: 'Runtime unavailable',
        endpoint: '/runs/run_1/events',
        statusCode: 503,
        category: 'server',
      })
    );
    const queryClient = createTestQueryClient();

    mounted = await withTestQueryClient(
      withServices(
        buildRunsService(listRunEvents),
        <FeedConsumer consumerId="first-load" runId="run_1" />
      ),
      queryClient
    );
    await waitForReactQuery(
      () =>
        mounted?.container.querySelector('[data-testid="first-load-phase"]')?.textContent ===
        'retrying'
    );

    expect(
      queryClient.getQueryData(queryKeys.runs.eventFeed(TEST_WORKSPACE_LAYOUT_KEY, 'run_1'))
    ).toMatchObject({
      phase: 'retrying',
      events: [],
      consecutiveFailures: 1,
      failure: { kind: 'transport', retryable: true, statusCode: 503 },
    });
    expect(listRunEvents).toHaveBeenCalledWith('run_1', undefined);
  });

  it('retains accumulated events through intermittent failure and manual recovery', async () => {
    const listRunEvents = vi
      .fn<IRunsPort['listRunEvents']>()
      .mockResolvedValueOnce({ events: [makeEvent('run_1', 'evt_1', 1)], nextAfterSeq: 1 })
      .mockRejectedValueOnce(
        new ApiError({
          message: 'Runtime unavailable',
          endpoint: '/runs/run_1/events',
          statusCode: 503,
          category: 'server',
        })
      )
      .mockResolvedValueOnce({ events: [makeEvent('run_1', 'evt_2', 2)], nextAfterSeq: 2 });
    const queryClient = createTestQueryClient();

    mounted = await withTestQueryClient(
      withServices(
        buildRunsService(listRunEvents),
        <FeedConsumer consumerId="active" runId="run_1" />
      ),
      queryClient
    );
    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-testid="active"]')?.textContent === 'evt_1'
    );

    await queryClient.invalidateQueries({
      queryKey: queryKeys.runs.eventFeed(TEST_WORKSPACE_LAYOUT_KEY, 'run_1'),
    });
    await waitForReactQuery(
      () =>
        mounted?.container.querySelector('[data-testid="active-phase"]')?.textContent === 'retrying'
    );
    expect(mounted.container.querySelector('[data-testid="active"]')?.textContent).toBe('evt_1');

    mounted.container.querySelector<HTMLButtonElement>('[data-testid="active-retry"]')?.click();
    await waitForReactQuery(
      () =>
        mounted?.container.querySelector('[data-testid="active"]')?.textContent === 'evt_1,evt_2'
    );

    expect(listRunEvents).toHaveBeenNthCalledWith(2, 'run_1', 1);
    expect(listRunEvents).toHaveBeenNthCalledWith(3, 'run_1', 1);
    expect(mounted.container.querySelector('[data-testid="active-phase"]')?.textContent).toBe(
      'live'
    );
  });

  it('automatically resumes from the observed cursor without loss, duplication, or reordering', async () => {
    vi.useFakeTimers();
    vi.setSystemTime('2026-07-10T10:00:00.000Z');
    const listRunEvents = vi
      .fn<IRunsPort['listRunEvents']>()
      .mockResolvedValueOnce({ events: [makeEvent('run_1', 'evt_1', 1)], nextAfterSeq: 1 })
      .mockRejectedValueOnce(
        new ApiError({
          message: 'Runtime unavailable',
          endpoint: '/runs/run_1/events',
          statusCode: 503,
          category: 'server',
        })
      )
      .mockResolvedValueOnce({
        events: [makeEvent('run_1', 'evt_1', 1), makeEvent('run_1', 'evt_2', 2)],
        nextAfterSeq: 2,
      });

    mounted = await withTestQueryClient(
      withServices(
        buildRunsService(listRunEvents),
        <FeedConsumer consumerId="automatic" runId="run_1" runStatus="running" />
      ),
      createTestQueryClient()
    );
    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-testid="automatic"]')?.textContent === 'evt_1',
      {
        tick: async () => {
          await vi.advanceTimersByTimeAsync(1);
        },
      }
    );

    await waitForReactQuery(
      () =>
        mounted?.container.querySelector('[data-testid="automatic-phase"]')?.textContent ===
        'retrying',
      {
        intervalMs: RUN_EVENT_LIVE_POLL_INTERVAL_MS,
        tick: async () => {
          await vi.advanceTimersByTimeAsync(RUN_EVENT_LIVE_POLL_INTERVAL_MS);
        },
        timeoutMs: RUN_EVENT_LIVE_POLL_INTERVAL_MS,
      }
    );
    await waitForReactQuery(
      () =>
        mounted?.container.querySelector('[data-testid="automatic"]')?.textContent ===
        'evt_1,evt_2',
      {
        intervalMs: 1_000,
        tick: async () => {
          await vi.advanceTimersByTimeAsync(1_000);
        },
        timeoutMs: 1_000,
      }
    );

    expect(listRunEvents).toHaveBeenNthCalledWith(1, 'run_1', undefined);
    expect(listRunEvents).toHaveBeenNthCalledWith(2, 'run_1', 1);
    expect(listRunEvents).toHaveBeenNthCalledWith(3, 'run_1', 1);
    expect(mounted.container.querySelector('[data-testid="automatic-phase"]')?.textContent).toBe(
      'live'
    );
  });

  it('fails closed on a non-retryable first-load error', async () => {
    const listRunEvents = vi.fn<IRunsPort['listRunEvents']>().mockRejectedValue(
      new ApiError({
        message: 'Forbidden',
        endpoint: '/runs/run_1/events',
        statusCode: 403,
        category: 'forbidden',
      })
    );
    const queryClient = createTestQueryClient();

    mounted = await withTestQueryClient(
      withServices(
        buildRunsService(listRunEvents),
        <FeedConsumer consumerId="denied" runId="run_1" />
      ),
      queryClient
    );
    await waitForReactQuery(
      () =>
        mounted?.container.querySelector('[data-testid="denied-phase"]')?.textContent === 'failed'
    );

    expect(
      queryClient.getQueryData(queryKeys.runs.eventFeed(TEST_WORKSPACE_LAYOUT_KEY, 'run_1'))
    ).toMatchObject({
      phase: 'failed',
      events: [],
      failure: { kind: 'authorization', retryable: false, statusCode: 403 },
    });
    expect(listRunEvents).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['completed', 'RunCompleted'],
    ['failed', 'RunFailed'],
    ['cancelled', 'RunCancelled'],
  ] satisfies ReadonlyArray<readonly [UiRunStatus, RunEvent['eventType']]>)(
    'drains a %s run until its matching terminal event is observed',
    async (runStatus, terminalEventType) => {
      const consumerId = `terminal-${runStatus}`;
      const terminalEvent = {
        ...makeEvent('run_1', 'evt_terminal', 2),
        eventType: terminalEventType,
        stepId: undefined,
      } as RunEvent;
      const listRunEvents = vi
        .fn<IRunsPort['listRunEvents']>()
        .mockResolvedValueOnce({ events: [makeEvent('run_1', 'evt_1', 1)], nextAfterSeq: 1 })
        .mockResolvedValueOnce({ events: [terminalEvent], nextAfterSeq: 2 });
      const queryClient = createTestQueryClient();

      mounted = await withTestQueryClient(
        withServices(
          buildRunsService(listRunEvents),
          <FeedConsumer consumerId={consumerId} runId="run_1" runStatus={runStatus} />
        ),
        queryClient
      );
      await waitForReactQuery(
        () =>
          mounted?.container.querySelector(`[data-testid="${consumerId}-phase"]`)?.textContent ===
          'terminal-draining'
      );

      await queryClient.invalidateQueries({
        queryKey: queryKeys.runs.eventFeed(TEST_WORKSPACE_LAYOUT_KEY, 'run_1'),
      });
      await waitForReactQuery(
        () =>
          mounted?.container.querySelector(`[data-testid="${consumerId}-phase"]`)?.textContent ===
          'complete'
      );

      expect(listRunEvents).toHaveBeenNthCalledWith(2, 'run_1', 1);
      expect(mounted.container.querySelector(`[data-testid="${consumerId}"]`)?.textContent).toBe(
        'evt_1,evt_terminal'
      );
    }
  );
});
