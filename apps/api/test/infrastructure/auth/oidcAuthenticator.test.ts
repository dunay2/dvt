import assert from 'node:assert/strict';
import test from 'node:test';

import { OidcAuthenticator } from '../../../src/infrastructure/auth/oidcAuthenticator.js';

await test('OidcAuthenticator preserves verifier failures', async () => {
  const authenticator = new OidcAuthenticator({
    async verify() {
      return { ok: false as const, code: 'INVALID_AUDIENCE' as const };
    },
  });

  const result = await authenticator.authenticateBearerToken('token');
  assert.deepEqual(result, { ok: false, code: 'INVALID_AUDIENCE' });
});

await test('OidcAuthenticator maps claims into principal', async () => {
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
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.principal.subjectId, 'u1');
    assert.equal(result.principal.principalType, 'service');
    assert.deepEqual(result.principal.rawScopes, ['runs:start', 'runs:view']);
    assert.deepEqual(result.principal.assertedTenantIds, ['t1']);
  }
});
