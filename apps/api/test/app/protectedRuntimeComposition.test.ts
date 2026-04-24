import { describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';

import {
  BASE_APP_ENV,
  DATABASE_APP_ENV,
  OIDC_APP_ENV,
  TEMPORAL_APP_ENV,
  mergeEnv,
  withAppEnv,
  withEnvPatch,
} from './appEnvTestSupport.js';
import { withCapturedProtectedRuntimeMigrations } from './protectedRuntimeAppTestSupport.js';

describe('buildApp protected runtime composition', () => {
  it('migrates embedded access decisions before serving protected runtime routes', async () => {
    await withCapturedProtectedRuntimeMigrations(async (migrationCalls) => {
      await withAppEnv(
        mergeEnv(BASE_APP_ENV, DATABASE_APP_ENV, OIDC_APP_ENV, TEMPORAL_APP_ENV),
        async ({ app }) => {
          await app.ready();

          expect(migrationCalls()).toEqual({
            accessDecision: 1,
            planStore: 1,
            stateStore: 1,
            intentStore: 1,
            workspaceGraphDraftStore: 1,
          });
        }
      );
    });
  });

  it('fails fast when OIDC is enabled without DATABASE_URL', async () => {
    await withEnvPatch(mergeEnv(BASE_APP_ENV, OIDC_APP_ENV, { DATABASE_URL: undefined }), async () => {
      await expect(() => buildApp()).rejects.toThrow(
        /DATABASE_URL is required when OIDC-protected runtime routes are enabled/
      );
    });
  });
});
