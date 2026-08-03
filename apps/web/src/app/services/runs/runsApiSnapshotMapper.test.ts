import { describe, expect, it } from 'vitest';

import { mapSnapshotToSummary, mapUnknownRecordToSnapshot } from './runsApiSnapshotMapper';

describe('runsApiSnapshotMapper operational truth', () => {
  it('preserves the same shared identity, lifecycle, duration, and failure fields in detail and list', () => {
    const snapshot = mapUnknownRecordToSnapshot({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'environment-1',
      runId: 'run-1',
      planId: 'plan-1',
      planVersion: '2.0.0',
      logicalAttemptId: 2,
      provider: 'temporal',
      createdAt: '2026-07-19T09:59:55.000Z',
      status: 'FAILED',
      startedAt: '2026-07-19T10:00:00.000Z',
      completedAt: '2026-07-19T10:00:09.000Z',
      durationMs: 9_000,
      failedStepId: 'step-load',
      errorReason: 'SINK_WRITE_FAILED',
      controls: {
        cancel: { available: false, reason: 'run_terminal' },
        recover: { available: false, reason: 'source_plan_unavailable' },
      },
    });

    expect(snapshot).not.toBeNull();
    if (snapshot === null) {
      throw new Error('Expected a valid run snapshot');
    }

    expect(mapSnapshotToSummary(snapshot)).toMatchObject({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environment: 'environment-1',
      runId: 'run-1',
      planId: 'plan-1',
      planVersion: '2.0.0',
      logicalAttemptId: 2,
      provider: 'temporal',
      createdAt: '2026-07-19T09:59:55.000Z',
      status: 'failed',
      startedAt: '2026-07-19T10:00:00.000Z',
      completedAt: '2026-07-19T10:00:09.000Z',
      durationMs: 9_000,
      failedStepId: 'step-load',
      errorReason: 'SINK_WRITE_FAILED',
      controls: {
        cancel: { available: false, reason: 'run_terminal' },
        recover: { available: false, reason: 'source_plan_unavailable' },
      },
    });
  });

  it('keeps absent or invalid lifecycle evidence unavailable', () => {
    const snapshot = mapUnknownRecordToSnapshot({
      runId: 'run-1',
      createdAt: '2026-07-19T09:59:55.000Z',
      durationMs: -1,
      controls: {
        cancel: { available: false, reason: 'run_active' },
        recover: { available: false, reason: 'source_adapter_unavailable' },
      },
    });

    expect(snapshot).toMatchObject({
      runId: 'run-1',
      status: 'unknown',
      createdAt: '2026-07-19T09:59:55.000Z',
      startedAt: undefined,
      durationMs: undefined,
      controls: {
        cancel: { available: false, reason: 'run_active' },
        recover: { available: false, reason: 'source_adapter_unavailable' },
      },
    });
  });

  it('preserves snapshots without controls while withholding run actions', () => {
    const snapshot = mapUnknownRecordToSnapshot({ runId: 'run-1', status: 'RUNNING' });

    expect(snapshot).toMatchObject({
      runId: 'run-1',
      status: 'running',
    });
    expect(snapshot?.controls).toBeUndefined();
  });
});
