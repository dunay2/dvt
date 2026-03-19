import { describe, it, expect } from 'vitest';

import { TenantHierarchyAuthorizationPolicy } from '../../../src/domain/auth/policy.js';
import { ProjectId, TenantId } from '../../../src/domain/auth/types.js';

describe('TenantHierarchyAuthorizationPolicy', () => {
  it('allows project grant', () => {
    const policy = new TenantHierarchyAuthorizationPolicy();

    const outcome = policy.evaluate(
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
        principal: { principalId: 'u1', principalType: 'user' },
        suspended: false,
        tenantAccess: new Map([
          [
            't1',
            {
              tenantId: 't1',
              allowedActions: [],
              projectAccess: new Map([
                [
                  'p1',
                  {
                    projectId: 'p1',
                    allowedActions: ['run:start'],
                    environmentAccess: new Map(),
                  },
                ],
              ]),
            },
          ],
        ]),
      },
      {
        tenantId: TenantId.unsafe('t1'),
        projectId: ProjectId.unsafe('p1'),
        action: { kind: 'command', name: 'run:start' },
      }
    );

    expect(outcome.kind).toBe('allow');
    if (outcome.kind === 'allow') {
      expect(outcome.approvedScope.tenantId.value).toBe('t1');
      expect(outcome.approvedScope.projectId?.value).toBe('p1');
    }
  });

  it('denies assertion conflict', () => {
    const policy = new TenantHierarchyAuthorizationPolicy();

    const outcome = policy.evaluate(
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
        principal: { principalId: 'u1', principalType: 'user' },
        suspended: false,
        tenantAccess: new Map([
          [
            't1',
            {
              tenantId: 't1',
              allowedActions: ['run:start'],
              projectAccess: new Map(),
            },
          ],
        ]),
      },
      {
        tenantId: TenantId.unsafe('t1'),
        action: { kind: 'command', name: 'run:start' },
      }
    );

    expect(outcome.kind).toBe('deny');
    if (outcome.kind === 'deny') {
      expect(outcome.reason).toBe('TOKEN_ASSERTION_CONFLICT');
    }
  });
});
