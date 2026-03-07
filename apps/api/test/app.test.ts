import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';

import { buildApp } from '../src/app.js';
import { PostgresPrincipalAccessRepository } from '../src/infrastructure/auth/postgresPrincipalAccessRepository.js';

await test('buildApp wires observability and health endpoint works', async () => {
  process.env.OBS_ENABLED = 'false';
  process.env.NODE_ENV = 'test';

  const { app, ctx } = buildApp();
  assert.ok(ctx.observability);

  const res = await app.inject({
    method: 'GET',
    url: '/healthz',
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true });

  await app.close();
});

await test(
  'buildApp migrates principal grants before serving protected runtime routes',
  async () => {
    const originalMigrate = PostgresPrincipalAccessRepository.prototype.migrate;
    let migrateCalls = 0;

    PostgresPrincipalAccessRepository.prototype.migrate = async function migrate() {
      migrateCalls += 1;
    };

    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    process.env.OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
    process.env.OIDC_ISSUER = 'https://issuer.example/';
    process.env.OIDC_AUDIENCE = 'dvt-api';

    try {
      const { app } = buildApp();
      await app.ready();

      assert.equal(migrateCalls, 1);

      await app.close();
    } finally {
      PostgresPrincipalAccessRepository.prototype.migrate = originalMigrate;
      delete process.env.DATABASE_URL;
      delete process.env.OIDC_JWKS_URI;
      delete process.env.OIDC_ISSUER;
      delete process.env.OIDC_AUDIENCE;
    }
  }
);

await test('buildApp fails fast when OIDC is enabled without DATABASE_URL', () => {
  process.env.OBS_ENABLED = 'false';
  process.env.NODE_ENV = 'test';
  delete process.env.DATABASE_URL;
  process.env.OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
  process.env.OIDC_ISSUER = 'https://issuer.example/';
  process.env.OIDC_AUDIENCE = 'dvt-api';

  try {
    assert.throws(
      () => buildApp(),
      /DATABASE_URL is required when OIDC-protected runtime routes are enabled/
    );
  } finally {
    delete process.env.OIDC_JWKS_URI;
    delete process.env.OIDC_ISSUER;
    delete process.env.OIDC_AUDIENCE;
  }
});
