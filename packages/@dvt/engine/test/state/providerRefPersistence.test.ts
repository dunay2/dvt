import { describe, expect, it } from 'vitest';

import { InMemoryRunStateStore } from '../../src/state/InMemoryRunStateStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';

function makeBootstrap(runId: string): {
  metadata: {
    tenantId: string;
    projectId: string;
    environmentId: string;
    runId: string;
    planId: string;
    planVersion: string;
    logicalAttemptId: number;
    provider: 'temporal';
    providerWorkflowId: string;
    providerRunId: string;
  };
  firstEvents: [];
} {
  return {
    metadata: {
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      runId,
      planId: 'plan-1',
      planVersion: '1.0.0',
      logicalAttemptId: 1,
      provider: 'temporal' as const,
      providerWorkflowId: `wf-${runId}`,
      providerRunId: `pr-${runId}`,
    },
    firstEvents: [],
  };
}

describe.each([
  ['InMemoryRunStateStore', () => new InMemoryRunStateStore()],
  ['InMemoryTxStore', () => new InMemoryTxStore()],
] as const)('%s saveProviderRef', (_label, createStore) => {
  it('preserves explicit empty optional provider ref values', async () => {
    const store = createStore();
    const runId = 'provider-ref-empty-1';

    await store.bootstrapRunTx(makeBootstrap(runId));

    await store.saveProviderRef('tenant-1', runId, {
      providerWorkflowId: 'wf-updated',
      providerRunId: 'pr-updated',
      providerNamespace: '',
      providerTaskQueue: '',
      providerConductorUrl: '',
    });

    await expect(store.getRunMetadataByRunId('tenant-1', runId)).resolves.toMatchObject({
      providerWorkflowId: 'wf-updated',
      providerRunId: 'pr-updated',
      providerNamespace: '',
      providerTaskQueue: '',
      providerConductorUrl: '',
    });
  });
});
