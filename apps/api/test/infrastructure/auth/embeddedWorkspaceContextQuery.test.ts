import { describe, expect, it, vi } from 'vitest';

import type { PrincipalGrantSnapshot } from '../../../src/application/ports/principalGrantRepository.js';
import { EmbeddedWorkspaceContextQuery } from '../../../src/infrastructure/auth/embeddedWorkspaceContextQuery.js';

const PRINCIPAL = {
  principalId: 'u1',
  subjectId: 'u1',
  issuer: 'issuer',
  audience: 'audience',
  principalType: 'user' as const,
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  rawScopes: [],
  assertedTenantIds: ['tenant-a'],
  assertedProjectIds: ['project-a'],
};

function snapshot(overrides: Partial<PrincipalGrantSnapshot> = {}): PrincipalGrantSnapshot {
  return {
    principal: { principalId: 'u1', principalType: 'user' },
    suspended: false,
    tenantAccess: [
      {
        tenantId: 'tenant-a',
        allowedActions: [],
        projectAccess: [
          {
            projectId: 'project-a',
            allowedActions: [],
            environmentAccess: [
              { environmentId: 'prod', allowedActions: [] },
              { environmentId: 'dev', allowedActions: [] },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('EmbeddedWorkspaceContextQuery', () => {
  it('projects a deterministic named default workspace through one catalog query', async () => {
    const load = vi.fn(async () => snapshot());
    const projectQuery = vi.fn(async () => ({
      rows: [{ tenant_id: 'tenant-a', project_id: 'project-a', name: 'Analytics' }],
    }));
    const query = new EmbeddedWorkspaceContextQuery({ load }, { query: projectQuery } as never);

    await expect(query.getEffectiveWorkspaceContext(PRINCIPAL)).resolves.toEqual({
      defaultWorkspace: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        projectName: 'Analytics',
        environmentId: 'dev',
      },
      availableWorkspaces: [
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          projectName: 'Analytics',
          environmentId: 'dev',
        },
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          projectName: 'Analytics',
          environmentId: 'prod',
        },
      ],
    });
    expect(projectQuery).toHaveBeenCalledOnce();
  });

  it('returns null without querying the catalog for suspended grants', async () => {
    const projectQuery = vi.fn();
    const query = new EmbeddedWorkspaceContextQuery(
      { load: vi.fn(async () => snapshot({ suspended: true })) },
      { query: projectQuery } as never
    );

    await expect(query.getEffectiveWorkspaceContext(PRINCIPAL)).resolves.toBeNull();
    expect(projectQuery).not.toHaveBeenCalled();
  });

  it('does not invent a project name when a granted project row is missing', async () => {
    const query = new EmbeddedWorkspaceContextQuery({ load: vi.fn(async () => snapshot()) }, {
      query: vi.fn(async () => ({ rows: [] })),
    } as never);

    await expect(query.getEffectiveWorkspaceContext(PRINCIPAL)).resolves.toBeNull();
  });
});
