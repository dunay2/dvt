import process from 'node:process';

import { buildApp } from '../../src/app.js';

export type BuiltApp = Awaited<ReturnType<typeof buildApp>>;
export type AppEnvPatch = Record<string, string | undefined>;

const TEST_DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
const TEST_OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
const TEST_OIDC_ISSUER = 'https://issuer.example/';
const TEST_OIDC_AUDIENCE = 'dvt-api';
const TEST_TEMPORAL_ADDRESS = 'temporal.test:7233';

export const BASE_APP_ENV = {
  OBS_ENABLED: 'false',
  NODE_ENV: 'test',
} satisfies AppEnvPatch;

export const DATABASE_APP_ENV = {
  DATABASE_URL: TEST_DATABASE_URL,
} satisfies AppEnvPatch;

export const OIDC_APP_ENV = {
  OIDC_JWKS_URI: TEST_OIDC_JWKS_URI,
  OIDC_ISSUER: TEST_OIDC_ISSUER,
  OIDC_AUDIENCE: TEST_OIDC_AUDIENCE,
} satisfies AppEnvPatch;

export const PARTIAL_OIDC_APP_ENV = {
  OIDC_JWKS_URI: TEST_OIDC_JWKS_URI,
  OIDC_ISSUER: undefined,
  OIDC_AUDIENCE: TEST_OIDC_AUDIENCE,
} satisfies AppEnvPatch;

export const TEMPORAL_APP_ENV = {
  TEMPORAL_ADDRESS: TEST_TEMPORAL_ADDRESS,
  TEMPORAL_NAMESPACE: 'default',
  TEMPORAL_TASK_QUEUE: 'dvt-test',
} satisfies AppEnvPatch;

export const PROTECTED_RUNTIME_DISABLED_ENV = {
  DATABASE_URL: undefined,
  OIDC_JWKS_URI: undefined,
  OIDC_ISSUER: undefined,
  OIDC_AUDIENCE: undefined,
  TEMPORAL_ADDRESS: undefined,
  TEMPORAL_NAMESPACE: undefined,
  TEMPORAL_TASK_QUEUE: undefined,
} satisfies AppEnvPatch;

export const ADMIN_ROUTES_ENABLED_ENV = {
  DVT_ADMIN_ROUTES_ENABLED: 'true',
} satisfies AppEnvPatch;

export const RECONCILER_ENABLED_ENV = {
  DVT_INTENT_RECONCILER_ENABLED: 'true',
} satisfies AppEnvPatch;

export const READYZ_ENABLED_ENV = {
  DVT_READYZ_ENABLED: 'true',
} satisfies AppEnvPatch;

export function mergeEnv(...patches: readonly AppEnvPatch[]): AppEnvPatch {
  return Object.assign({}, ...patches);
}

function applyEnvPatch(patch: AppEnvPatch): void {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
}

export async function withEnvPatch<T>(patch: AppEnvPatch, run: () => Promise<T>): Promise<T> {
  const original = new Map<string, string | undefined>();
  for (const key of Object.keys(patch)) {
    original.set(key, process.env[key]);
  }

  applyEnvPatch(patch);

  try {
    return await run();
  } finally {
    applyEnvPatch(Object.fromEntries(original) as AppEnvPatch);
  }
}

export async function withAppEnv<T>(
  patch: AppEnvPatch,
  run: (built: BuiltApp) => Promise<T>
): Promise<T> {
  return await withEnvPatch(patch, async () => {
    let built: BuiltApp | undefined;
    try {
      built = await buildApp();
      return await run(built);
    } finally {
      if (built !== undefined) {
        await built.app.close();
      }
    }
  });
}
