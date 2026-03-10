import assert from 'node:assert/strict';
import test from 'node:test';

import type { AuthAuditEvent } from '../../../src/application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import { TenantHierarchyAuthorizationPolicy } from '../../../src/domain/auth/policy.js';
import { TenantId } from '../../../src/domain/auth/types.js';

await test('AuthorizeCommandScopeService returns approved scope only', async () => {
  const repo = {
    async loadEffectiveAccess() {
      return {
        principal: { principalId: 'u1', principalType: 'user' as const },
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
      };
    },
  };

  const auditEvents: AuthAuditEvent[] = [];
  const audit = {
    async record(event: AuthAuditEvent) {
      auditEvents.push(event);
    },
  };

  const service = new AuthorizeCommandScopeService(
    repo,
    new TenantHierarchyAuthorizationPolicy(),
    audit,
    () => new Date('2026-03-07T20:00:00Z')
  );

  const result = await service.authorize(
    {
      principalId: 'u1',
      subjectId: 'u1',
      issuer: 'issuer',
      audience: 'audience',
      principalType: 'user',
      expiresAt: new Date('2030-01-01T00:00:00Z'),
      rawScopes: [],
      assertedTenantIds: ['t1'],
      assertedProjectIds: [],
    },
    {
      tenantId: TenantId.unsafe('t1'),
      action: { kind: 'command', name: 'run:start' },
    },
    'req-1'
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.context.scope.tenantId.value, 't1');
    assert.equal('requestedScope' in (result.context as unknown as Record<string, unknown>), false);
  }

  assert.equal(auditEvents.length, 1);
  assert.equal(auditEvents[0]?.eventType, 'AUTH_GRANTED');
});
