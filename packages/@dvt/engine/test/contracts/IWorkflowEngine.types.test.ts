import { describe, it, expect } from 'vitest';

import type {
  CanonicalRunStatus,
  RunContext,
  EngineRunRef,
  PlanRef,
  ProviderRunStatusView,
  RunStatusEnrichment,
  SignalRequest,
} from '../../src/contracts/types.js';

describe('IWorkflowEngine contract types', () => {
  it('PlanRef must have the required fields', () => {
    const ref: PlanRef = {
      uri: 'https://example.com/plan',
      sha256: 'abc',
      schemaVersion: 'v1.2',
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

  it('EngineRunRef temporal complies with the active provider contract', () => {
    const ref1: EngineRunRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'ns',
      workflowId: 'w',
      runId: 'r',
    };
    expect(ref1.provider).toBe('temporal');
  });

  it('SignalRequest minimal complies with the contract', () => {
    const req: SignalRequest = { signalId: 's1', type: 'PAUSE' };
    expect(req.type).toBe('PAUSE');
  });

  it('CanonicalRunStatus accepts status values', () => {
    const snapshot: CanonicalRunStatus = {
      runId: 'r',
      status: 'RUNNING',
    };
    expect(snapshot.status).toBe('RUNNING');
  });

  it('ProviderRunStatusView accepts provider-native diagnostic fields', () => {
    const providerView: ProviderRunStatusView = {
      provider: 'temporal',
      providerStatus: 'RUNNING',
      providerSubstatus: 'WORKFLOW_TASK_RUNNING',
    };
    expect(providerView.providerStatus).toBe('RUNNING');
  });

  it('RunStatusEnrichment composes canonical status and provider view', () => {
    const enrichment: RunStatusEnrichment = {
      canonical: {
        runId: 'r',
        status: 'RUNNING',
      },
      providerView: {
        provider: 'temporal',
        providerStatus: 'RUNNING',
      },
    };
    expect(enrichment.canonical.status).toBe('RUNNING');
    expect(enrichment.providerView.provider).toBe('temporal');
  });
});
