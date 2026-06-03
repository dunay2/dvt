/**
 * @file test/TemporalAdapter.getProviderStatusView.test.ts
 * @baseline ADR-0003: Execution Model - provider diagnostics stay provider-native
 *
 * Unit tests for TemporalAdapter.getProviderStatusView.
 */
import { describe, expect, it } from 'vitest';

import {
  createLookupRunRef,
  makeAdapter,
  makeWorkflowHandleMock,
} from './helpers/lookupRunRefHarness.js';

describe('TemporalAdapter.getProviderStatusView', () => {
  it('returns Temporal-native runtime status from handle.describe()', async () => {
    const handle = makeWorkflowHandleMock(async () => ({ status: { name: 'RUNNING', code: 1 } }));
    const { adapter, workflowClient } = makeAdapter(() => handle);

    const status = await adapter.getProviderStatusView(createLookupRunRef('run-abc', 'tenant1'));

    expect(workflowClient.getHandle).toHaveBeenCalledWith('run-abc');
    expect(handle.describe).toHaveBeenCalledOnce();
    expect(status).toEqual({
      provider: 'temporal',
      providerStatus: 'RUNNING',
    });
  });

  it('maps terminal Temporal statuses through describe()', async () => {
    const handle = makeWorkflowHandleMock(async () => ({
      status: { name: 'TERMINATED', code: 5 },
    }));
    const { adapter } = makeAdapter(() => handle);

    const status = await adapter.getProviderStatusView(createLookupRunRef('run-abc', 'tenant1'));

    expect(status).toEqual({
      provider: 'temporal',
      providerStatus: 'TERMINATED',
    });
  });

  it('preserves unknown Temporal describe statuses as provider diagnostics', async () => {
    const handle = makeWorkflowHandleMock(async () => ({
      status: { name: 'PAUSE_REQUESTED', code: 17 },
    }));
    const { adapter } = makeAdapter(() => handle);

    const status = await adapter.getProviderStatusView(createLookupRunRef('run-abc', 'tenant1'));

    expect(status).toEqual({
      provider: 'temporal',
      providerStatus: 'PAUSE_REQUESTED',
    });
  });

  it('throws when describe() returns no status', async () => {
    const handle = makeWorkflowHandleMock(async () => ({}));
    const { adapter } = makeAdapter(() => handle);

    await expect(
      adapter.getProviderStatusView(createLookupRunRef('run-abc', 'tenant1'))
    ).rejects.toThrow('TEMPORAL_DESCRIBE_MISSING_STATUS');
  });
});
