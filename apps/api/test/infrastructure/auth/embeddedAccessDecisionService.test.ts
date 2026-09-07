import { describe, expect, it, vi } from 'vitest';

import { AUTHORIZATION_ACTION } from '../../../src/application/ports/accessDecision.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import { EmbeddedAccessDecisionService } from '../../../src/infrastructure/auth/embeddedAccessDecisionService.js';

describe('EmbeddedAccessDecisionService', () => {
  it('creates the schema before the grants table', async () => {
    const queries: string[] = [];
    const grants = {
      async migrate() {
        queries.push('migrate');
      },
      async load() {
        return null;
      },
    };

    const service = new EmbeddedAccessDecisionService(grants);
    await service.migrate();

    expect(queries).toEqual(['migrate']);
  });

  it('allows project grant', async () => {
    const service = new EmbeddedAccessDecisionService({
      async migrate() {},
      async load() {
        return {
          principal: { principalId: 'u1', principalType: 'user' as const },
          suspended: false,
          tenantAccess: [
            {
              tenantId: 't1',
              allowedActions: [],
              projectAccess: [
                {
                  projectId: 'p1',
                  allowedActions: ['run:start'],
                  environmentAccess: [],
                },
              ],
            },
          ],
        };
      },
    });

    const outcome = await service.decide(
      {
        principalId: 'u1',
        subjectId: 'u1',
        issuer: 'issuer',
        audience: 'audience',
        principalType: 'user',
        expiresAt: new Date('2030-01-01T00:00:00Z'),
        rawScopes: [],
        assertedTenantIds: ['t1'],
        assertedProjectIds: ['p1'],
      },
      {
        resource: 'project',
        tenantId: TenantId.unsafe('t1'),
        projectId: ProjectId.unsafe('p1'),
        action: { kind: 'command', name: 'run:start' },
      }
    );

    expect(outcome).toEqual({
      ok: true,
      approvedScope: {
        resource: 'project',
        tenantId: TenantId.unsafe('t1'),
        projectId: ProjectId.unsafe('p1'),
      },
    });
  });

  it('recognizes the complete pre-rename creator profile without widening partial grants', async () => {
    const legacyCreatorActions = [
      'workspace:graph-draft:view',
      'workspace:graph-draft:save',
      'workspace:files:view',
      'workspace:files:save',
      'workspace:source-import:view',
      'workspace:source-connection:create',
      'workspace:source-connection:test',
      'workspace:source-import:import',
      'workspace:plugins:view',
    ];
    const buildService = (allowedActions: readonly string[]): EmbeddedAccessDecisionService =>
      new EmbeddedAccessDecisionService({
        async migrate() {},
        async load() {
          return {
            principal: { principalId: 'u1', principalType: 'user' as const },
            suspended: false,
            tenantAccess: [
              {
                tenantId: 't1',
                allowedActions: [],
                projectAccess: [
                  {
                    projectId: 'p1',
                    allowedActions: [],
                    environmentAccess: [{ environmentId: 'dev', allowedActions }],
                  },
                ],
              },
            ],
          };
        },
      });
    const principal = {
      principalId: 'u1',
      subjectId: 'u1',
      issuer: 'issuer',
      audience: 'audience',
      principalType: 'user' as const,
      expiresAt: new Date('2030-01-01T00:00:00Z'),
      rawScopes: [],
      assertedTenantIds: ['t1'],
      assertedProjectIds: ['p1'],
    };
    const requestedScope = {
      resource: 'environment' as const,
      tenantId: TenantId.unsafe('t1'),
      projectId: ProjectId.unsafe('p1'),
      environmentId: EnvironmentId.unsafe('dev'),
      action: AUTHORIZATION_ACTION.workspaceSourceConnectionRename,
    };

    await expect(
      buildService(legacyCreatorActions).decide(principal, requestedScope)
    ).resolves.toEqual({
      ok: true,
      approvedScope: {
        resource: 'environment',
        tenantId: TenantId.unsafe('t1'),
        projectId: ProjectId.unsafe('p1'),
        environmentId: EnvironmentId.unsafe('dev'),
      },
    });
    await expect(
      buildService(legacyCreatorActions).decide(principal, {
        ...requestedScope,
        action: AUTHORIZATION_ACTION.workspaceSourceImportRebind,
      })
    ).resolves.toEqual({
      ok: true,
      approvedScope: {
        resource: 'environment',
        tenantId: TenantId.unsafe('t1'),
        projectId: ProjectId.unsafe('p1'),
        environmentId: EnvironmentId.unsafe('dev'),
      },
    });
    const partialCreator = buildService(['workspace:source-connection:create']);
    await expect(partialCreator.decide(principal, requestedScope)).resolves.toEqual({
      ok: false,
      reason: 'ACTION_NOT_GRANTED',
    });
    await expect(
      partialCreator.decide(principal, {
        ...requestedScope,
        action: AUTHORIZATION_ACTION.workspaceSourceImportRebind,
      })
    ).resolves.toEqual({ ok: false, reason: 'ACTION_NOT_GRANTED' });
  });

  it('denies assertion conflict', async () => {
    const service = new EmbeddedAccessDecisionService({
      async migrate() {},
      async load() {
        return {
          principal: { principalId: 'u1', principalType: 'user' as const },
          suspended: false,
          tenantAccess: [
            {
              tenantId: 't1',
              allowedActions: ['run:start'],
              projectAccess: [],
            },
          ],
        };
      },
    });

    const outcome = await service.decide(
      {
        principalId: 'u1',
        subjectId: 'u1',
        issuer: 'issuer',
        audience: 'audience',
        principalType: 'user',
        expiresAt: new Date('2030-01-01T00:00:00Z'),
        rawScopes: [],
        assertedTenantIds: ['t2'],
        assertedProjectIds: [],
      },
      {
        resource: 'tenant',
        tenantId: TenantId.unsafe('t1'),
        action: { kind: 'command', name: 'run:start' },
      }
    );

    expect(outcome).toEqual({ ok: false, reason: 'TOKEN_ASSERTION_CONFLICT' });
  });

  it('derives a capability batch from one grant snapshot and enforces project assertions', async () => {
    const load = vi.fn(async () => ({
      principal: { principalId: 'u1', principalType: 'user' as const },
      suspended: false,
      tenantAccess: [
        {
          tenantId: 't1',
          allowedActions: [],
          projectAccess: [
            {
              projectId: 'p1',
              allowedActions: [],
              environmentAccess: [
                {
                  environmentId: 'dev',
                  allowedActions: ['workspace:graph-draft:view'],
                },
              ],
            },
          ],
        },
      ],
    }));
    const service = new EmbeddedAccessDecisionService({ async migrate() {}, load });
    const principal = {
      principalId: 'u1',
      subjectId: 'u1',
      issuer: 'issuer',
      audience: 'audience',
      principalType: 'user' as const,
      expiresAt: new Date('2030-01-01T00:00:00Z'),
      rawScopes: [],
      assertedTenantIds: ['t1'],
      assertedProjectIds: ['p1'],
    };
    const scope = {
      resource: 'workspace-graph-draft' as const,
      tenantId: TenantId.unsafe('t1'),
      projectId: ProjectId.unsafe('p1'),
      environmentId: EnvironmentId.unsafe('dev'),
    };

    await expect(
      service.decideMany(principal, [
        { ...scope, action: { kind: 'query', name: 'workspace:graph-draft:view' } },
        { ...scope, action: { kind: 'command', name: 'workspace:graph-draft:save' } },
      ])
    ).resolves.toEqual([
      { ok: true, approvedScope: scope },
      { ok: false, reason: 'ACTION_NOT_GRANTED' },
    ]);
    expect(load).toHaveBeenCalledOnce();

    await expect(
      service.decide(
        { ...principal, assertedProjectIds: ['p2'] },
        { ...scope, action: { kind: 'query', name: 'workspace:graph-draft:view' } }
      )
    ).resolves.toEqual({ ok: false, reason: 'TOKEN_ASSERTION_CONFLICT' });
  });
});
