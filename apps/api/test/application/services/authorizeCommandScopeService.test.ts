import { describe, expect, it } from 'vitest';

import type { AuthAuditEvent } from '../../../src/application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import { TenantId } from '../../../src/domain/auth/types.js';

describe('AuthorizeCommandScopeService', () => {
  it('returns approved scope only', async () => {
    const accessDecisionService = {
      async decide() {
        return {
          ok: true as const,
          approvedScope: {
            tenantId: TenantId.unsafe('t1'),
          },
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
      accessDecisionService,
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

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.scope.tenantId.value).toBe('t1');
      expect('requestedScope' in (result.context as unknown as Record<string, unknown>)).toBe(
        false
      );
    }

    expect(auditEvents.length).toBe(1);
    expect(auditEvents[0]).toMatchObject({
      eventType: 'AUTH_GRANTED',
      action: 'run:start',
      tenantId: 't1',
    });
  });

  it('records denied decisions from the access-decision seam', async () => {
    const accessDecisionService = {
      async decide() {
        return {
          ok: false as const,
          reason: 'TOKEN_ASSERTION_CONFLICT' as const,
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
      accessDecisionService,
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
        assertedTenantIds: ['t2'],
        assertedProjectIds: [],
      },
      {
        tenantId: TenantId.unsafe('t1'),
        action: { kind: 'command', name: 'run:start' },
      },
      'req-1'
    );

    expect(result).toEqual({ ok: false, reason: 'TOKEN_ASSERTION_CONFLICT' });
    expect(auditEvents).toMatchObject([
      {
        eventType: 'AUTH_DENIED',
        action: 'run:start',
        denialReason: 'TOKEN_ASSERTION_CONFLICT',
      },
    ]);
  });
});
