import { describe, it, expect } from 'vitest';

import { OidcAuthenticator } from '../../../src/infrastructure/auth/oidcAuthenticator.js';

describe('OidcAuthenticator', () => {
  it('preserves verifier failures', async () => {
    const authenticator = new OidcAuthenticator({
      async verify() {
        return { ok: false as const, code: 'INVALID_AUDIENCE' as const };
      },
    });

    const result = await authenticator.authenticateBearerToken('token');
    expect(result).toEqual({ ok: false, code: 'INVALID_AUDIENCE' });
  });

  it('maps claims into principal', async () => {
    const authenticator = new OidcAuthenticator({
      async verify() {
        return {
          ok: true as const,
          claims: {
            sub: 'u1',
            iss: 'issuer',
            aud: 'audience',
            exp: 1_900_000_000,
            iat: 1_800_000_000,
            jti: 'j1',
            scope: 'runs:start runs:view',
            tenant_ids: ['t1'],
            project_ids: ['p1'],
            principal_type: 'service' as const,
          },
        };
      },
    });

    const result = await authenticator.authenticateBearerToken('token');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.principal.subjectId).toBe('u1');
      expect(result.principal.principalType).toBe('service');
      expect(result.principal.rawScopes).toEqual(['runs:start', 'runs:view']);
      expect(result.principal.assertedTenantIds).toEqual(['t1']);
    }
  });
});
