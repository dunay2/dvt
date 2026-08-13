import type { PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import type { PrincipalGrantSnapshot } from '../../../src/application/ports/principalGrantRepository.js';
import { EmbeddedProjectOnboardingRepository } from '../../../src/infrastructure/auth/embeddedProjectOnboardingRepository.js';

const GRANTS: PrincipalGrantSnapshot = {
  principal: { principalId: 'user-1', principalType: 'user' },
  suspended: false,
  tenantAccess: [
    {
      tenantId: 'tenant-a',
      allowedActions: ['project:create'],
      projectAccess: [],
    },
  ],
};

const CREATE_COMMAND = {
  principal: GRANTS.principal,
  tenantId: 'tenant-a',
  name: 'Analytics',
  idempotencyKey: 'request-1',
  defaultEnvironmentId: 'dev',
  creatorWorkspaceActions: ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
};

describe('EmbeddedProjectOnboardingRepository', () => {
  it('serializes grant mutation and persists the exact authorized profile', async () => {
    const events: string[] = [];
    const save = vi.fn(async () => {
      events.push('save-grants');
    });
    const transactionGrants = {
      migrate: vi.fn(),
      load: vi.fn(async (_principal, options) => {
        expect(options).toEqual({ forUpdate: true });
        events.push('load-grants-for-update');
        return GRANTS;
      }),
      save,
    };
    const client = createClient(events);
    const repository = new EmbeddedProjectOnboardingRepository(
      { connect: vi.fn(async () => client), query: vi.fn() } as never,
      'dvt',
      transactionGrants,
      () => transactionGrants
    );

    const outcome = await repository.createProject(CREATE_COMMAND);

    expect(outcome).toEqual({
      kind: 'created',
      project: expect.objectContaining({
        tenantId: 'tenant-a',
        name: 'Analytics',
        environmentIds: ['dev'],
      }),
      defaultWorkspace: expect.objectContaining({
        tenantId: 'tenant-a',
        projectName: 'Analytics',
        environmentId: 'dev',
      }),
    });
    expect(events.indexOf('advisory-lock')).toBeLessThan(events.indexOf('load-idempotency'));
    expect(events.indexOf('load-grants-for-update')).toBeLessThan(events.indexOf('insert-project'));
    expect(events.indexOf('save-grants')).toBeLessThan(events.indexOf('save-idempotency'));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantAccess: [
          expect.objectContaining({
            projectAccess: [
              expect.objectContaining({
                allowedActions: CREATE_COMMAND.creatorWorkspaceActions,
                environmentAccess: [
                  expect.objectContaining({
                    allowedActions: CREATE_COMMAND.creatorWorkspaceActions,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  });

  it('reports missing project records instead of fabricating names from ids', async () => {
    const query = vi.fn(async (sql: string) =>
      sql.includes('WITH requested')
        ? { rows: [{ tenant_id: 'tenant-a', project_id: 'project-a', name: 'Analytics' }] }
        : { rows: [] }
    );
    const repository = new EmbeddedProjectOnboardingRepository(
      { query, connect: vi.fn() } as never,
      'dvt',
      {
        migrate: vi.fn(),
        save: vi.fn(),
        load: vi.fn(async () => ({
          ...GRANTS,
          tenantAccess: [
            {
              ...GRANTS.tenantAccess[0]!,
              projectAccess: [
                { projectId: 'project-a', allowedActions: [], environmentAccess: [] },
                { projectId: 'project-missing', allowedActions: [], environmentAccess: [] },
              ],
            },
          ],
        })),
      }
    );

    await expect(
      repository.listGrantedProjects({
        ...GRANTS.principal,
        subjectId: 'user-1',
        issuer: 'issuer',
        audience: 'audience',
        expiresAt: new Date('2030-01-01T00:00:00Z'),
        rawScopes: [],
        assertedTenantIds: [],
        assertedProjectIds: [],
      })
    ).resolves.toEqual({
      tenantIds: ['tenant-a'],
      projects: [
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          name: 'Analytics',
          environmentIds: [],
        },
      ],
      integrityFindings: [
        {
          kind: 'missing_project_record',
          tenantId: 'tenant-a',
          projectId: 'project-missing',
        },
      ],
    });
    expect(query).toHaveBeenCalledOnce();
  });
});

function createClient(events: string[]): PoolClient {
  return {
    release: vi.fn(),
    query: vi.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        events.push(sql.toLowerCase());
        return { rows: [] };
      }
      if (sql.includes('pg_advisory_xact_lock')) {
        events.push('advisory-lock');
        return { rows: [] };
      }
      if (sql.includes('FROM "dvt".project_creation_idempotency')) {
        events.push('load-idempotency');
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO "dvt".projects')) {
        events.push('insert-project');
        return { rows: [{ project_id: 'analytics-12345678' }] };
      }
      if (sql.includes('INSERT INTO "dvt".project_creation_idempotency')) {
        events.push('save-idempotency');
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }),
  } as never;
}
