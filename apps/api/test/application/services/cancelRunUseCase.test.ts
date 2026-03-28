import { describe, expect, it, vi } from 'vitest';

import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/auth.js';
import { CancelRunUseCase } from '../../../src/application/services/cancelRunUseCase.js';
import { TenantId } from '../../../src/domain/auth/types.js';

const commandContext: AuthorizedCommandExecutionContext = {
  principal: {
    principalId: 'user-1',
    subjectId: 'user-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: [],
  },
  scope: {
    tenantId: TenantId.unsafe('tenant-a'),
  },
  action: { kind: 'command', name: 'run:cancel' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-19T00:00:00Z'),
};

describe('CancelRunUseCase', () => {
  it('delegates cancel commands to the signal run use-case', async () => {
    const signalRunUseCase = {
      execute: vi.fn().mockResolvedValue({
        runId: 'run-1',
        signalType: 'CANCEL',
        accepted: true,
      }),
    };

    const useCase = new CancelRunUseCase(signalRunUseCase as never);
    const command = {
      runId: 'run-1',
      signalType: 'CANCEL' as const,
      reason: 'operator-request',
    };

    await expect(useCase.execute(command, commandContext)).resolves.toEqual({
      runId: 'run-1',
      signalType: 'CANCEL',
      accepted: true,
    });
    expect(signalRunUseCase.execute).toHaveBeenCalledWith(command, commandContext);
  });
});
