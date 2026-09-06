import { describe, expect, it, vi } from 'vitest';

import { AUTHORIZATION_ACTION } from '../../../src/application/ports/accessDecision.js';
import type { PrincipalGrantSnapshot } from '../../../src/application/ports/principalGrantRepository.js';
import { CreateProjectUseCase } from '../../../src/application/services/createProjectUseCase.js';

const PRINCIPAL = {
  principalId: 'user-1',
  principalType: 'user' as const,
  subjectId: 'user-1',
  issuer: 'issuer',
  audience: 'audience',
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  rawScopes: [],
  assertedTenantIds: ['tenant-a'],
  assertedProjectIds: [],
};

describe('CreateProjectUseCase', () => {
  it('does not call persistence when the canonical tenant command is denied', async () => {
    const repository = { createProject: vi.fn() };
    const accessDecisions = {
      decide: vi.fn(async () => ({ ok: false as const, reason: 'ACTION_NOT_GRANTED' as const })),
      decideFromSnapshot: vi.fn(() => {
        throw new Error('Denied commands must not reach locked grant revalidation.');
      }),
    };
    const useCase = new CreateProjectUseCase(repository as never, accessDecisions);

    await expect(
      useCase.execute(PRINCIPAL, {
        tenantId: 'tenant-a',
        name: 'Analytics',
        idempotencyKey: 'request-1',
      })
    ).resolves.toEqual({ kind: 'action_not_granted' });

    expect(accessDecisions.decide).toHaveBeenCalledWith(
      PRINCIPAL,
      expect.objectContaining({ resource: 'tenant', action: AUTHORIZATION_ACTION.projectCreate })
    );
    expect(repository.createProject).not.toHaveBeenCalled();
    expect(accessDecisions.decideFromSnapshot).not.toHaveBeenCalled();
  });

  it('passes only an authorized persistence intent and the exact initial workspace profile', async () => {
    const repository = {
      createProject: vi.fn(
        async (
          _command: unknown,
          _revalidateLockedGrants: (snapshot: PrincipalGrantSnapshot) => boolean
        ) => ({ kind: 'duplicate_project_name' as const })
      ),
    };
    const decideFromSnapshot = vi.fn(() => ({
      ok: true as const,
      approvedScope: { resource: 'tenant' as const, tenantId: { value: 'tenant-a' } as never },
    }));
    const useCase = new CreateProjectUseCase(repository as never, {
      decide: vi.fn(async () => ({
        ok: true as const,
        approvedScope: { resource: 'tenant' as const, tenantId: { value: 'tenant-a' } as never },
      })),
      decideFromSnapshot,
    });

    await useCase.execute(PRINCIPAL, {
      tenantId: 'tenant-a',
      name: 'Analytics',
      idempotencyKey: 'request-1',
    });

    expect(repository.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        principal: PRINCIPAL,
        defaultEnvironmentId: 'dev',
        creatorWorkspaceActions: expect.arrayContaining([
          'workspace:graph-draft:view',
          'workspace:graph-draft:save',
          'workspace:files:view',
          'workspace:files:save',
          'workspace:source-import:view',
          'workspace:source-connection:create',
          'workspace:source-connection:rename',
          'workspace:source-connection:test',
          'workspace:source-import:import',
          'workspace:source-import:rebind',
          'workspace:plugins:view',
        ]),
      }),
      expect.any(Function)
    );
    const revalidateLockedGrants = repository.createProject.mock.calls[0]![1];
    const lockedSnapshot = {
      principal: PRINCIPAL,
      suspended: false,
      tenantAccess: [],
    };
    expect(revalidateLockedGrants(lockedSnapshot)).toBe(true);
    expect(decideFromSnapshot).toHaveBeenCalledWith(
      PRINCIPAL,
      lockedSnapshot,
      expect.objectContaining({ action: AUTHORIZATION_ACTION.projectCreate })
    );
  });
});