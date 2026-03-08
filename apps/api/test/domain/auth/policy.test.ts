import assert from 'node:assert/strict';
import test from 'node:test';

import { TenantHierarchyAuthorizationPolicy } from '../../../src/domain/auth/policy.js';
import { ProjectId, TenantId } from '../../../src/domain/auth/types.js';

await test('TenantHierarchyAuthorizationPolicy allows project grant', () => {
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

  assert.equal(outcome.kind, 'allow');
  if (outcome.kind === 'allow') {
    assert.equal(outcome.approvedScope.tenantId.value, 't1');
    assert.equal(outcome.approvedScope.projectId?.value, 'p1');
  }
});

await test('TenantHierarchyAuthorizationPolicy denies assertion conflict', () => {
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

  assert.equal(outcome.kind, 'deny');
  if (outcome.kind === 'deny') {
    assert.equal(outcome.reason, 'TOKEN_ASSERTION_CONFLICT');
  }
});
