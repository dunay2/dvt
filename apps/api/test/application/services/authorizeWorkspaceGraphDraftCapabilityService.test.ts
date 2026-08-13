import { describe, expect, it, vi } from 'vitest';

import { AuthorizeWorkspaceGraphDraftCapabilityService } from '../../../src/application/services/authorizeWorkspaceGraphDraftCapabilityService.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

const PRINCIPAL = {
  principalId: 'user-1',
  subjectId: 'user-1',
  issuer: 'issuer',
  audience: 'audience',
  principalType: 'user' as const,
  expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  rawScopes: [],
  assertedTenantIds: ['tenant-a'],
  assertedProjectIds: ['project-a'],
};

const REQUESTED_SCOPE = {
  tenantId: TenantId.unsafe('tenant-a'),
  projectId: ProjectId.unsafe('project-a'),
  environmentId: EnvironmentId.unsafe('env-a'),
};

describe('AuthorizeWorkspaceGraphDraftCapabilityService', () => {
  it('returns read_only when read is granted but save is denied', async () => {
    const authorizeMany = vi.fn(async () => [
      { ok: true as const, context: { requestId: 'req-2' } },
      { ok: false as const, reason: 'ACTION_NOT_GRANTED' as const },
    ]);
    const service = new AuthorizeWorkspaceGraphDraftCapabilityService(
      { authorizeMany } as never,
      () => new Date('2026-04-16T00:00:00.000Z')
    );

    const result = await service.authorize({
      principal: PRINCIPAL,
      requestId: 'req-2',
      requestedScope: REQUESTED_SCOPE,
    });

    expect(result.authentication).toBe('authenticated');
    expect(result.capability).toMatchObject({
      mode: 'read_only',
      canRead: true,
      canWrite: false,
      reason: 'write_denied',
    });
    expect(authorizeMany).toHaveBeenCalledOnce();
    expect(authorizeMany).toHaveBeenCalledWith(
      PRINCIPAL,
      [
        {
          resource: 'workspace-graph-draft',
          ...REQUESTED_SCOPE,
          action: { kind: 'query', name: 'workspace:graph-draft:view' },
        },
        {
          resource: 'workspace-graph-draft',
          ...REQUESTED_SCOPE,
          action: { kind: 'command', name: 'workspace:graph-draft:save' },
        },
      ],
      'req-2'
    );
  });

  it('maps token assertion conflicts from the shared authorizer to tenant_mismatch', async () => {
    const service = new AuthorizeWorkspaceGraphDraftCapabilityService(
      {
        authorizeMany: vi.fn(async () => [
          { ok: false as const, reason: 'TOKEN_ASSERTION_CONFLICT' as const },
          { ok: false as const, reason: 'TOKEN_ASSERTION_CONFLICT' as const },
        ]),
      } as never,
      () => new Date('2026-04-16T00:00:00.000Z')
    );

    const result = await service.authorize({
      principal: { ...PRINCIPAL, assertedTenantIds: ['tenant-b'] },
      requestId: 'req-3',
      requestedScope: REQUESTED_SCOPE,
    });

    expect(result.authentication).toBe('authenticated');
    expect(result.capability.mode).toBe('forbidden');
    expect(result.capability.reason).toBe('tenant_mismatch');
  });
});
