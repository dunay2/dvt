/**
 * @file apps/api/test/integration/protectedRuntime.integration.runtime.scenarios.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy
 * @decision Keep protected runtime route and admin route integration flows separate from workspace-draft scenarios
 * @date 2026-04-18
 */
import type { ProtectedRuntimeHarness } from './protectedRuntime.integration.harness.js';
import {
  ENVIRONMENT_ID,
  PROJECT_ID,
  TENANT_ACTIONS_WITH_ADMIN_REBUILD,
  TENANT_ID,
} from './protectedRuntime.integration.shared.js';

export async function exerciseCommandQueryFlow(
  runtime: ProtectedRuntimeHarness,
  input: {
    runId: string;
    selection: readonly string[];
    graphNodeId: string;
  }
): Promise<{
  readonly startResponse: { statusCode: number; json(): unknown };
  readonly listResponse: { statusCode: number; json(): unknown };
  readonly getRunResponse: { statusCode: number; json(): unknown };
  readonly signalResponse: { statusCode: number; json(): unknown };
  readonly eventsResponse: { statusCode: number; json(): unknown };
}> {
  const token = await runtime.issuePrincipalToken();
  const runtimeApp = runtime.requireApp();

  const startResponse = await startMockRun(runtimeApp, token, {
    runId: input.runId,
    selection: input.selection,
    graphNodeId: input.graphNodeId,
  });
  const listResponse = await runtimeApp.inject({
    method: 'GET',
    url: `/runs?tenantId=${TENANT_ID}&projectId=${PROJECT_ID}&environmentId=${ENVIRONMENT_ID}&limit=10`,
    headers: { authorization: `Bearer ${token}` },
  });
  const getRunResponse = await runtimeApp.inject({
    method: 'GET',
    url: `/runs/${input.runId}?tenantId=${TENANT_ID}`,
    headers: { authorization: `Bearer ${token}` },
  });
  const signalResponse = await runtimeApp.inject({
    method: 'POST',
    url: `/runs/${input.runId}/cancel`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tenantId: TENANT_ID,
    },
  });
  const eventsResponse = await runtimeApp.inject({
    method: 'GET',
    url: `/runs/${input.runId}/events?tenantId=${TENANT_ID}&limit=10`,
    headers: { authorization: `Bearer ${token}` },
  });

  return {
    startResponse,
    listResponse,
    getRunResponse,
    signalResponse,
    eventsResponse,
  };
}

export async function exercisePlannerBackedRunFlow(
  runtime: ProtectedRuntimeHarness,
  input: {
    runId: string;
    graphNodeId: string;
  }
): Promise<{
  readonly startResponse: { statusCode: number; json(): unknown };
  readonly storedPlan:
    | {
        plan_id: string;
        plan_uri: string;
        validation_state: string;
      }
    | undefined;
  readonly listResponse: { statusCode: number; json(): unknown };
}> {
  const token = await runtime.issuePrincipalToken();
  const runtimeApp = runtime.requireApp();

  const startResponse = await startMockRun(runtimeApp, token, {
    runId: input.runId,
    selection: [input.graphNodeId],
    graphNodeId: input.graphNodeId,
  });
  const storedPlan = await runtime.queryLatestStoredPlan();
  const listResponse = await runtimeApp.inject({
    method: 'GET',
    url: `/runs?tenantId=${TENANT_ID}&projectId=${PROJECT_ID}&environmentId=${ENVIRONMENT_ID}&limit=10`,
    headers: { authorization: `Bearer ${token}` },
  });

  return {
    startResponse,
    storedPlan,
    listResponse,
  };
}

export async function expectForbiddenActionDenied(
  runtime: ProtectedRuntimeHarness,
  args: {
    tenantActions: ReadonlyArray<string>;
    request: {
      method: 'POST';
      url: string;
      payload: Record<string, unknown>;
    };
  }
): Promise<{ statusCode: number; json(): unknown }> {
  let response: { statusCode: number; json(): unknown } | null = null;

  await runtime.withPrincipalGrant(args.tenantActions, async () => {
    const token = await runtime.issuePrincipalToken();
    response = await runtime.requireApp().inject({
      method: args.request.method,
      url: args.request.url,
      headers: { authorization: `Bearer ${token}` },
      payload: args.request.payload,
    });
  });

  if (response === null) {
    throw new Error('Forbidden action scenario did not produce a response');
  }

  return response;
}

export async function expectTokenAssertionConflict(
  runtime: ProtectedRuntimeHarness,
  input?: { tenantId?: string; projectId?: string; environmentId?: string }
): Promise<{ statusCode: number; json(): unknown }> {
  const runtimeApp = runtime.requireApp();
  const conflictingToken = await runtime.issuePrincipalToken({
    tenant_ids: ['tenant-other'],
    project_ids: [input?.projectId ?? PROJECT_ID],
  });

  return runtimeApp.inject({
    method: 'GET',
    url: `/runs?tenantId=${input?.tenantId ?? TENANT_ID}&projectId=${input?.projectId ?? PROJECT_ID}&environmentId=${input?.environmentId ?? ENVIRONMENT_ID}&limit=10`,
    headers: { authorization: `Bearer ${conflictingToken}` },
  });
}

export async function expectInvalidPlanSourceRejected(
  runtime: ProtectedRuntimeHarness,
  input?: { runId?: string }
): Promise<{ statusCode: number; json(): unknown }> {
  const runtimeApp = runtime.requireApp();
  const token = await runtime.issuePrincipalToken();

  return runtimeApp.inject({
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
      runId: input?.runId ?? 'api-integration-run-manifestref-bad-sha',
      targetAdapter: 'mock',
    },
  });
}

export async function expectNativeCancelReasonRejected(
  runtime: ProtectedRuntimeHarness,
  input?: { runId?: string; reason?: string }
): Promise<{ statusCode: number; json(): unknown }> {
  const runtimeApp = runtime.requireApp();
  const token = await runtime.issuePrincipalToken();

  return runtimeApp.inject({
    method: 'POST',
    url: `/runs/${input?.runId ?? 'native-cancel-reason'}/cancel`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tenantId: TENANT_ID,
      reason: input?.reason ?? 'operator cancel',
    },
  });
}

export async function exerciseEmptyCancelReasonFlow(
  runtime: ProtectedRuntimeHarness,
  input?: { runId?: string; graphNodeId?: string }
): Promise<{
  readonly startResponse: { statusCode: number; json(): unknown };
  readonly cancelResponse: { statusCode: number; json(): unknown };
}> {
  const token = await runtime.issuePrincipalToken();
  const runtimeApp = runtime.requireApp();
  const runId = input?.runId ?? 'api-integration-native-cancel-empty-reason';

  const startResponse = await startMockRun(runtimeApp, token, {
    runId,
    selection: [input?.graphNodeId ?? 'model.orders.cancel.empty_reason'],
    graphNodeId: input?.graphNodeId ?? 'model.orders.cancel.empty_reason',
  });
  const cancelResponse = await runtimeApp.inject({
    method: 'POST',
    url: `/runs/${runId}/cancel`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tenantId: TENANT_ID,
      reason: '   ',
    },
  });

  return {
    startResponse,
    cancelResponse,
  };
}

export async function expectAdminRebuildSuccess(
  runtime: ProtectedRuntimeHarness,
  input: { runId: string; graphNodeId: string }
): Promise<{
  readonly startResponse: { statusCode: number; json(): unknown };
  readonly rebuildResponse: { statusCode: number; json(): unknown };
}> {
  let result:
    | {
        readonly startResponse: { statusCode: number; json(): unknown };
        readonly rebuildResponse: { statusCode: number; json(): unknown };
      }
    | undefined;

  await runtime.withPrincipalGrant(TENANT_ACTIONS_WITH_ADMIN_REBUILD, async () => {
    const token = await runtime.issuePrincipalToken();
    const runtimeApp = runtime.requireApp();

    const startResponse = await startMockRun(runtimeApp, token, {
      runId: input.runId,
      selection: [input.graphNodeId],
      graphNodeId: input.graphNodeId,
    });
    const rebuildResponse = await runtimeApp.inject({
      method: 'POST',
      url: `/admin/runs/${input.runId}/rebuild-snapshot`,
      headers: { authorization: `Bearer ${token}` },
      payload: { tenantId: TENANT_ID },
    });

    result = { startResponse, rebuildResponse };
  });

  if (result === undefined) {
    throw new Error('Admin rebuild success scenario did not produce responses');
  }

  return result;
}

export async function expectAdminRebuildNotFound(
  runtime: ProtectedRuntimeHarness,
  input?: { runId?: string }
): Promise<{ statusCode: number; json(): unknown }> {
  let response: { statusCode: number; json(): unknown } | null = null;

  await runtime.withPrincipalGrant(TENANT_ACTIONS_WITH_ADMIN_REBUILD, async () => {
    const token = await runtime.issuePrincipalToken();
    response = await runtime.requireApp().inject({
      method: 'POST',
      url: `/admin/runs/${input?.runId ?? 'api-integration-admin-missing-run'}/rebuild-snapshot`,
      headers: { authorization: `Bearer ${token}` },
      payload: { tenantId: TENANT_ID },
    });
  });

  if (response === null) {
    throw new Error('Admin rebuild not_found scenario did not produce a response');
  }

  return response;
}

async function startMockRun(
  runtimeApp: ProtectedRuntimeHarness['requireApp'] extends () => infer T ? T : never,
  token: string,
  input: {
    runId: string;
    selection: readonly string[];
    graphNodeId: string;
  }
): Promise<{ statusCode: number; json(): unknown }> {
  return runtimeApp.inject({
    method: 'POST',
    url: '/runs/start',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      selection: [...input.selection],
      graphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: 'manifest-v10',
        nodes: [{ nodeId: input.graphNodeId, stepKind: 'DBT_MODEL', dependsOn: [] }],
      },
      runId: input.runId,
      targetAdapter: 'mock',
    },
  });
}
