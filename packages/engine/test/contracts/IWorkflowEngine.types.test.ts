
import { describe, it, expect } from 'vitest';
import type { PlanRef } from '../../src/types/plan-ref';
import type { RunContext, EngineRunRef, RunStatusSnapshot, SignalRequest } from '../../src/types/engine-types';

describe('IWorkflowEngine contract types', () => {
  it('PlanRef must have the required fields', () => {
    const ref: PlanRef = {
      uri: 'https://example.com/plan',
      sha256: 'abc',
      schemaVersion: 'v1.1',
      planId: 'plan-1',
      planVersion: '1.0',
    };
    expect(ref).toHaveProperty('uri');
    expect(ref).toHaveProperty('sha256');
    expect(ref).toHaveProperty('schemaVersion');
    expect(ref).toHaveProperty('planId');
    expect(ref).toHaveProperty('planVersion');
  });

  it('RunContext must have the required fields', () => {
    const ctx: RunContext = {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'e',
      runId: 'r',
      targetAdapter: 'temporal',
    };
    expect(ctx).toHaveProperty('tenantId');
    expect(ctx).toHaveProperty('projectId');
    expect(ctx).toHaveProperty('environmentId');
    expect(ctx).toHaveProperty('runId');
    expect(ctx).toHaveProperty('targetAdapter');
  });

  it('EngineRunRef temporal and conductor comply with the contract', () => {
    const ref1: EngineRunRef = {
      provider: 'temporal',
      namespace: 'ns',
      workflowId: 'w',
      runId: 'r',
    };
    const ref2: EngineRunRef = {
      provider: 'conductor',
      workflowId: 'w',
      runId: 'r',
      conductorUrl: 'http://conductor',
    };
    expect(ref1.provider).toBe('temporal');
    expect(ref2.provider).toBe('conductor');
  });

  it('SignalRequest minimal complies with the contract', () => {
    const req: SignalRequest = { signalType: 'PAUSE' };
    expect(req.signalType).toBe('PAUSE');
  });

  it('RunStatusSnapshot accepts status values', () => {
    const snapshot: RunStatusSnapshot = {
      runId: 'r',
      status: 'RUNNING',
    };
    expect(snapshot.status).toBe('RUNNING');
  });
});
