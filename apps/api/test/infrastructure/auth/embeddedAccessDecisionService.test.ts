import { describe, expect, it } from 'vitest';

import { ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import { EmbeddedAccessDecisionService } from '../../../src/infrastructure/auth/embeddedAccessDecisionService.js';

function normalizeSql(sql: string): string {
  return sql.replaceAll(/\s+/g, ' ').trim();
}

describe('EmbeddedAccessDecisionService', () => {
  it('creates the schema before the grants table', async () => {
    const queries: string[] = [];
    const pool = {
      async query(sql: string) {
        queries.push(sql);
        return { rows: [] };
      },
    };

    const service = new EmbeddedAccessDecisionService(pool as never, 'authz');
    await service.migrate();

    expect(queries.length).toBe(2);
    expect(normalizeSql(queries[0]!)).toMatch(/^CREATE SCHEMA IF NOT EXISTS authz;$/i);
    expect(normalizeSql(queries[1]!)).toMatch(
      /^CREATE TABLE IF NOT EXISTS authz\.principal_grants \(/i
    );
  });

  it('allows project grant', async () => {
    const service = new EmbeddedAccessDecisionService({
      async query() {
        return {
          rows: [
            {
              principal_id: 'u1',
              principal_type: 'user',
              suspended: false,
              tenant_access: [
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
            },
          ],
        };
      },
    } as never);

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
      async query() {
        return {
          rows: [
            {
              principal_id: 'u1',
              principal_type: 'user',
              suspended: false,
              tenant_access: [
                {
                  tenantId: 't1',
                  allowedActions: ['run:start'],
                  projectAccess: [],
                },
              ],
            },
          ],
        };
      },
    } as never);

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
