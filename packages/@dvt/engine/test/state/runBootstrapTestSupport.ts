import type { RunBootstrapInput } from '../../src/ports/IRunStateStore.js';

interface MakeBootstrapOptions {
  createdAt: string;
  tenantId?: string;
}

export function makeBootstrap(runId: string, options: MakeBootstrapOptions): RunBootstrapInput {
  const tenantId = options.tenantId ?? 't1';

  return {
    metadata: {
      tenantId,
      projectId: 'p1',
      environmentId: 'dev',
      runId,
      planId: 'plan-minimal',
      planVersion: '1.0',
      logicalAttemptId: 1,
      providerRef: {
        provider: 'mock',
        tenantId,
        workflowId: `wf-${runId}`,
        runId: `pr-${runId}`,
      },
      createdAt: options.createdAt,
    },
    firstEvents: [
      {
        eventId: `${runId}:queued`,
        eventType: 'RunQueued',
        runId,
        tenantId,
        projectId: 'p1',
        environmentId: 'dev',
        planId: 'plan-minimal',
        planVersion: '1.0',
        logicalAttemptId: 1,
        engineAttemptId: 1,
        emittedAt: options.createdAt,
        idempotencyKey: `${runId}:queued`,
        payloadVersion: 1,
      },
    ],
  };
}
