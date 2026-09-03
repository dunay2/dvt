/**
 * @file apps/api/test/integration/protectedRuntime.integration.runtime.scenarios.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy
 * @decision Keep protected runtime route and admin route integration flows separate from workspace-draft scenarios while matching the canonical hard-cut start-run boundary
 * @date 2026-04-18
 */
import {
  buildWorkspaceGraphDraft,
  buildWorkspaceGraphDraftSaveRequest,
} from '../fixtures/workspaceGraphDraftFixture.js';

import type { ProtectedRuntimeHarness } from './protectedRuntime.integration.harness.js';
import { readAcceptedRunId } from './protectedRuntime.integration.http.js';
import {
  ENVIRONMENT_ID,
  PROJECT_ID,
  TENANT_ACTIONS_WITH_ADMIN_REBUILD,
  TENANT_ID,
} from './protectedRuntime.integration.shared.js';

export async function exerciseCommandQueryFlow(
  runtime: ProtectedRuntimeHarness,
  input: {
    selection: readonly string[];
    graphNodeId: string;
  }
): Promise<{
  readonly startResponse: { statusCode: number; json(): unknown };
  readonly actualRunId: string;
  readonly listResponse: { statusCode: number; json(): unknown };
  readonly getRunResponse: { statusCode: number; json(): unknown };
  readonly pauseResponse: { statusCode: number; json(): unknown };
  readonly resumeResponse: { statusCode: number; json(): unknown };
  readonly cancelResponse: { statusCode: number; json(): unknown };
  readonly eventsResponse: { statusCode: number; json(): unknown };
  readonly recoverResponse: { statusCode: number; json(): unknown };
  readonly repeatedRecoverResponse: { statusCode: number; json(): unknown };
}> {
  const token = await runtime.issuePrincipalToken();
  const runtimeApp = runtime.requireApp();

  const startResponse = await startTemporalRun(runtimeApp, token, {
    selection: input.selection,
    graphNodeId: input.graphNodeId,
  });
  const actualRunId = readAcceptedRunId(startResponse.json());
  await runtime.recordRunStarted(actualRunId);
  const listResponse = await runtimeApp.inject({
    method: 'GET',
    url: `/runs?tenantId=${TENANT_ID}&projectId=${PROJECT_ID}&environmentId=${ENVIRONMENT_ID}&limit=10`,
    headers: { authorization: `Bearer ${token}` },
  });
  const getRunResponse = await runtimeApp.inject({
    method: 'GET',
    url: `/runs/${actualRunId}?tenantId=${TENANT_ID}`,
    headers: { authorization: `Bearer ${token}` },
  });
  const pauseResponse = await runtimeApp.inject({
    method: 'POST',
    url: `/runs/${actualRunId}/signal`,
    headers: { authorization: `Bearer ${token}` },
    payload: { tenantId: TENANT_ID, signalType: 'PAUSE' },
  });
  await runtime.recordSignalRealized(actualRunId, 'RunPaused');
  const resumeResponse = await runtimeApp.inject({
    method: 'POST',
    url: `/runs/${actualRunId}/signal`,
    headers: { authorization: `Bearer ${token}` },
    payload: { tenantId: TENANT_ID, signalType: 'RESUME' },
  });
  await runtime.recordSignalRealized(actualRunId, 'RunResumed');
  const cancelResponse = await runtimeApp.inject({
    method: 'POST',
    url: `/runs/${actualRunId}/cancel`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tenantId: TENANT_ID,
    },
  });
  const eventsResponse = await runtimeApp.inject({
    method: 'GET',
    url: `/runs/${actualRunId}/events?tenantId=${TENANT_ID}&limit=10`,
    headers: { authorization: `Bearer ${token}` },
  });
  await runtime.recordTerminalCancellation(actualRunId);
  const recoveryHeaders = {
    authorization: `Bearer ${token}`,
    'idempotency-key': `recover-${actualRunId}`,
  };
  const recoverResponse = await runtimeApp.inject({
    method: 'POST',
    url: `/runs/${actualRunId}/recover`,
    headers: recoveryHeaders,
    payload: { tenantId: TENANT_ID },
  });
  const repeatedRecoverResponse = await runtimeApp.inject({
    method: 'POST',
    url: `/runs/${actualRunId}/recover`,
    headers: recoveryHeaders,
    payload: { tenantId: TENANT_ID },
  });

  return {
    startResponse,
    actualRunId,
    listResponse,
    getRunResponse,
    pauseResponse,
    resumeResponse,
    cancelResponse,
    eventsResponse,
    recoverResponse,
    repeatedRecoverResponse,
  };
}

export async function exercisePlannerBackedRunFlow(
  runtime: ProtectedRuntimeHarness,
  input: {
    graphNodeId: string;
  }
): Promise<{
  readonly startResponse: { statusCode: number; json(): unknown };
  readonly actualRunId: string;
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

  const startResponse = await startTemporalRun(runtimeApp, token, {
    selection: [input.graphNodeId],
    graphNodeId: input.graphNodeId,
  });
  const actualRunId = readAcceptedRunId(startResponse.json());
  const storedPlan = await runtime.queryLatestStoredPlan();
  const listResponse = await runtimeApp.inject({
    method: 'GET',
    url: `/runs?tenantId=${TENANT_ID}&projectId=${PROJECT_ID}&environmentId=${ENVIRONMENT_ID}&limit=10`,
    headers: { authorization: `Bearer ${token}` },
  });

  return {
    startResponse,
    actualRunId,
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
  runtime: ProtectedRuntimeHarness
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
      selection: {
        mode: 'explicit',
        nodeIds: ['model.analytics.order_items'],
      },
      manifestRef: {
        uri: 's3://bucket/basic-manifest.json',
        sha256: '0'.repeat(64),
      },
      targetAdapter: 'temporal',
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
  input?: { graphNodeId?: string }
): Promise<{
  readonly startResponse: { statusCode: number; json(): unknown };
  readonly actualRunId: string;
  readonly cancelResponse: { statusCode: number; json(): unknown };
}> {
  const token = await runtime.issuePrincipalToken();
  const runtimeApp = runtime.requireApp();

  const startResponse = await startTemporalRun(runtimeApp, token, {
    selection: [input?.graphNodeId ?? 'model.orders.cancel.empty_reason'],
    graphNodeId: input?.graphNodeId ?? 'model.orders.cancel.empty_reason',
  });
  const actualRunId = readAcceptedRunId(startResponse.json());
  const cancelResponse = await runtimeApp.inject({
    method: 'POST',
    url: `/runs/${actualRunId}/cancel`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tenantId: TENANT_ID,
      reason: '   ',
    },
  });

  return {
    startResponse,
    actualRunId,
    cancelResponse,
  };
}

export async function expectAdminRebuildSuccess(
  runtime: ProtectedRuntimeHarness,
  input: { graphNodeId: string }
): Promise<{
  readonly startResponse: { statusCode: number; json(): unknown };
  readonly actualRunId: string;
  readonly rebuildResponse: { statusCode: number; json(): unknown };
}> {
  let result:
    | {
        readonly startResponse: { statusCode: number; json(): unknown };
        readonly actualRunId: string;
        readonly rebuildResponse: { statusCode: number; json(): unknown };
      }
    | undefined;

  await runtime.withPrincipalGrant(TENANT_ACTIONS_WITH_ADMIN_REBUILD, async () => {
    const token = await runtime.issuePrincipalToken();
    const runtimeApp = runtime.requireApp();

    const startResponse = await startTemporalRun(runtimeApp, token, {
      selection: [input.graphNodeId],
      graphNodeId: input.graphNodeId,
    });
    const actualRunId = readAcceptedRunId(startResponse.json());
    const rebuildResponse = await runtimeApp.inject({
      method: 'POST',
      url: `/admin/runs/${actualRunId}/rebuild-snapshot`,
      headers: { authorization: `Bearer ${token}` },
      payload: { tenantId: TENANT_ID },
    });

    result = { startResponse, actualRunId, rebuildResponse };
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

async function startTemporalRun(
  runtimeApp: ProtectedRuntimeHarness['requireApp'] extends () => infer T ? T : never,
  token: string,
  input: {
    selection: readonly string[];
    graphNodeId: string;
  }
): Promise<{ statusCode: number; json(): unknown }> {
  const draftResponse = await runtimeApp.inject({
    method: 'PUT',
    url: '/workspace/graph/draft',
    headers: { authorization: `Bearer ${token}` },
    payload: buildWorkspaceGraphDraftSaveRequest({
      idempotencyKey: `start-run-draft-${input.graphNodeId}`,
      draft: buildSingleNodeDraft(input.graphNodeId),
    }),
  });
  if (draftResponse.statusCode !== 200) {
    throw new TypeError(
      `Start-run draft setup failed with ${draftResponse.statusCode}: ${JSON.stringify(draftResponse.json())}`
    );
  }

  return runtimeApp.inject({
    method: 'POST',
    url: '/runs/start',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      selection: {
        mode: 'explicit',
        nodeIds: [...input.selection],
      },
      graphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dvt-substrait',
        sourceVersion: 'substrait-v1',
        nodes: [
          {
            nodeId: input.graphNodeId,
            stepKind: 'SPARK_JOB',
            dependsOn: [],
            stepTypeConfig: {
              application: 'orders-daily',
              entrypoint: 'jobs/orders.py',
              runtime: 'python',
            },
          },
        ],
      },
      targetAdapter: 'temporal',
    },
  });
}

function buildSingleNodeDraft(graphNodeId: string): ReturnType<typeof buildWorkspaceGraphDraft> {
  return buildWorkspaceGraphDraft({
    nodeIds: [graphNodeId],
    nodePositions: { [graphNodeId]: { x: 0, y: 0 } },
    nodes: [
      {
        id: graphNodeId,
        name: graphNodeId,
        pluginId: 'dbt',
        kind: 'sql_transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        path: `models/${graphNodeId}.sql`,
        metadata: {
          dialect: 'postgres',
          sqlArtifact: {
            repo: 'github.com/dunay2/dvt',
            path: `models/${graphNodeId}.sql`,
            ref: 'refs/heads/main',
            commitSha: 'commit-integration-start-run',
            contentSha256: '3'.repeat(64),
          },
        },
      },
    ],
    edges: [],
  });
}
