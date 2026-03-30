import { describe, expect, it, vi } from 'vitest';

import type { AuthorizedExecutionContext } from '../../../src/application/ports/auth.js';
import { GetRunStatusUseCase } from '../../../src/application/services/getRunStatusUseCase.js';
import { TenantId } from '../../../src/domain/auth/types.js';

const queryContext: AuthorizedExecutionContext<{ kind: 'query'; name: 'run:view' }> = {
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
  action: { kind: 'query', name: 'run:view' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-19T00:00:00Z'),
};

function createStateStore(): { getRunMetadataByRunId: () => Promise<unknown> } {
  return {
    async getRunMetadataByRunId() {
      return {
        tenantId: 'tenant-a',
        projectId: 'proj-1',
        environmentId: 'env-1',
        runId: 'run-1',
        planId: 'plan-1',
        planVersion: '1.0',
        logicalAttemptId: 1,
        provider: 'mock' as const,
        providerWorkflowId: 'wf-1',
        providerRunId: 'provider-run-1',
      };
    },
  };
}

describe('GetRunStatusUseCase', () => {
  it('loads metadata and returns projected engine status with FRESH staleness', async () => {
    const engine = {
      async getRunStatus(runRef: unknown) {
        expect(runRef).toEqual({
          provider: 'mock',
          tenantId: 'tenant-a',
          workflowId: 'wf-1',
          runId: 'provider-run-1',
        });
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async enrichRunStatus() {
        throw new Error('should not be called');
      },
    };

    const stalenessReader = {
      isSnapshotStale: vi.fn().mockResolvedValue(false),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      createStateStore() as never,
      stalenessReader as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toEqual({
      runId: 'provider-run-1',
      tenantId: 'tenant-a',
      status: 'RUNNING',
      enriched: false,
      snapshotStaleness: 'FRESH',
    });
    expect(stalenessReader.isSnapshotStale).toHaveBeenCalledWith('tenant-a', 'run-1');
  });

  it('returns STALE staleness when staleness query reports stale snapshot', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async enrichRunStatus() {
        throw new Error('should not be called');
      },
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      createStateStore() as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(true),
      } as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      snapshotStaleness: 'STALE',
    });
  });

  it('uses UNKNOWN staleness and emits telemetry when query capability is not wired', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async enrichRunStatus() {
        throw new Error('should not be called');
      },
    };

    const telemetry = {
      recordSnapshotStalenessFallback: vi.fn(),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      createStateStore() as never,
      undefined,
      telemetry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      snapshotStaleness: 'UNKNOWN',
    });

    expect(telemetry.recordSnapshotStalenessFallback).toHaveBeenCalledWith(
      'query_not_wired',
      'tenant-a',
      'run-1'
    );
  });

  it('uses UNKNOWN staleness and emits telemetry when staleness query fails', async () => {
    const engine = {
      async getRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async enrichRunStatus() {
        throw new Error('should not be called');
      },
    };

    const telemetry = {
      recordSnapshotStalenessFallback: vi.fn(),
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      createStateStore() as never,
      {
        isSnapshotStale: vi.fn().mockRejectedValue(new Error('staleness query failed')),
      } as never,
      telemetry as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toMatchObject({
      snapshotStaleness: 'UNKNOWN',
    });

    expect(telemetry.recordSnapshotStalenessFallback).toHaveBeenCalledWith(
      'query_failed',
      'tenant-a',
      'run-1'
    );
  });

  it('uses the enriched path when requested', async () => {
    const engine = {
      async getRunStatus() {
        throw new Error('should not be called');
      },
      async enrichRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
          substatus: 'mock/QUEUED' as const,
        };
      },
    };

    const useCase = new GetRunStatusUseCase(
      engine as never,
      createStateStore() as never,
      {
        isSnapshotStale: vi.fn().mockResolvedValue(false),
      } as never
    );

    await expect(
      useCase.execute({ runId: 'run-1', enriched: true }, queryContext as never)
    ).resolves.toEqual({
      runId: 'provider-run-1',
      tenantId: 'tenant-a',
      status: 'RUNNING',
      enriched: true,
      snapshotStaleness: 'FRESH',
      substatus: 'mock/QUEUED',
    });
  });
});
