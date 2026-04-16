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
import process from 'node:process';

import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';
import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from '../../src/application/ports/workspaceGraphDraft.js';
import {
  buildWorkspaceGraphDraft,
  buildWorkspaceGraphDraftSaveRequest,
} from '../fixtures/workspaceGraphDraftFixture.js';

const DATABASE_URL = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeIfPg = DATABASE_URL ? describe : describe.skip;

const SCHEMA = `dvt_api_it_${Date.now()}`;
const TENANT_ID = 'tenant-api-it';
const PROJECT_ID = 'project-api-it';
const ENVIRONMENT_ID = 'env-api-it';
const PRINCIPAL_ID = 'principal-api-it';
const ISSUER = 'https://issuer.integration.example/';
const AUDIENCE = 'dvt-api';
const TENANT_ACTIONS_FULL = [
  'run:start',
  'run:list',
  'run:view',
  'run:logs:view',
  'run:signal',
  'run:cancel',
  'run:retry',
  'workspace:graph-draft:view',
  'workspace:graph-draft:save',
] as const;
const TENANT_ACTIONS_WITH_ADMIN_REBUILD = [
  ...TENANT_ACTIONS_FULL,
  'admin:rebuild-snapshot',
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
      'DVT_ADMIN_ROUTES_ENABLED',
    ]);

    process.env.NODE_ENV = 'test';
    process.env.OBS_ENABLED = 'false';
    process.env.DATABASE_URL = DATABASE_URL!;
    process.env.DVT_PG_SCHEMA = SCHEMA;
    process.env.OIDC_JWKS_URI = jwksServer.jwksUri;
    process.env.OIDC_ISSUER = ISSUER;
    process.env.OIDC_AUDIENCE = AUDIENCE;
    process.env.OIDC_ALGORITHMS = 'RS256';
    process.env.DVT_ADMIN_ROUTES_ENABLED = 'true';

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
        selection: ['model.orders.persisted'],
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'model.orders.persisted', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
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
          planId: expect.any(String),
          planVersion: expect.any(String),
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
    expect(eventTypes(eventsResponse.json())).toEqual([
      'RunQueued',
      'RunCancelRequested',
      'RunCancelled',
    ]);
  });

  it('persists workspace graph drafts with read-your-writes, idempotent retry, and CAS conflict behavior', async () => {
    expect(app).toBeTruthy();

    const token = await signBearerToken(signingKey!, {
      sub: PRINCIPAL_ID,
      tenant_ids: [TENANT_ID],
      project_ids: [PROJECT_ID],
    });
    const saveRequest = buildWorkspaceGraphDraftSaveRequest({
      idempotencyKey: 'draft-save-it-1',
      draft: buildWorkspaceGraphDraft(),
    });

    const firstSave = await app!.inject({
      method: 'PUT',
      url: '/workspace/graph/draft',
      headers: { authorization: `Bearer ${token}` },
      payload: saveRequest,
    });
    expect(firstSave.statusCode).toBe(200);
    expect(firstSave.json()).toMatchObject({
      kind: 'saved',
      capability: {
        mode: 'writable',
        canRead: true,
        canWrite: true,
      },
      formatMeta: {
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        storedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        migrationState: 'native',
      },
      revision: expect.any(String),
    });
    const firstRevision = firstSave.json().revision as string;

    const retrySave = await app!.inject({
      method: 'PUT',
      url: '/workspace/graph/draft',
      headers: { authorization: `Bearer ${token}` },
      payload: saveRequest,
    });
    expect(retrySave.statusCode).toBe(200);
    expect(retrySave.json()).toMatchObject({
      kind: 'saved',
      revision: firstRevision,
    });

    const readResponse = await app!.inject({
      method: 'GET',
      url: `/workspace/graph/draft?tenantId=${TENANT_ID}&projectId=${PROJECT_ID}&environmentId=${ENVIRONMENT_ID}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(readResponse.statusCode).toBe(200);
    expect(readResponse.json()).toMatchObject({
      kind: 'ok',
      capability: {
        mode: 'writable',
        canRead: true,
        canWrite: true,
      },
      formatMeta: {
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        storedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        migrationState: 'native',
      },
      record: {
        scope: {
          tenantId: TENANT_ID,
          projectId: PROJECT_ID,
          environmentId: ENVIRONMENT_ID,
        },
        revision: firstRevision,
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        draft: saveRequest.draft,
      },
    });

    const staleSave = await app!.inject({
      method: 'PUT',
      url: '/workspace/graph/draft',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ...saveRequest,
        idempotencyKey: 'draft-save-it-2',
      },
    });
    expect(staleSave.statusCode).toBe(409);
    expect(staleSave.json()).toMatchObject({
      kind: 'conflict',
      currentRevision: firstRevision,
      capability: {
        mode: 'writable',
        canRead: true,
        canWrite: true,
      },
    });
  });

  it('returns read_only denial when caller can read drafts but lacks write grant', async () => {
    expect(app).toBeTruthy();
    expect(adminClient).toBeTruthy();

    await upsertPrincipalGrant(adminClient!, {
      schema: SCHEMA,
      principalId: PRINCIPAL_ID,
      principalType: 'user',
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      tenantActions: ['workspace:graph-draft:view'],
    });

    try {
      const token = await signBearerToken(signingKey!, {
        sub: PRINCIPAL_ID,
        tenant_ids: [TENANT_ID],
        project_ids: [PROJECT_ID],
      });

      const response = await app!.inject({
        method: 'PUT',
        url: '/workspace/graph/draft',
        headers: { authorization: `Bearer ${token}` },
        payload: buildWorkspaceGraphDraftSaveRequest({
          idempotencyKey: 'draft-save-read-only',
          expectedRevision: '11111111-1111-1111-1111-111111111111',
        }),
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        kind: 'denied',
        capability: {
          mode: 'read_only',
          canRead: true,
          canWrite: false,
          reason: 'write_denied',
        },
        auditRef: {
          action: 'draft_write',
          outcome: 'read_only',
        },
      });
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
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'model.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
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

  it('returns 400 invalid_plan_source when manifestRef is sent to the hard-cut runtime', async () => {
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
          uri: 's3://bucket/basic-manifest.json',
          sha256: '0'.repeat(64),
        },
        runId: 'api-integration-run-manifestref-bad-sha',
        targetAdapter: 'mock',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(httpError('bad_request', 'invalid_plan_source'));
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

  it('rejects /runs/:runId/cancel when a non-empty reason is provided on the native cancel path', async () => {
    expect(app).toBeTruthy();

    const token = await signBearerToken(signingKey!, {
      sub: PRINCIPAL_ID,
      tenant_ids: [TENANT_ID],
      project_ids: [PROJECT_ID],
    });

    const response = await app!.inject({
      method: 'POST',
      url: '/runs/native-cancel-reason/cancel',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tenantId: TENANT_ID,
        reason: 'operator cancel',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      httpError('bad_request', 'cancel_reason_not_supported', {
        target: 'reason',
      })
    );
  });

  it('ignores empty /runs/:runId/cancel reason noise on the native cancel path', async () => {
    expect(app).toBeTruthy();

    const token = await signBearerToken(signingKey!, {
      sub: PRINCIPAL_ID,
      tenant_ids: [TENANT_ID],
      project_ids: [PROJECT_ID],
    });
    const runId = 'api-integration-native-cancel-empty-reason';

    const startResponse = await app!.inject({
      method: 'POST',
      url: '/runs/start',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tenantId: TENANT_ID,
        projectId: PROJECT_ID,
        environmentId: ENVIRONMENT_ID,
        selection: ['model.orders.cancel.empty_reason'],
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [
            {
              nodeId: 'model.orders.cancel.empty_reason',
              stepKind: 'DBT_MODEL',
              dependsOn: [],
            },
          ],
        },
        runId,
        targetAdapter: 'mock',
      },
    });
    expect(startResponse.statusCode).toBe(202);

    const cancelResponse = await app!.inject({
      method: 'POST',
      url: `/runs/${runId}/cancel`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        tenantId: TENANT_ID,
        reason: '   ',
      },
    });

    expect(cancelResponse.statusCode).toBe(202);
    expect(cancelResponse.json()).toEqual({
      runId,
      signalType: 'CANCEL',
      accepted: true,
    });
  });

  it('rejects /runs/:runId/recover when principal lacks run:retry permission', async () => {
    expect(app).toBeTruthy();
    expect(adminClient).toBeTruthy();

    await upsertPrincipalGrant(adminClient!, {
      schema: SCHEMA,
      principalId: PRINCIPAL_ID,
      principalType: 'user',
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      tenantActions: [
        'run:start',
        'run:list',
        'run:view',
        'run:logs:view',
        'run:signal',
        'run:cancel',
      ],
    });

    try {
      const token = await signBearerToken(signingKey!, {
        sub: PRINCIPAL_ID,
        tenant_ids: [TENANT_ID],
        project_ids: [PROJECT_ID],
      });

      const response = await app!.inject({
        method: 'POST',
        url: '/runs/non-authorized-recover/recover',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          tenantId: TENANT_ID,
          recoveryRunId: 'recover-target-1',
          planRef: {
            uri: 'https://plans.example/recover-plan.json',
            sha256: 'a'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'recover-plan',
            planVersion: '1.0.0',
          },
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

  it('rebuilds snapshot through admin route with valid token and explicit admin action grant', async () => {
    expect(app).toBeTruthy();
    expect(adminClient).toBeTruthy();

    await upsertPrincipalGrant(adminClient!, {
      schema: SCHEMA,
      principalId: PRINCIPAL_ID,
      principalType: 'user',
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      tenantActions: TENANT_ACTIONS_WITH_ADMIN_REBUILD,
    });

    try {
      const token = await signBearerToken(signingKey!, {
        sub: PRINCIPAL_ID,
        tenant_ids: [TENANT_ID],
        project_ids: [PROJECT_ID],
      });
      const runId = 'api-integration-admin-rebuild-success-1';

      const startResponse = await app!.inject({
        method: 'POST',
        url: '/runs/start',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          tenantId: TENANT_ID,
          projectId: PROJECT_ID,
          environmentId: ENVIRONMENT_ID,
          selection: ['model.orders.admin'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'model.orders.admin', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
          runId,
          targetAdapter: 'mock',
        },
      });
      expect(startResponse.statusCode).toBe(202);

      const rebuildResponse = await app!.inject({
        method: 'POST',
        url: `/admin/runs/${runId}/rebuild-snapshot`,
        headers: { authorization: `Bearer ${token}` },
        payload: { tenantId: TENANT_ID },
      });

      expect(rebuildResponse.statusCode).toBe(200);
      expect(rebuildResponse.json()).toMatchObject({
        runId,
        status: 'PENDING',
      });
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

  it('returns forbidden on admin rebuild route when principal lacks explicit admin action grant', async () => {
    expect(app).toBeTruthy();
    expect(adminClient).toBeTruthy();

    await upsertPrincipalGrant(adminClient!, {
      schema: SCHEMA,
      principalId: PRINCIPAL_ID,
      principalType: 'user',
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      tenantActions: TENANT_ACTIONS_FULL,
    });

    const token = await signBearerToken(signingKey!, {
      sub: PRINCIPAL_ID,
      tenant_ids: [TENANT_ID],
      project_ids: [PROJECT_ID],
    });

    const response = await app!.inject({
      method: 'POST',
      url: '/admin/runs/api-integration-admin-forbidden/rebuild-snapshot',
      headers: { authorization: `Bearer ${token}` },
      payload: { tenantId: TENANT_ID },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual(httpError('forbidden', 'action_not_granted'));
  });

  it('returns not_found on admin rebuild route for unknown run with valid admin grant', async () => {
    expect(app).toBeTruthy();
    expect(adminClient).toBeTruthy();

    await upsertPrincipalGrant(adminClient!, {
      schema: SCHEMA,
      principalId: PRINCIPAL_ID,
      principalType: 'user',
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      tenantActions: TENANT_ACTIONS_WITH_ADMIN_REBUILD,
    });

    try {
      const token = await signBearerToken(signingKey!, {
        sub: PRINCIPAL_ID,
        tenant_ids: [TENANT_ID],
        project_ids: [PROJECT_ID],
      });

      const response = await app!.inject({
        method: 'POST',
        url: '/admin/runs/api-integration-admin-missing-run/rebuild-snapshot',
        headers: { authorization: `Bearer ${token}` },
        payload: { tenantId: TENANT_ID },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(
        httpError('not_found', 'run_not_found', {
          details: { runId: 'api-integration-admin-missing-run' },
        })
      );
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

