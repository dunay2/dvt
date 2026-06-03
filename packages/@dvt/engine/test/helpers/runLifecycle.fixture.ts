/**
 * @ownedConcern run lifecycle test fixture for in-memory run store setup.
 *
 * Creates persisted run events for tests without adapter or provider-runtime
 * authority.
 */
import type { EngineRunRef, Provider } from '@dvt/contracts';

import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';

export async function bootstrapQueuedRun(
  store: InMemoryTxStore,
  runId: string,
  options?: { provider?: Provider; tenantId?: string; emittedAt?: string }
): Promise<void> {
  const provider = options?.provider ?? 'temporal';
  const tenantId = options?.tenantId ?? 't';
  const emittedAt = options?.emittedAt ?? '2026-03-26T00:00:00.000Z';

  await store.bootstrapRunTx({
    metadata: {
      tenantId,
      projectId: 'p',
      environmentId: 'dev',
      runId,
      planId: 'plan-1',
      planVersion: '1.0',
      logicalAttemptId: 1,
      providerRef: makeRunRef(runId, { provider, tenantId }),
    },
    firstEvents: [
      {
        eventId: `${runId}:queued`,
        eventType: 'RunQueued',
        runId,
        tenantId,
        projectId: 'p',
        environmentId: 'dev',
        planId: 'plan-1',
        planVersion: '1.0',
        logicalAttemptId: 1,
        engineAttemptId: 1,
        emittedAt,
        idempotencyKey: `${runId}:queued`,
        payloadVersion: 1,
      },
    ],
  });
}

export async function appendRunStarted(
  store: InMemoryTxStore,
  runId: string,
  options?: { tenantId?: string; emittedAt?: string }
): Promise<void> {
  await store.appendAndEnqueueTx(runId, [
    {
      eventId: `${runId}:started`,
      eventType: 'RunStarted',
      runId,
      tenantId: options?.tenantId ?? 't',
      projectId: 'p',
      environmentId: 'dev',
      planId: 'plan-1',
      planVersion: '1.0',
      logicalAttemptId: 1,
      engineAttemptId: 1,
      payloadVersion: 1,
      emittedAt: options?.emittedAt ?? '2026-03-26T00:00:01.000Z',
      idempotencyKey: `${runId}:started`,
    },
  ]);
}

export function makeRunRef(
  runId: string,
  options?: { provider?: Provider; tenantId?: string }
): EngineRunRef {
  const tenantId = options?.tenantId ?? 't';
  return {
    provider: options?.provider ?? 'temporal',
    tenantId,
    namespace: 'default',
    workflowId: `wf-${runId}`,
    runId,
  };
}
