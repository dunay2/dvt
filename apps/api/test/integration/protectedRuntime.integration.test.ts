/**
 * @file apps/api/test/integration/protectedRuntime.integration.test.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0015: getRunStatus read-model separation
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Verify the protected API runtime against real JWKS-backed OIDC verification and a live PostgreSQL schema
 * @consequence Regressions in route wiring, auth verification, or schema bootstrap surface in one executable lane
 * @date 2026-03-20
 *
 * Requires a live PostgreSQL instance. Skips cleanly when DVT_PG_URL or
 * DATABASE_URL is absent.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';

const DATABASE_URL = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeIfPg = DATABASE_URL ? describe : describe.skip;

const SCHEMA = `dvt_api_it_${Date.now()}`;
const TENANT_ID = 'tenant-api-it';
const PROJECT_ID = 'project-api-it';
const ENVIRONMENT_ID = 'env-api-it';
const PRINCIPAL_ID = 'principal-api-it';
const ISSUER = 'https://issuer.integration.example/';
const AUDIENCE = 'dvt-api';
const PLANNER_MANIFEST_FIXTURE_URL = new URL('../fixtures/planner/basic-manifest.json', import.meta.url);
const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/integration-plan.json',
  sha256: 'integration-sha-256',
  schemaVersion: 'v1.2',
  planId: 'integration-plan',
  planVersion: '1.0',
};
const TENANT_ACTIONS_FULL = [
  'run:start',
  'run:list',
  'run:view',
  'run:logs:view',
  'run:signal',
  'run:cancel',
] as const;

type JwksServerHandle = {
  readonly server: Server;
  readonly jwksUri: string;
  readonly privateKey: SigningKey;
};

type StoredEnv = Record<string, string | undefined>;
type SigningKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

function httpError(
  type: string,
  reason: string,
  extra?: { target?: string; details?: Record<string, unknown> }
): { error: { type: string; reason: string; target?: string; details?: Record<string, unknown> } } {
  return {
    error: {
      type,
      reason,
      ...(extra?.target === undefined ? {} : { target: extra.target }),
      ...(extra?.details === undefined ? {} : { details: extra.details }),
    },
  };
}

describeIfPg('protected runtime integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>['app'] | undefined;
  let adminClient: Client | undefined;
  let jwksServer: JwksServerHandle | undefined;
  let signingKey: SigningKey | undefined;
  let originalEnv: StoredEnv = {};

  beforeAll(async () => {
    expect(DATABASE_URL).toBeTruthy();

    jwksServer = await startJwksServer();
    originalEnv = captureEnv([
      'NODE_ENV',
      'OBS_ENABLED',
      'DATABASE_URL',
      'DVT_PG_SCHEMA',
      'OIDC_JWKS_URI',
      'OIDC_ISSUER',
      'OIDC_AUDIENCE',
      'OIDC_ALGORITHMS',
    ]);

    process.env.NODE_ENV = 'test';
    process.env.OBS_ENABLED = 'false';
    process.env.DATABASE_URL = DATABASE_URL!;
    process.env.DVT_PG_SCHEMA = SCHEMA;
    process.env.OIDC_JWKS_URI = jwksServer.jwksUri;
    process.env.OIDC_ISSUER = ISSUER;
    process.env.OIDC_AUDIENCE = AUDIENCE;
    process.env.OIDC_ALGORITHMS = 'RS256';

    const built = await buildApp();
    app = built.app;
    await app.ready();

    adminClient = new Client({ connectionString: DATABASE_URL! });
    await adminClient.connect();
    await upsertPrincipalGrant(adminClient, {
      schema: SCHEMA,
      principalId: PRINCIPAL_ID,
      principalType: 'user',
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      tenantActions: TENANT_ACTIONS_FULL,
    });

    signingKey = jwksServer.privateKey;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (adminClient) {
      try {
        await adminClient.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(SCHEMA)} CASCADE`);
      } finally {
        await adminClient.end();
      }
    }

    if (jwksServer) {
      await closeServer(jwksServer.server);
    }

    restoreEnv(originalEnv);
  });

  it('boots the protected routes and executes command plus query flow against real auth and PostgreSQL', async () => {
    expect(app).toBeTruthy();

    const token = await signBearerToken(signingKey!, {
      sub: PRINCIPAL_ID,
      tenant_ids: [TENANT_ID],
      project_ids: [PROJECT_ID],
    });
    const runId = 'api-integration-run-1';

    const startResponse = await app!.inject({
      method: 'POST',
      url: '/runs/start',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        environmentId: ENVIRONMENT_ID,
        selection: ['model.orders'],
        planRef: VALID_PLAN_REF,
        runId,
        targetAdapter: 'mock',
      },
    });
    expect(startResponse.statusCode).toBe(202);
    expect(startResponse.json()).toEqual({ runId, accepted: true });

    const listResponse = await app!.inject({
      method: 'GET',
      url: `/runs?tenantId=${TENANT_ID}&projectId=${PROJECT_ID}&environmentId=${ENVIRONMENT_ID}&limit=10`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      items: [
        {
          tenantId: TENANT_ID,
          projectId: PROJECT_ID,
          environmentId: ENVIRONMENT_ID,
          runId,
          planId: VALID_PLAN_REF.planId,
          planVersion: VALID_PLAN_REF.planVersion,
          provider: 'mock',
          status: 'PENDING',
        },
      ],
      nextCursor: null,
    });

    const getRunResponse = await app!.inject({
      method: 'GET',
      url: `/runs/${runId}?tenantId=${TENANT_ID}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getRunResponse.statusCode).toBe(200);
    expect(getRunResponse.json()).toMatchObject({
      runId,
      tenantId: TENANT_ID,
      status: 'PENDING',
      enriched: false,
    });

    const signalResponse = await app!.inject({
      method: 'POST',
      url: `/runs/${runId}/cancel`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tenantId: TENANT_ID,
        reason: 'integration-test',
      },
    });
    expect(signalResponse.statusCode).toBe(202);
    expect(signalResponse.json()).toEqual({
      runId,
      signalType: 'CANCEL',
      accepted: true,
    });

    const eventsResponse = await app!.inject({
      method: 'GET',
      url: `/runs/${runId}/events?tenantId=${TENANT_ID}&limit=10`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(eventsResponse.statusCode).toBe(200);
    expect(eventTypes(eventsResponse.json())).toEqual(['RunQueued', 'RunCancelRequested']);
  });

  it('persists and validates a planner-backed run before execution starts', async () => {
    expect(app).toBeTruthy();
    expect(adminClient).toBeTruthy();

    const token = await signBearerToken(signingKey!, {
      sub: PRINCIPAL_ID,
      tenant_ids: [TENANT_ID],
      project_ids: [PROJECT_ID],
    });
    const runId = 'api-integration-run-graph-1';

    const startResponse = await app!.inject({
      method: 'POST',
      url: '/runs/start',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        environmentId: ENVIRONMENT_ID,
        selection: ['model.orders'],
        graphSource: {
          kind: 'normalized-graph-v1',
          nodes: [{ nodeId: 'model.orders', resourceType: 'model', dependsOn: [] }],
        },
        runId,
        targetAdapter: 'mock',
      },
    });
    expect(startResponse.statusCode).toBe(202);
    expect(startResponse.json()).toEqual({ runId, accepted: true });

    const storedPlan = await adminClient!.query<{
      plan_id: string;
      plan_uri: string;
      validation_state: string;
    }>(
      `SELECT plan_id, plan_uri, validation_state
         FROM ${quoteIdentifier(SCHEMA)}.stored_plans
         ORDER BY stored_at DESC
         LIMIT 1`
    );
    expect(storedPlan.rows[0]).toMatchObject({
      validation_state: 'VALID',
    });
    expect(storedPlan.rows[0]?.plan_uri).toMatch(/^dvt-plan:\/\/postgres\//);

    const listResponse = await app!.inject({
      method: 'GET',
      url: `/runs?tenantId=${TENANT_ID}&projectId=${PROJECT_ID}&environmentId=${ENVIRONMENT_ID}&limit=10`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          runId,
          planId: storedPlan.rows[0]?.plan_id,
          provider: 'mock',
          status: 'PENDING',
        }),
      ]),
    });
  });

  it('accepts planner-backed startRun requests using manifestRef', async () => {
    expect(app).toBeTruthy();
    expect(adminClient).toBeTruthy();

    const token = await signBearerToken(signingKey!, {
      sub: PRINCIPAL_ID,
      tenant_ids: [TENANT_ID],
      project_ids: [PROJECT_ID],
    });
    const manifestRef = makeManifestRef(PLANNER_MANIFEST_FIXTURE_URL);
    const runId = 'api-integration-run-manifestref-1';

    const startResponse = await app!.inject({
      method: 'POST',
      url: '/runs/start',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        environmentId: ENVIRONMENT_ID,
        selection: ['model.analytics.order_items'],
        manifestRef,
        runId,
        targetAdapter: 'mock',
      },
    });
    expect(startResponse.statusCode).toBe(202);
    expect(startResponse.json()).toEqual({ runId, accepted: true });

    const storedPlan = await adminClient!.query<{
      plan_id: string;
      plan_uri: string;
      validation_state: string;
    }>(
      `SELECT plan_id, plan_uri, validation_state
         FROM ${quoteIdentifier(SCHEMA)}.stored_plans
         ORDER BY stored_at DESC
         LIMIT 1`
    );
    expect(storedPlan.rows[0]).toMatchObject({
      validation_state: 'VALID',
    });
    expect(storedPlan.rows[0]?.plan_uri).toMatch(/^dvt-plan:\/\/postgres\//);
  });

  it('returns 422 plan_rejected when manifestRef sha256 does not match content', async () => {
    expect(app).toBeTruthy();

    const token = await signBearerToken(signingKey!, {
      sub: PRINCIPAL_ID,
      tenant_ids: [TENANT_ID],
      project_ids: [PROJECT_ID],
    });

    const response = await app!.inject({
      method: 'POST',
      url: '/runs/start',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        environmentId: ENVIRONMENT_ID,
        selection: ['model.analytics.order_items'],
        manifestRef: {
          uri: PLANNER_MANIFEST_FIXTURE_URL.href,
          sha256: '0'.repeat(64),
        },
        runId: 'api-integration-run-manifestref-bad-sha',
        targetAdapter: 'mock',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual(
      httpError('unprocessable', 'plan_rejected', {
        details: {
          message: 'Manifest artifact integrity mismatch.',
          cause: 'manifest_ref_integrity_mismatch',
        },
      })
    );
  });

  it('rejects a token whose asserted tenant conflicts with the requested tenant scope', async () => {
    expect(app).toBeTruthy();

    const conflictingToken = await signBearerToken(signingKey!, {
      sub: PRINCIPAL_ID,
      tenant_ids: ['tenant-other'],
      project_ids: [PROJECT_ID],
    });

    const response = await app!.inject({
      method: 'GET',
      url: `/runs?tenantId=${TENANT_ID}&projectId=${PROJECT_ID}&environmentId=${ENVIRONMENT_ID}&limit=10`,
      headers: { authorization: `Bearer ${conflictingToken}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual(httpError('forbidden', 'token_assertion_conflict'));
  });

  it('rejects /runs/:runId/cancel when principal lacks run:cancel permission', async () => {
    expect(app).toBeTruthy();
    expect(adminClient).toBeTruthy();

    await upsertPrincipalGrant(adminClient!, {
      schema: SCHEMA,
      principalId: PRINCIPAL_ID,
      principalType: 'user',
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      tenantActions: ['run:start', 'run:list', 'run:view', 'run:logs:view', 'run:signal'],
    });

    try {
      const token = await signBearerToken(signingKey!, {
        sub: PRINCIPAL_ID,
        tenant_ids: [TENANT_ID],
        project_ids: [PROJECT_ID],
      });

      const response = await app!.inject({
        method: 'POST',
        url: '/runs/non-authorized-cancel/cancel',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          tenantId: TENANT_ID,
          reason: 'permission-check',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual(httpError('forbidden', 'action_not_granted'));
    } finally {
      await upsertPrincipalGrant(adminClient!, {
        schema: SCHEMA,
        principalId: PRINCIPAL_ID,
        principalType: 'user',
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        environmentId: ENVIRONMENT_ID,
        tenantActions: TENANT_ACTIONS_FULL,
      });
    }
  });

  it('rejects /runs/:runId/signal for PAUSE when principal lacks run:signal permission', async () => {
    expect(app).toBeTruthy();
    expect(adminClient).toBeTruthy();

    await upsertPrincipalGrant(adminClient!, {
      schema: SCHEMA,
      principalId: PRINCIPAL_ID,
      principalType: 'user',
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      tenantActions: ['run:start', 'run:list', 'run:view', 'run:logs:view', 'run:cancel'],
    });

    try {
      const token = await signBearerToken(signingKey!, {
        sub: PRINCIPAL_ID,
        tenant_ids: [TENANT_ID],
        project_ids: [PROJECT_ID],
      });

      const response = await app!.inject({
        method: 'POST',
        url: '/runs/non-authorized-signal/signal',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          tenantId: TENANT_ID,
          signalType: 'PAUSE',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual(httpError('forbidden', 'action_not_granted'));
    } finally {
      await upsertPrincipalGrant(adminClient!, {
        schema: SCHEMA,
        principalId: PRINCIPAL_ID,
        principalType: 'user',
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        environmentId: ENVIRONMENT_ID,
        tenantActions: TENANT_ACTIONS_FULL,
      });
    }
  });

  it('rejects /runs/:runId/signal for CANCEL when principal lacks run:cancel permission', async () => {
    expect(app).toBeTruthy();
    expect(adminClient).toBeTruthy();

    await upsertPrincipalGrant(adminClient!, {
      schema: SCHEMA,
      principalId: PRINCIPAL_ID,
      principalType: 'user',
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      tenantActions: ['run:start', 'run:list', 'run:view', 'run:logs:view', 'run:signal'],
    });

    try {
      const token = await signBearerToken(signingKey!, {
        sub: PRINCIPAL_ID,
        tenant_ids: [TENANT_ID],
        project_ids: [PROJECT_ID],
      });

      const response = await app!.inject({
        method: 'POST',
        url: '/runs/non-authorized-cancel-signal/signal',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          tenantId: TENANT_ID,
          signalType: 'CANCEL',
          reason: 'permission-check',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual(httpError('forbidden', 'action_not_granted'));
    } finally {
      await upsertPrincipalGrant(adminClient!, {
        schema: SCHEMA,
        principalId: PRINCIPAL_ID,
        principalType: 'user',
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        environmentId: ENVIRONMENT_ID,
        tenantActions: TENANT_ACTIONS_FULL,
      });
    }
  });
});

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

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function eventTypes(payload: unknown): string[] {
  if (payload === null || typeof payload !== 'object') {
    return [];
  }

  const items = (payload as { items?: unknown }).items;
  if (Array.isArray(items) === false) {
    return [];
  }

  return (items ?? [])
    .map((item) => item.eventType)
    .filter((value): value is string => typeof value === 'string');
}

async function upsertPrincipalGrant(
  client: Client,
  input: {
    schema: string;
    principalId: string;
    principalType: 'user' | 'service';
    tenantId: string;
    projectId: string;
    environmentId: string;
    tenantActions: ReadonlyArray<string>;
  }
): Promise<void> {
  const tenantAccess = JSON.stringify([
    {
      tenantId: input.tenantId,
      allowedActions: [...input.tenantActions],
      projectAccess: [
        {
          projectId: input.projectId,
          allowedActions: [],
          environmentAccess: [
            {
              environmentId: input.environmentId,
              allowedActions: [],
            },
          ],
        },
      ],
    },
  ]);

  await client.query(
    `INSERT INTO ${quoteIdentifier(input.schema)}.principal_grants
       (principal_id, principal_type, suspended, tenant_access)
     VALUES ($1, $2, FALSE, $3::jsonb)
     ON CONFLICT (principal_id, principal_type)
     DO UPDATE SET tenant_access = EXCLUDED.tenant_access,
                   suspended = FALSE,
                   updated_at = NOW()`,
    [input.principalId, input.principalType, tenantAccess]
  );
}

async function startJwksServer(): Promise<JwksServerHandle> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportPublicJwk(publicKey);
  const payload = JSON.stringify({ keys: [jwk] });

  const server = createServer((_request: IncomingMessage, response: ServerResponse) => {
    response.statusCode = 200;
    response.setHeader('content-type', 'application/json');
    response.end(payload);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Unable to resolve JWKS server address');
  }

  return {
    server,
    jwksUri: `http://127.0.0.1:${address.port}/.well-known/jwks.json`,
    privateKey,
  };
}

async function exportPublicJwk(
  publicKey: Awaited<ReturnType<typeof generateKeyPair>>['publicKey']
): Promise<JWK> {
  const jwk = await exportJWK(publicKey);
  return {
    ...jwk,
    use: 'sig',
    alg: 'RS256',
    kid: 'api-integration-key',
  };
}

async function signBearerToken(
  privateKey: SigningKey,
  claims: {
    sub: string;
    tenant_ids: ReadonlyArray<string>;
    project_ids: ReadonlyArray<string>;
  }
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);

  return new SignJWT({
    scope: 'dvt:runtime',
    tenant_ids: [...claims.tenant_ids],
    project_ids: [...claims.project_ids],
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'api-integration-key' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + 60 * 5)
    .sign(privateKey);
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function makeManifestRef(url: URL): { uri: string; sha256: string } {
  const bytes = readFileSync(url);
  return {
    uri: url.href,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}
