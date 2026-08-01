// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import {
  createTestQueryClient,
  waitForReactQuery,
  withTestQueryClient,
} from '../../testing/reactQueryHarness';
import type { IRunsPort } from '../ports/runs';
import type { RunEvent } from '../types/engine';
import { AppServicesProvider } from '../services/AppServicesContext';
import { queryKeys } from './queryKeys';
import { useRunEventFeedQuery } from './runEventFeedQuery';

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
    listRunSummaries: vi.fn(async () => []),
    getRunSnapshot: vi.fn(async () => null),
    startRun: vi.fn(async () => ({ runId: 'run_started', accepted: true })),
    listRunEvents,
  };
}

function FeedConsumer({ consumerId, runId }: Readonly<{ consumerId: string; runId: string }>) {
  const query = useRunEventFeedQuery(runId, { isLive: false });
  const eventIds =
    query.data?.phase === 'idle' ? [] : query.data?.events.map(({ eventId }) => eventId);

  return <div data-testid={consumerId}>{eventIds?.join(',') ?? 'loading'}</div>;
}

describe('useRunEventFeedQuery', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null = null;

  afterEach(async () => {
    await mounted?.cleanup();
    mounted = null;
  });

  function withServices(runsService: IRunsPort, consumers: React.ReactNode): React.ReactNode {
    return (
      <AppServicesProvider overrides={{ ...createAppServicesTestOverrides(), runsService }}>
        {consumers}
      </AppServicesProvider>
    );
  }

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

    await queryClient.invalidateQueries({ queryKey: queryKeys.runs.eventFeed('run_1') });
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
});
