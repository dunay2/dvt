import { describe, expect, it } from 'vitest';

import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { StartRunEventFactory } from '../../src/services/startRun/StartRunEventFactory.js';

describe('StartRunEventFactory provider ref preservation', () => {
  const factory = new StartRunEventFactory({
    idempotency: new IdempotencyKeyBuilder(),
    clock: { nowIsoUtc: () => '2026-04-09T00:00:00.000Z' },
  });

  it('preserves an explicit empty providerTaskQueue in run metadata', () => {
    const metadata = factory.buildRunMetadata(
      {
        tenantId: 't',
        projectId: 'p',
        environmentId: 'dev',
        runId: 'run-1',
        targetAdapter: 'temporal',
        logicalAttemptId: 1,
        originRunId: 'run-1',
      },
      {
        uri: 'artifacts://plan.json',
        sha256: 'a'.repeat(64),
        schemaVersion: 'v1.2',
        planId: 'plan-1',
        planVersion: '1.0',
      },
      {
        provider: 'temporal',
        tenantId: 't',
        namespace: 'default',
        workflowId: 'wf-run-1',
        runId: 'provider-run-1',
        taskQueue: '',
      },
      '2026-04-09T00:00:00.000Z'
    );

    expect(metadata).toMatchObject({
      providerRef: {
        provider: 'temporal',
        namespace: 'default',
        taskQueue: '',
      },
    });
  });

  it('persists provider-specific fields inside the discriminated providerRef', () => {
    const metadata = factory.buildRunMetadata(
      {
        tenantId: 't',
        projectId: 'p',
        environmentId: 'dev',
        runId: 'run-1',
        targetAdapter: 'conductor',
        logicalAttemptId: 1,
        originRunId: 'run-1',
      },
      {
        uri: 'artifacts://plan.json',
        sha256: 'a'.repeat(64),
        schemaVersion: 'v1.2',
        planId: 'plan-1',
        planVersion: '1.0',
      },
      {
        provider: 'conductor',
        tenantId: 't',
        workflowId: 'wf-run-1',
        runId: 'provider-run-1',
        conductorUrl: 'http://localhost:8080/api',
      },
      '2026-04-09T00:00:00.000Z'
    );

    expect(metadata.providerRef).toEqual({
      provider: 'conductor',
      tenantId: 't',
      workflowId: 'wf-run-1',
      runId: 'provider-run-1',
      conductorUrl: 'http://localhost:8080/api',
    });
  });
});
