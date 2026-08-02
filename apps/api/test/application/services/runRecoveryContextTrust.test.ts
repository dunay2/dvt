import type { CanonicalRunStatus } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { resolveRunRecoveryContextTrust } from '../../../src/application/services/runRecoveryContextTrust.js';

const metadata = { tenantId: 'tenant-a', runId: 'run-source-1' };
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
      resolveRunRecoveryContextTrust(reader as never, metadata, statusFor('FAILED'))
    ).resolves.toBe(false);
  });

  it('does not require a context reference when no context artifact exists', async () => {
    const reader = { read: vi.fn().mockResolvedValue({ kind: 'absent' }) };

    await expect(
      resolveRunRecoveryContextTrust(reader as never, metadata, statusFor('CANCELLED'))
    ).resolves.toBe(true);
  });

  it('does not query context integrity for non-recoverable runs', async () => {
    const reader = { read: vi.fn() };

    await expect(
      resolveRunRecoveryContextTrust(reader as never, metadata, statusFor('COMPLETED'))
    ).resolves.toBe(true);
    expect(reader.read).not.toHaveBeenCalled();
  });
});
