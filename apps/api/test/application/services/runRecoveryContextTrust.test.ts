import type { CanonicalRunStatus } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { resolveRunRecoveryContextTrust } from '../../../src/application/services/runRecoveryContextTrust.js';

const metadata = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
  planId: 'plan-a',
  planVersion: '1.0',
  runId: 'run-source-1',
  providerRef: {
    provider: 'temporal' as const,
    tenantId: 'tenant-a',
    namespace: 'default',
    workflowId: 'workflow-1',
    runId: 'provider-run-1',
  },
};
const planRef = {
  uri: 'dvt-plan://postgres/plan-a',
  planId: 'plan-a',
  planVersion: '1.0',
  sha256: 'a'.repeat(64),
  schemaVersion: 'v1.0',
};
const statusFor = (status: CanonicalRunStatus['status']): CanonicalRunStatus => ({
  runId: metadata.runId,
  status,
});

describe('resolveRunRecoveryContextTrust', () => {
  it('fails closed for recoverable runs whose original context reference is unavailable', async () => {
    const reader = {
      read: vi.fn().mockResolvedValue({ kind: 'untrusted', reason: 'reference_missing' }),
    };

    await expect(
      resolveRunRecoveryContextTrust(
        reader as never,
        undefined,
        metadata,
        statusFor('FAILED'),
        planRef
      )
    ).resolves.toBe(false);
  });

  it('allows an absent context only when the stored plan does not require one', async () => {
    const reader = { read: vi.fn().mockResolvedValue({ kind: 'absent' }) };
    const requirements = { resolve: vi.fn().mockResolvedValue('not_required') };

    await expect(
      resolveRunRecoveryContextTrust(
        reader as never,
        requirements as never,
        metadata,
        statusFor('CANCELLED'),
        planRef
      )
    ).resolves.toBe(true);
  });

  it('fails closed when a plugin-bearing plan has lost its required context artifact', async () => {
    const reader = { read: vi.fn().mockResolvedValue({ kind: 'absent' }) };
    const requirements = { resolve: vi.fn().mockResolvedValue('required') };

    await expect(
      resolveRunRecoveryContextTrust(
        reader as never,
        requirements as never,
        metadata,
        statusFor('FAILED'),
        planRef
      )
    ).resolves.toBe(false);
  });

  it('keeps run queries available and fails recovery closed when context storage fails', async () => {
    const reader = { read: vi.fn().mockRejectedValue(new Error('EACCES')) };

    await expect(
      resolveRunRecoveryContextTrust(
        reader as never,
        undefined,
        metadata,
        statusFor('FAILED'),
        planRef
      )
    ).resolves.toBe(false);
  });

  it('does not query context integrity for non-recoverable runs', async () => {
    const reader = { read: vi.fn() };

    await expect(
      resolveRunRecoveryContextTrust(reader as never, undefined, metadata, statusFor('PENDING'))
    ).resolves.toBe(true);
    expect(reader.read).not.toHaveBeenCalled();
  });
});
