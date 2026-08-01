import { describe, expect, it } from 'vitest';

import type { RunSnapshot } from '../../ports/runs';
import type { RunEvent } from '../../types/engine';
import { ApiError } from '../api/createApiClient';
import { buildRunWorkspaceViewModel, classifyRunWorkspaceSnapshotError } from './runWorkspaceModel';

const snapshot: RunSnapshot = {
  runId: 'run_1',
  status: 'running',
  environment: 'env_1',
};

const event = {
  eventId: 'evt_1',
  eventType: 'StepStarted',
  runId: 'run_1',
  emittedAt: '2026-07-10T10:00:01.000Z',
  tenantId: 'tenant_1',
  projectId: 'project_1',
  environmentId: 'env_1',
  planId: 'plan_1',
  planVersion: '1.0.0',
  engineAttemptId: 1,
  logicalAttemptId: 1,
  idempotencyKey: 'run_1-evt_1',
  payloadVersion: 1,
  stepId: 'model.orders',
  runSeq: 1,
  persistedAt: '2026-07-10T10:00:01.000Z',
} as RunEvent;

describe('runWorkspaceModel', () => {
  it('projects the canonical shared feed into an available run timeline', () => {
    const workspace = buildRunWorkspaceViewModel(snapshot, {
      phase: 'live',
      runId: 'run_1',
      events: [event],
      nextAfterSeq: 1,
      consecutiveFailures: 0,
      lastSuccessfulFetchAt: '2026-07-10T10:00:02.000Z',
    });

    expect(workspace).toMatchObject({
      runId: 'run_1',
      snapshot,
      detailState: 'snapshot-plus-events',
      eventFeedHealth: { state: 'live', events: [event], canRetry: false },
      timeline: { state: 'available', events: [event], nextAfterSeq: 1 },
    });
  });

  it('keeps cached events visible when the shared feed becomes degraded', () => {
    const workspace = buildRunWorkspaceViewModel(snapshot, {
      phase: 'stale',
      runId: 'run_1',
      events: [event],
      nextAfterSeq: 1,
      consecutiveFailures: 4,
      failure: {
        kind: 'transport',
        message: 'Runtime unavailable',
        statusCode: 503,
        retryable: true,
      },
    });

    expect(workspace).toMatchObject({
      eventFeedHealth: {
        state: 'degraded',
        events: [event],
        canRetry: true,
      },
      timeline: {
        state: 'available',
        events: [event],
        nextAfterSeq: 1,
      },
    });
    expect(workspace.timeline).toMatchObject({
      state: 'available',
      events: [event],
      nextAfterSeq: 1,
    });
    expect(workspace.detailState).toBe('snapshot-plus-events');
  });

  it.each([
    {
      label: 'the initial page is loading',
      feed: {
        phase: 'initial-loading' as const,
        runId: 'run_1',
        events: [],
        consecutiveFailures: 0,
      },
      feedError: undefined,
    },
    {
      label: 'the feed fails before a successful page',
      feed: {
        phase: 'failed' as const,
        runId: 'run_1',
        events: [],
        consecutiveFailures: 1,
        failure: {
          kind: 'transport' as const,
          message: 'Runtime unavailable',
          retryable: true,
        },
      },
      feedError: new Error('Runtime unavailable'),
    },
  ])('does not claim that the timeline is empty when $label', ({ feed, feedError }) => {
    const workspace = buildRunWorkspaceViewModel(snapshot, feed, feedError);

    expect(workspace.timeline).toEqual({ state: 'unresolved', events: [] });
    expect(workspace.detailState).toBe('snapshot-only');
  });

  it('reports an empty timeline only after a successful empty page', () => {
    const workspace = buildRunWorkspaceViewModel(snapshot, {
      phase: 'live',
      runId: 'run_1',
      events: [],
      consecutiveFailures: 0,
      lastSuccessfulFetchAt: '2026-07-10T10:00:02.000Z',
    });

    expect(workspace.timeline).toEqual({ state: 'empty', events: [] });
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [500, 'runtime-unavailable'],
  ] as const)('classifies snapshot failure %s as %s', (statusCode, expectedKind) => {
    const error = new ApiError({
      message: `HTTP ${statusCode}`,
      endpoint: '/runs/run_1',
      statusCode,
      category: statusCode >= 500 ? 'server' : 'client',
    });

    expect(classifyRunWorkspaceSnapshotError(error)).toMatchObject({
      kind: expectedKind,
      statusCode,
    });
  });
});
