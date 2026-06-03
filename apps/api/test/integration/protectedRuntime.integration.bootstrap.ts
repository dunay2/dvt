/**
 * @file apps/api/test/integration/protectedRuntime.integration.bootstrap.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Isolate protected-runtime integration bootstrap lifecycle from harness composition
 * @date 2026-04-18
 */
import process from 'node:process';

import { Client } from 'pg';

import { buildApp } from '../../src/app.js';

import {
  closeServer,
  type JwksServerHandle,
  startJwksServer,
  type SigningKey,
} from './protectedRuntime.integration.auth.js';
import { quoteIdentifier, upsertPrincipalGrant } from './protectedRuntime.integration.persistence.js';
import {
  DATABASE_URL,
  ENVIRONMENT_ID,
  PRINCIPAL_ID,
  PROJECT_ID,
  PROTECTED_RUNTIME_AUDIENCE,
  PROTECTED_RUNTIME_ISSUER,
  TENANT_ACTIONS_FULL,
  TENANT_ID,
  TEMPORAL_ADDRESS,
} from './protectedRuntime.integration.shared.js';

type StoredEnv = Record<string, string | undefined>;
export type ProtectedRuntimeApp = Awaited<ReturnType<typeof buildApp>>['app'];
export type ProtectedRuntimeBootstrapState = {
  app?: ProtectedRuntimeApp;
  adminClient?: Client;
  jwksServer?: JwksServerHandle;
  signingKey?: SigningKey;
  originalEnv: StoredEnv;
};

export async function bootstrapProtectedRuntimeState(
  state: ProtectedRuntimeBootstrapState,
  schema: string
): Promise<void> {
  if (!DATABASE_URL || !TEMPORAL_ADDRESS) {
    throw new Error(
      'DATABASE_URL/DVT_PG_URL and TEMPORAL_ADDRESS are required for protected runtime integration tests'
    );
  }

  state.jwksServer = await startJwksServer();
  state.originalEnv = captureEnv([
    'NODE_ENV',
    'OBS_ENABLED',
    'DATABASE_URL',
    'DVT_PG_SCHEMA',
    'OIDC_JWKS_URI',
    'OIDC_ISSUER',
    'OIDC_AUDIENCE',
    'OIDC_ALGORITHMS',
    'DVT_ADMIN_ROUTES_ENABLED',
    'TEMPORAL_ADDRESS',
    'TEMPORAL_NAMESPACE',
    'TEMPORAL_TASK_QUEUE',
    'TEMPORAL_IDENTITY',
  ]);

  process.env.NODE_ENV = 'test';
  process.env.OBS_ENABLED = 'false';
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.DVT_PG_SCHEMA = schema;
  process.env.OIDC_JWKS_URI = state.jwksServer.jwksUri;
  process.env.OIDC_ISSUER = PROTECTED_RUNTIME_ISSUER;
  process.env.OIDC_AUDIENCE = PROTECTED_RUNTIME_AUDIENCE;
  process.env.OIDC_ALGORITHMS = 'RS256';
  process.env.DVT_ADMIN_ROUTES_ENABLED = 'true';
  process.env.TEMPORAL_ADDRESS = TEMPORAL_ADDRESS;

  const built = await buildApp();
  state.app = built.app;
  await state.app.ready();

  state.adminClient = new Client({ connectionString: DATABASE_URL });
  await state.adminClient.connect();
  await upsertPrincipalGrant(state.adminClient, {
    schema,
    principalId: PRINCIPAL_ID,
    principalType: 'user',
    tenantId: TENANT_ID,
    projectId: PROJECT_ID,
    environmentId: ENVIRONMENT_ID,
    tenantActions: TENANT_ACTIONS_FULL,
  });

  state.signingKey = state.jwksServer.privateKey;
}

export async function teardownProtectedRuntimeState(
  state: ProtectedRuntimeBootstrapState,
  schema: string
): Promise<void> {
  if (state.app) {
    await state.app.close();
  }

  if (state.adminClient) {
    try {
      await state.adminClient.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    } finally {
      await state.adminClient.end();
    }
  }

  if (state.jwksServer) {
    await closeServer(state.jwksServer.server);
  }

  restoreEnv(state.originalEnv);
}

export function requireProtectedRuntimeApp(
  app: ProtectedRuntimeApp | undefined
): ProtectedRuntimeApp {
  if (app === undefined) {
    throw new Error('Protected runtime app is not initialized');
  }

  return app;
}

export function requireAdminClient(client: Client | undefined): Client {
  if (client === undefined) {
    throw new Error('Protected runtime admin client is not initialized');
  }

  return client;
}

export function requireSigningKey(signingKey: SigningKey | undefined): SigningKey {
  if (signingKey === undefined) {
    throw new Error('Protected runtime signing key is not initialized');
  }

  return signingKey;
}

function captureEnv(keys: ReadonlyArray<string>): StoredEnv {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function restoreEnv(stored: StoredEnv): void {
  for (const [key, value] of Object.entries(stored)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
