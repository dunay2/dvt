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
      timeline: { state: 'available', events: [event], nextAfterSeq: 1 },
    });
  });

  it('keeps cached events visible when the shared feed becomes degraded', () => {
    const workspace = buildRunWorkspaceViewModel(
      snapshot,
      {
        phase: 'live',
        runId: 'run_1',
        events: [event],
        nextAfterSeq: 1,
        consecutiveFailures: 0,
      },
      new ApiError({
        message: 'Runtime unavailable',
        endpoint: '/runs/run_1/events',
        statusCode: 503,
        category: 'server',
      })
    );

    expect(workspace.timeline).toMatchObject({
      state: 'degraded',
      events: [event],
      nextAfterSeq: 1,
      statusCode: 503,
    });
    expect(workspace.detailState).toBe('snapshot-plus-events');
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
