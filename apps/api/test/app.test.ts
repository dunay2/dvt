import process from 'node:process';

import { describe, it, expect } from 'vitest';

import { buildApp } from '../src/app.js';
import { PostgresPrincipalAccessRepository } from '../src/infrastructure/auth/postgresPrincipalAccessRepository.js';

const adapterPostgres = await import('@dvt/adapter-postgres');
const { PostgresPlanStore, PostgresStartRunIntentStore, PostgresStateStoreAdapter } =
  adapterPostgres;

describe('buildApp', () => {
  it('wires observability and health endpoint works', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';

    const { app, ctx } = await buildApp();
    expect(ctx.observability).toBeTruthy();

    const res = await app.inject({
      method: 'GET',
      url: '/healthz',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    await app.close();
  });

  it('migrates principal grants before serving protected runtime routes', async () => {
    const originalAccessRepoMigrate = PostgresPrincipalAccessRepository.prototype.migrate;
    const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
    const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
    const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
    let accessRepoMigrateCalls = 0;
    let planStoreMigrateCalls = 0;
    let stateStoreMigrateCalls = 0;
    let intentStoreMigrateCalls = 0;

    PostgresPrincipalAccessRepository.prototype.migrate = async function migrate() {
      accessRepoMigrateCalls += 1;
    };
    PostgresPlanStore.prototype.migrate = async function migrate() {
      planStoreMigrateCalls += 1;
    };
    PostgresStateStoreAdapter.prototype.migrate = async function migrate() {
      stateStoreMigrateCalls += 1;
    };
    PostgresStartRunIntentStore.prototype.migrate = async function migrate() {
      intentStoreMigrateCalls += 1;
    };

    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    process.env.OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
    process.env.OIDC_ISSUER = 'https://issuer.example/';
    process.env.OIDC_AUDIENCE = 'dvt-api';

    try {
      const { app } = await buildApp();
      await app.ready();

      expect(accessRepoMigrateCalls).toBe(1);
      expect(planStoreMigrateCalls).toBe(1);
      expect(stateStoreMigrateCalls).toBe(1);
      expect(intentStoreMigrateCalls).toBe(1);

      await app.close();
    } finally {
      PostgresPrincipalAccessRepository.prototype.migrate = originalAccessRepoMigrate;
      PostgresPlanStore.prototype.migrate = originalPlanStoreMigrate;
      PostgresStateStoreAdapter.prototype.migrate = originalStateStoreMigrate;
      PostgresStartRunIntentStore.prototype.migrate = originalIntentStoreMigrate;
      delete process.env.DATABASE_URL;
      delete process.env.OIDC_JWKS_URI;
      delete process.env.OIDC_ISSUER;
      delete process.env.OIDC_AUDIENCE;
    }
  });

  it('fails fast when OIDC is enabled without DATABASE_URL', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    delete process.env.DATABASE_URL;
    process.env.OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
    process.env.OIDC_ISSUER = 'https://issuer.example/';
    process.env.OIDC_AUDIENCE = 'dvt-api';

    try {
      await expect(() => buildApp()).rejects.toThrow(
        /DATABASE_URL is required when OIDC-protected runtime routes are enabled/
      );
    } finally {
      delete process.env.OIDC_JWKS_URI;
      delete process.env.OIDC_ISSUER;
      delete process.env.OIDC_AUDIENCE;
    }
  });
});
