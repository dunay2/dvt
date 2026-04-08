import { describe, it, expect } from 'vitest';

import { RunStatusSnapshot, RunStatus, AdapterScopedSubstatus } from '../../src/contracts/types.js';

describe('engine-types', () => {
  it('RunStatusSnapshot accepts substatus and message', () => {
    const snap: RunStatusSnapshot = {
      runId: 'r',
      status: 'FAILED',
      substatus: 'RETRYING',
      message: 'error',
    };
    expect(snap.status).toBe('FAILED');
    expect(snap.substatus).toBe('RETRYING');
    expect(snap.message).toBe('error');
  });

  it('RunStatusSnapshot accepts TF-C2-B outcome fields', () => {
    const snap: RunStatusSnapshot = {
      runId: 'r',
      status: 'COMPLETED',
      failedStepId: 'step-transform',
      errorReason: 'SINK_WRITE_FAILED',
      materialization: {
        executor: 'postgres',
        environmentId: 'env-1',
        sinkTable: 'analytics.orders_daily',
        rowsWritten: 42,
        startedAt: '2026-04-08T10:00:00.000Z',
        completedAt: '2026-04-08T10:00:05.000Z',
        durationMs: 5000,
      },
    };

    expect(snap.failedStepId).toBe('step-transform');
    expect(snap.materialization?.executor).toBe('postgres');
    expect(snap.materialization?.rowsWritten).toBe(42);
  });

  it('AdapterScopedSubstatus accepts adapter/value format', () => {
    const sub: AdapterScopedSubstatus = 'temporal/WORKFLOW_TASK_BACKLOG';
    expect(sub.startsWith('temporal/')).toBe(true);
  });

  it('RunStatus accepts all valid values', () => {
    const valid: RunStatus[] = [
      'PENDING',
      'APPROVED',
      'RUNNING',
      'PAUSED',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
    ];
    expect(valid).toContain('RUNNING');
  });
});
