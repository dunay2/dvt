import { describe, expect, it } from 'vitest';

import { ProjectId, TenantId } from '../../../src/domain/auth/types.js';
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
});
