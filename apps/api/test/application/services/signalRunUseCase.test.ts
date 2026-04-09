import { describe, expect, it } from 'vitest';

import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/auth.js';
import { SignalRunUseCase } from '../../../src/application/services/signalRunUseCase.js';
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
  scope: { tenantId: TenantId.unsafe('tenant-a') },
  action: { kind: 'command', name: 'run:signal' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-19T00:00:00Z'),
};

describe('SignalRunUseCase', () => {
  it('maps signal commands to engine.signal', async () => {
    let capturedRequest: unknown;
    const engine = {
      async signal(_runRef: unknown, request: unknown) {
        capturedRequest = request;
      },
    };

    const stateStore = {
      async getRunMetadataByRunId() {
        return {
          tenantId: 'tenant-a',
          projectId: 'proj-1',
          environmentId: 'env-1',
          runId: 'run-1',
          planId: 'plan-1',
          planVersion: '1.0',
          logicalAttemptId: 1,
          providerRef: {
            provider: 'mock' as const,
            tenantId: 'tenant-a',
            workflowId: 'wf-1',
            runId: 'provider-run-1',
          },
        };
      },
    };

    const useCase = new SignalRunUseCase(
      engine as never,
      stateStore as never,
      () => '2026-03-19T00:00:00.000Z'
    );

    await expect(
      useCase.execute(
        { runId: 'run-1', signalType: 'CANCEL', reason: 'operator request' },
        commandContext
      )
    ).resolves.toEqual({ runId: 'run-1', signalType: 'CANCEL', accepted: true });
    expect(capturedRequest).toEqual({
      signalId: 'req-1:run-1:CANCEL',
      type: 'CANCEL',
      reason: 'operator request',
      requestedAt: '2026-03-19T00:00:00.000Z',
    });
  });
});
