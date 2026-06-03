import { describe, expect, it, vi } from 'vitest';

import { AuthorizeWorkspaceGraphDraftCapabilityService } from '../../../src/application/services/authorizeWorkspaceGraphDraftCapabilityService.js';
import { TenantId, ProjectId, EnvironmentId } from '../../../src/domain/auth/types.js';

describe('AuthorizeWorkspaceGraphDraftCapabilityService', () => {
  const requestedScope = {
    tenantId: TenantId.unsafe('tenant-a'),
    projectId: ProjectId.unsafe('project-a'),
    environmentId: EnvironmentId.unsafe('env-a'),
  };

  it('returns forbidden capability with unauthenticated reason when bearer auth fails', async () => {
    const service = new AuthorizeWorkspaceGraphDraftCapabilityService(
      {
        authenticateBearerToken: vi.fn(async () => ({ ok: false, code: 'MISSING_TOKEN' })),
      } as never,
      {} as never,
      () => new Date('2026-04-16T00:00:00.000Z')
    );

    const result = await service.authorize({
      token: undefined,
      requestId: 'req-1',
      requestedScope,
    });

    expect(result.authentication).toBe('unauthenticated');
    expect(result.capability).toEqual({
      scope: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'env-a',
      },
      mode: 'forbidden',
      canRead: false,
      canWrite: false,
      reason: 'unauthenticated',
    });
  });

  it('returns read_only when read is granted but save is denied', async () => {
    const authorize = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        context: { requestId: 'req-2' },
      })
      .mockResolvedValueOnce({
        ok: false,
        reason: 'ACTION_NOT_GRANTED',
      });
    const service = new AuthorizeWorkspaceGraphDraftCapabilityService(
      {
        authenticateBearerToken: vi.fn(async () => ({
          ok: true,
          principal: {
            principalId: 'user-1',
            subjectId: 'user-1',
            issuer: 'issuer',
            audience: 'audience',
            principalType: 'user',
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            rawScopes: [],
            assertedTenantIds: ['tenant-a'],
            assertedProjectIds: ['project-a'],
          },
        })),
      } as never,
      {
        authorize,
      } as never,
      () => new Date('2026-04-16T00:00:00.000Z')
    );

    const result = await service.authorize({
      token: 'token',
      requestId: 'req-2',
      requestedScope,
    });

    expect(result.authentication).toBe('authenticated');
    expect(result.capability.mode).toBe('read_only');
    expect(result.capability.canRead).toBe(true);
    expect(result.capability.canWrite).toBe(false);
    expect(result.capability.reason).toBe('write_denied');
    expect(authorize).toHaveBeenCalledTimes(2);
    expect(authorize).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ principalId: 'user-1' }),
      {
        resource: 'workspace-graph-draft',
        ...requestedScope,
        action: { kind: 'query', name: 'workspace:graph-draft:view' },
      },
      'req-2'
    );
    expect(authorize).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ principalId: 'user-1' }),
      {
        resource: 'workspace-graph-draft',
        ...requestedScope,
        action: { kind: 'command', name: 'workspace:graph-draft:save' },
      },
      'req-2'
    );
  });

  it('maps token assertion conflicts to tenant_mismatch', async () => {
    const service = new AuthorizeWorkspaceGraphDraftCapabilityService(
      {
        authenticateBearerToken: vi.fn(async () => ({
          ok: true,
          principal: {
            principalId: 'user-1',
            subjectId: 'user-1',
            issuer: 'issuer',
            audience: 'audience',
            principalType: 'user',
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            rawScopes: [],
            assertedTenantIds: ['tenant-b'],
            assertedProjectIds: ['project-a'],
          },
        })),
      } as never,
      {
        authorize: vi.fn(async () => ({
          ok: false,
          reason: 'TOKEN_ASSERTION_CONFLICT',
        })),
      } as never,
      () => new Date('2026-04-16T00:00:00.000Z')
    );

    const result = await service.authorize({
      token: 'token',
      requestId: 'req-3',
      requestedScope,
    });

    expect(result.authentication).toBe('authenticated');
    expect(result.capability.mode).toBe('forbidden');
    expect(result.capability.reason).toBe('tenant_mismatch');
  });
});
