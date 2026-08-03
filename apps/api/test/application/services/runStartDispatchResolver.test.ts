import { asNonBlankString, type CanonicalRunStatus, type RunMetadata } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { RunStartDispatchResolver } from '../../../src/application/services/runStartDispatchResolver.js';

const metadata: RunMetadata = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'environment-a',
  runId: 'run-a',
  planId: 'plan-a',
  planVersion: '1.0.0',
  logicalAttemptId: 2,
  providerRef: {
    provider: 'temporal',
    tenantId: asNonBlankString('tenant-a'),
    namespace: asNonBlankString('default'),
    workflowId: asNonBlankString('estimated-workflow'),
    runId: asNonBlankString('estimated-run'),
  },
};

const pendingStatus: CanonicalRunStatus = {
  runId: 'run-a',
  status: 'PENDING',
};

describe('RunStartDispatchResolver', () => {
  it('returns the persisted provider reference after the run leaves pending', async () => {
    const intentStore = { getIntent: vi.fn() };
    const resolver = new RunStartDispatchResolver(intentStore as never, {
      startRunIntentId: vi.fn(),
    });

    await expect(
      resolver.resolve(metadata, { runId: 'run-a', status: 'RUNNING' })
    ).resolves.toEqual({ kind: 'confirmed', runRef: metadata.providerRef });
    expect(intentStore.getIntent).not.toHaveBeenCalled();
  });

  it('returns the dispatched provider reference for a pending canonical snapshot', async () => {
    const dispatchedRunRef = {
      ...metadata.providerRef,
      workflowId: asNonBlankString('actual-workflow'),
      runId: asNonBlankString('actual-run'),
    };
    const intentStore = {
      getIntent: vi.fn().mockResolvedValue({
        tenantId: 'tenant-a',
        runId: 'run-a',
        provider: 'temporal',
        status: 'DISPATCHED',
        engineRunRef: dispatchedRunRef,
      }),
    };
    const idempotency = { startRunIntentId: vi.fn().mockReturnValue('intent-a') };
    const resolver = new RunStartDispatchResolver(intentStore as never, idempotency);

    await expect(resolver.resolve(metadata, pendingStatus)).resolves.toEqual({
      kind: 'confirmed',
      runRef: dispatchedRunRef,
    });
    expect(idempotency.startRunIntentId).toHaveBeenCalledWith('tenant-a', 'run-a', 2, 'temporal');
    expect(intentStore.getIntent).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      intentId: 'intent-a',
    });
  });

  it.each([
    null,
    { status: 'PENDING' },
    { status: 'DISPATCHED' },
    { status: 'EXPIRED', engineRunRef: metadata.providerRef },
  ])('fails closed when pending dispatch evidence is incomplete: %j', async (intent) => {
    const resolver = new RunStartDispatchResolver(
      { getIntent: vi.fn().mockResolvedValue(intent) } as never,
      { startRunIntentId: vi.fn().mockReturnValue('intent-a') }
    );

    await expect(resolver.resolve(metadata, pendingStatus)).resolves.toEqual({
      kind: 'unconfirmed',
    });
  });

  it('fails closed when intent evidence cannot be read', async () => {
    const resolver = new RunStartDispatchResolver(
      { getIntent: vi.fn().mockRejectedValue(new Error('store unavailable')) } as never,
      { startRunIntentId: vi.fn().mockReturnValue('intent-a') }
    );

    await expect(resolver.resolve(metadata, pendingStatus)).resolves.toEqual({
      kind: 'unconfirmed',
    });
  });
});
