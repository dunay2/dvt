
import { describe, it, expect } from 'vitest';

import type { RunStatusSnapshot, RunStatus, AdapterScopedSubstatus } from '../../src/types/engine-types';

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
