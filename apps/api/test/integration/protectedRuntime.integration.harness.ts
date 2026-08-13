/**
 * @file apps/api/test/integration/protectedRuntime.integration.harness.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0015: getRunStatus read-model separation
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Keep the protected-runtime integration harness as a thin composition seam over bootstrap, auth, and persistence helpers
 * @date 2026-04-18
 */
import { randomUUID } from 'node:crypto';

import { PostgresStateStoreAdapter, type EventType } from '@dvt/adapter-postgres';
import { asIsoUtcString, type RunId } from '@dvt/contracts';
import { afterAll, beforeAll, beforeEach } from 'vitest';

import { signBearerToken } from './protectedRuntime.integration.auth.js';
import {
  bootstrapProtectedRuntimeState,
  type ProtectedRuntimeApp,
  type ProtectedRuntimeBootstrapState,
  requireAdminClient,
  requireProtectedRuntimeApp,
  requireSigningKey,
  teardownProtectedRuntimeState,
} from './protectedRuntime.integration.bootstrap.js';
import {
  queryLatestStoredPlan,
  resetWorkspaceGraphDrafts,
  upsertPrincipalGrant,
} from './protectedRuntime.integration.persistence.js';
import {
  DATABASE_URL,
  ENVIRONMENT_ID,
  PRINCIPAL_ID,
  PROJECT_ID,
  TENANT_ACTIONS_FULL,
  TENANT_ID,
} from './protectedRuntime.integration.shared.js';

export type ProtectedRuntimeHarness = {
  readonly schema: string;
  requireApp(): ProtectedRuntimeApp;
  issuePrincipalToken(
    claims?: Partial<{
      sub: string;
      tenant_ids: ReadonlyArray<string>;
      project_ids: ReadonlyArray<string>;
    }>
  ): Promise<string>;
  setPrincipalGrant(tenantActions: ReadonlyArray<string>): Promise<void>;
  withPrincipalGrant(tenantActions: ReadonlyArray<string>, run: () => Promise<void>): Promise<void>;
  queryLatestStoredPlan(): ReturnType<typeof queryLatestStoredPlan>;
  recordRunStarted(runId: string): Promise<void>;
  recordSignalRealized(runId: string, eventType: 'RunPaused' | 'RunResumed'): Promise<void>;
  recordTerminalCancellation(runId: string): Promise<void>;
};

export function createProtectedRuntimeHarness(): ProtectedRuntimeHarness {
  const schema = `dvt_api_it_${randomUUID().replaceAll('-', '')}`;
  const state: ProtectedRuntimeBootstrapState = { originalEnv: {} };
  registerProtectedRuntimeLifecycle(state, schema);
  const issuePrincipalToken = createPrincipalTokenIssuer(state);
  const setPrincipalGrant = createPrincipalGrantSetter(state, schema);
  const withPrincipalGrant = createPrincipalGrantScope(setPrincipalGrant);

  return {
    schema,
    requireApp: () => requireProtectedRuntimeApp(state.app),
    issuePrincipalToken,
    setPrincipalGrant,
    withPrincipalGrant,
    queryLatestStoredPlan: () =>
      queryLatestStoredPlan(requireAdminClient(state.adminClient), schema),
    recordRunStarted: (runId) => appendWorkerEvents(schema, runId, ['RunStarted']),
    recordSignalRealized: (runId, eventType) => appendWorkerEvents(schema, runId, [eventType]),
    recordTerminalCancellation: (runId) =>
      appendWorkerEvents(schema, runId, ['RunCancelRequested', 'RunCancelled']),
  };
}

async function appendWorkerEvents(
  schema: string,
  runId: string,
  eventTypes: readonly EventType[]
): Promise<void> {
  if (!DATABASE_URL) throw new Error('DATABASE_URL/DVT_PG_URL is required');
  const stateStore = new PostgresStateStoreAdapter({
    connectionString: DATABASE_URL,
    schema,
    assumeSchemaReady: true,
  });
  try {
    const metadata = await stateStore.getRunMetadataByRunId(TENANT_ID, runId);
    if (metadata === null) throw new Error(`Run ${runId} is missing from the real state store`);
    await stateStore.appendAndEnqueueTx(
      runId as RunId,
      eventTypes.map((eventType) => ({
        eventId: `${runId}:integration:${eventType}`,
        eventType,
        runId,
        emittedAt: asIsoUtcString(new Date().toISOString()),
        tenantId: metadata.tenantId,
        projectId: metadata.projectId,
        environmentId: metadata.environmentId,
        planId: metadata.planId,
        planVersion: metadata.planVersion,
        engineAttemptId: 1,
        logicalAttemptId: metadata.logicalAttemptId,
        idempotencyKey: `${runId}:integration:${eventType}`,
        payloadVersion: 1,
      }))
    );
  } finally {
    await stateStore.close();
  }
}

function registerProtectedRuntimeLifecycle(
  state: ProtectedRuntimeBootstrapState,
  schema: string
): void {
  beforeAll(async () => {
    await bootstrapProtectedRuntimeState(state, schema);
  });

  beforeEach(async () => {
    await resetWorkspaceGraphDrafts(requireAdminClient(state.adminClient), schema);
  });

  afterAll(async () => {
    await teardownProtectedRuntimeState(state, schema);
  });
}

function createPrincipalTokenIssuer(
  state: ProtectedRuntimeBootstrapState
): ProtectedRuntimeHarness['issuePrincipalToken'] {
  return async (claims) =>
    signBearerToken(requireSigningKey(state.signingKey), {
      sub: claims?.sub ?? PRINCIPAL_ID,
      tenant_ids: claims?.tenant_ids ?? [TENANT_ID],
      project_ids: claims?.project_ids ?? [PROJECT_ID],
    });
}

function createPrincipalGrantSetter(
  state: ProtectedRuntimeBootstrapState,
  schema: string
): ProtectedRuntimeHarness['setPrincipalGrant'] {
  return async (tenantActions) => {
    await upsertPrincipalGrant(requireAdminClient(state.adminClient), {
      schema,
      principalId: PRINCIPAL_ID,
      principalType: 'user',
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      tenantActions,
    });
  };
}

function createPrincipalGrantScope(
  setPrincipalGrant: ProtectedRuntimeHarness['setPrincipalGrant']
): ProtectedRuntimeHarness['withPrincipalGrant'] {
  return async (tenantActions, run) => {
    await setPrincipalGrant(tenantActions);

    try {
      await run();
    } finally {
      await setPrincipalGrant(TENANT_ACTIONS_FULL);
    }
  };
}
