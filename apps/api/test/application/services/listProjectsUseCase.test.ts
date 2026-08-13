import { describe, expect, it, vi } from 'vitest';

import { AUTHORIZATION_ACTION } from '../../../src/application/ports/accessDecision.js';
import { ListProjectsUseCase } from '../../../src/application/services/listProjectsUseCase.js';

const PRINCIPAL = {
  principalId: 'user-1',
  principalType: 'user' as const,
  subjectId: 'user-1',
  issuer: 'issuer',
  audience: 'audience',
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  rawScopes: [],
  assertedTenantIds: ['tenant-a', 'tenant-b', 'tenant-c'],
  assertedProjectIds: [],
};

describe('ListProjectsUseCase', () => {
  it('authorizes every tenant through one set-based access decision', async () => {
    const repository = {
      listGrantedProjects: vi.fn(async () => ({
        tenantIds: ['tenant-a', 'tenant-b', 'tenant-c'],
        projects: [],
        integrityFindings: [],
      })),
    };
    const decide = vi.fn(() => {
      throw new Error('ListProjects must not authorize tenants one by one.');
    });
    const decideMany = vi.fn(async (_principal, requestedScopes) =>
      requestedScopes.map((requestedScope: { readonly tenantId: { readonly value: string } }) =>
        requestedScope.tenantId.value === 'tenant-b'
          ? ({ ok: false, reason: 'ACTION_NOT_GRANTED' } as const)
          : ({
              ok: true,
              approvedScope: {
                resource: 'tenant',
                tenantId: requestedScope.tenantId,
              },
            } as const)
      )
    );
    const useCase = new ListProjectsUseCase(
      repository as never,
      {
        decide,
        decideMany,
      } as never
    );

    await expect(useCase.execute(PRINCIPAL)).resolves.toEqual({
      tenants: [
        { tenantId: 'tenant-a', canCreateProject: true },
        { tenantId: 'tenant-b', canCreateProject: false },
        { tenantId: 'tenant-c', canCreateProject: true },
      ],
      projects: [],
      integrityFindings: [],
    });
    expect(repository.listGrantedProjects).toHaveBeenCalledOnce();
    expect(decide).not.toHaveBeenCalled();
    expect(decideMany).toHaveBeenCalledOnce();
    expect(decideMany).toHaveBeenCalledWith(
      PRINCIPAL,
      expect.arrayContaining([
        expect.objectContaining({
          resource: 'tenant',
          action: AUTHORIZATION_ACTION.projectCreate,
        }),
      ])
    );
  });
});
