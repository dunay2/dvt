import { ContractValidationError } from '@dvt/contracts';
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
    providerRef: {
      provider: 'temporal';
      tenantId: string;
      namespace: string;
      workflowId: string;
      runId: string;
      taskQueue?: string;
    };
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
      providerRef: {
        provider: 'temporal' as const,
        tenantId: 'tenant-1',
        namespace: 'default',
        workflowId: `wf-${runId}`,
        runId: `pr-${runId}`,
      },
    },
    firstEvents: [],
  };
}

describe.each([
  ['InMemoryRunStateStore', () => new InMemoryRunStateStore()],
  ['InMemoryTxStore', () => new InMemoryTxStore()],
] as const)('%s providerRef persistence', (_label, createStore) => {
  it('omits missing temporal taskQueue instead of materializing an empty value', async () => {
    const store = createStore();
    const runId = 'provider-ref-empty-1';

    await store.bootstrapRunTx(makeBootstrap(runId));

    const metadata = await store.getRunMetadataByRunId('tenant-1', runId);

    expect(metadata?.providerRef).toEqual({
      provider: 'temporal',
      tenantId: 'tenant-1',
      namespace: 'default',
      workflowId: `wf-${runId}`,
      runId: `pr-${runId}`,
    });
    expect(metadata?.providerRef).not.toHaveProperty('taskQueue');
  });

  it('reconciles providerRef when the update keeps the same provider discriminator', async () => {
    const store = createStore();
    const runId = 'provider-ref-update-1';

    await store.bootstrapRunTx(makeBootstrap(runId));

    await expect(
      store.saveProviderRef('tenant-1', runId, {
        provider: 'temporal',
        tenantId: 'tenant-1',
        namespace: 'default',
        workflowId: `wf-${runId}`,
        runId: `actual-${runId}`,
        taskQueue: 'late-bound-queue',
      })
    ).resolves.toMatchObject({
      providerRef: {
        provider: 'temporal',
        runId: `actual-${runId}`,
        taskQueue: 'late-bound-queue',
      },
    });
  });

  it('rejects unsupported providerRef discriminators before persistence', async () => {
    const store = createStore();
    const runId = 'provider-ref-provider-mismatch-1';

    await store.bootstrapRunTx(makeBootstrap(runId));

    const legacyProviderRef = {
      provider: 'conductor',
      tenantId: 'tenant-1',
      workflowId: `wf-${runId}`,
      runId: `actual-${runId}`,
      conductorUrl: 'http://localhost:8080/api',
    } as unknown as Parameters<typeof store.saveProviderRef>[2];

    await expect(
      store.saveProviderRef('tenant-1', runId, legacyProviderRef)
    ).rejects.toBeInstanceOf(ContractValidationError);
  });
});
