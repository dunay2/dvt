import { describe, expect, it } from 'vitest';

import { EmbeddedWorkspaceContextQuery } from '../../../src/infrastructure/auth/embeddedWorkspaceContextQuery.js';

function principal(
  overrides: Partial<
    Parameters<EmbeddedWorkspaceContextQuery['getEffectiveWorkspaceContext']>[0]
  > = {}
): Parameters<EmbeddedWorkspaceContextQuery['getEffectiveWorkspaceContext']>[0] {
  return {
    principalId: 'u1',
    subjectId: 'u1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user' as const,
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: ['project-a'],
    ...overrides,
  };
}

describe('EmbeddedWorkspaceContextQuery', () => {
  it('projects the first granted environment as the effective workspace context', async () => {
    const query = new EmbeddedWorkspaceContextQuery({
      async query() {
        return {
          rows: [
            {
              principal_id: 'u1',
              principal_type: 'user',
              suspended: false,
              tenant_access: [
                {
                  tenantId: 'tenant-a',
                  allowedActions: [],
                  projectAccess: [
                    {
                      projectId: 'project-a',
                      allowedActions: [],
                      environmentAccess: [
                        { environmentId: 'dev', allowedActions: [] },
                        { environmentId: 'prod', allowedActions: [] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        };
      },
    } as never);

    await expect(query.getEffectiveWorkspaceContext(principal())).resolves.toEqual({
      effectiveWorkspace: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
      },
      availableWorkspaces: [
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'dev',
        },
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'prod',
        },
      ],
    });
  });

  it('returns null when the principal grant row is suspended', async () => {
    const query = new EmbeddedWorkspaceContextQuery({
      async query() {
        return {
          rows: [
            {
              principal_id: 'u1',
              principal_type: 'user',
              suspended: true,
              tenant_access: [],
            },
          ],
        };
      },
    } as never);

    await expect(query.getEffectiveWorkspaceContext(principal())).resolves.toBeNull();
  });

  it('filters granted workspaces through token tenant and project assertions', async () => {
    const query = new EmbeddedWorkspaceContextQuery({
      async query() {
        return {
          rows: [
            {
              principal_id: 'u1',
              principal_type: 'user',
              suspended: false,
              tenant_access: [
                {
                  tenantId: 'tenant-a',
                  allowedActions: [],
                  projectAccess: [
                    {
                      projectId: 'project-a',
                      allowedActions: [],
                      environmentAccess: [{ environmentId: 'dev', allowedActions: [] }],
                    },
                    {
                      projectId: 'project-b',
                      allowedActions: [],
                      environmentAccess: [{ environmentId: 'dev', allowedActions: [] }],
                    },
                  ],
                },
                {
                  tenantId: 'tenant-b',
                  allowedActions: [],
                  projectAccess: [
                    {
                      projectId: 'project-a',
                      allowedActions: [],
                      environmentAccess: [{ environmentId: 'dev', allowedActions: [] }],
                    },
                  ],
                },
              ],
            },
          ],
        };
      },
    } as never);

    await expect(
      query.getEffectiveWorkspaceContext(
        principal({
          assertedTenantIds: ['tenant-a'],
          assertedProjectIds: ['project-b'],
        })
      )
    ).resolves.toEqual({
      effectiveWorkspace: {
        tenantId: 'tenant-a',
        projectId: 'project-b',
        environmentId: 'dev',
      },
      availableWorkspaces: [
        {
          tenantId: 'tenant-a',
          projectId: 'project-b',
          environmentId: 'dev',
        },
      ],
    });
  });
});
