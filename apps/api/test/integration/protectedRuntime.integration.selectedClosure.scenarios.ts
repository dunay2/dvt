/**
 * @file apps/api/test/integration/protectedRuntime.integration.selectedClosure.scenarios.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Keep selected-closure proof scenarios separate from generic runtime/admin integration helpers
 * @date 2026-04-23
 */
import {
  buildWorkspaceGraphDraft,
  buildWorkspaceGraphDraftSaveRequest,
} from '../fixtures/workspaceGraphDraftFixture.js';

import type { ProtectedRuntimeHarness } from './protectedRuntime.integration.harness.js';
import { readAcceptedRunId } from './protectedRuntime.integration.http.js';
import { ENVIRONMENT_ID, PROJECT_ID, TENANT_ID } from './protectedRuntime.integration.shared.js';

const TRANSFORMATION_PREVIEW_PROVENANCE = {
  kind: 'transformation-git-artifacts',
  graphArtifact: {
    repo: 'dunay2/dvt',
    ref: 'refs/heads/main',
    path: 'pipelines/orders_pipeline.yaml',
    commitSha: 'commit-graph-1',
    contentSha256: 'a'.repeat(64),
  },
  sqlArtifact: {
    repo: 'dunay2/dvt',
    ref: 'refs/heads/main',
    path: 'models/orders.sql',
    commitSha: 'commit-sql-1',
    contentSha256: 'b'.repeat(64),
  },
} as const;

export async function exerciseSelectedClosurePreviewFlow(
  runtime: ProtectedRuntimeHarness
): Promise<{
  readonly saveResponse: { statusCode: number; json(): unknown };
  readonly previewResponse: { statusCode: number; json(): unknown };
}> {
  const token = await runtime.issuePrincipalToken();
  const runtimeApp = runtime.requireApp();
  const saveResponse = await saveSelectedClosureDraft(runtime, token);
  const previewResponse = await runtimeApp.inject({
    method: 'POST',
    url: '/plans/preview',
    headers: { authorization: `Bearer ${token}` },
    payload: buildSelectedClosurePreviewPayload({
      selection: {
        mode: 'upstream',
        nodeIds: ['sink_1'],
      },
      graphSourceNodeIds: ['source_1', 'transform_1', 'sink_1'],
    }),
  });

  return {
    saveResponse,
    previewResponse,
  };
}

export async function expectSelectedClosureDependencyGapRejected(
  runtime: ProtectedRuntimeHarness
): Promise<{
  readonly saveResponse: { statusCode: number; json(): unknown };
  readonly previewResponse: { statusCode: number; json(): unknown };
}> {
  const token = await runtime.issuePrincipalToken();
  const runtimeApp = runtime.requireApp();
  const saveResponse = await saveSelectedClosureDraft(runtime, token);
  const previewResponse = await runtimeApp.inject({
    method: 'POST',
    url: '/plans/preview',
    headers: { authorization: `Bearer ${token}` },
    payload: buildSelectedClosurePreviewPayload({
      selection: {
        mode: 'explicit',
        nodeIds: ['sink_1'],
      },
      graphSourceNodeIds: ['source_1', 'transform_1', 'sink_1'],
    }),
  });

  return {
    saveResponse,
    previewResponse,
  };
}

export async function expectSelectedClosureGraphSourceMismatchRejected(
  runtime: ProtectedRuntimeHarness
): Promise<{
  readonly saveResponse: { statusCode: number; json(): unknown };
  readonly previewResponse: { statusCode: number; json(): unknown };
}> {
  const token = await runtime.issuePrincipalToken();
  const runtimeApp = runtime.requireApp();
  const saveResponse = await saveSelectedClosureDraft(runtime, token);
  const previewResponse = await runtimeApp.inject({
    method: 'POST',
    url: '/plans/preview',
    headers: { authorization: `Bearer ${token}` },
    payload: buildSelectedClosurePreviewPayload({
      selection: {
        mode: 'upstream',
        nodeIds: ['sink_1'],
      },
      graphSource: buildMismatchedTransformationGraphSource(),
    }),
  });

  return {
    saveResponse,
    previewResponse,
  };
}

export async function exerciseSelectedClosurePlannerBackedRunFlow(
  runtime: ProtectedRuntimeHarness
): Promise<{
  readonly saveResponse: { statusCode: number; json(): unknown };
  readonly startResponse: { statusCode: number; json(): unknown };
  readonly actualRunId: string;
  readonly storedPlan:
    | {
        plan_id: string;
        plan_uri: string;
        validation_state: string;
      }
    | undefined;
}> {
  const token = await runtime.issuePrincipalToken();
  const runtimeApp = runtime.requireApp();
  const saveResponse = await saveSelectedClosureDraft(runtime, token);
  const startResponse = await runtimeApp.inject({
    method: 'POST',
    url: '/runs/start',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      selection: {
        mode: 'upstream',
        nodeIds: ['sink_1'],
      },
      graphSource: buildTransformationGraphSource(['source_1', 'transform_1', 'sink_1']),
      targetAdapter: 'temporal',
    },
  });
  const actualRunId = readAcceptedRunId(startResponse.json());
  const storedPlan = await runtime.queryLatestStoredPlan();

  return {
    saveResponse,
    startResponse,
    actualRunId,
    storedPlan,
  };
}

async function saveSelectedClosureDraft(
  runtime: ProtectedRuntimeHarness,
  token: string
): Promise<{ statusCode: number; json(): unknown }> {
  return runtime.requireApp().inject({
    method: 'PUT',
    url: '/workspace/graph/draft',
    headers: { authorization: `Bearer ${token}` },
    payload: buildWorkspaceGraphDraftSaveRequest({
      draft: buildSelectedClosureDraft(),
    }),
  });
}

function buildSelectedClosurePreviewPayload(input: {
  selection: {
    mode: 'explicit' | 'upstream';
    nodeIds: readonly string[];
  };
  graphSourceNodeIds?: readonly string[];
  graphSource?: ReturnType<typeof buildTransformationGraphSource>;
}): Record<string, unknown> {
  return {
    context: {
      runId: 'preview-selected-closure',
      tenantId: TENANT_ID,
      projectId: PROJECT_ID,
      environmentId: ENVIRONMENT_ID,
      targetAdapter: 'temporal',
    },
    previewProfile: 'planner-generic-v1',
    selection: {
      mode: input.selection.mode,
      nodeIds: [...input.selection.nodeIds],
    },
    graphSource:
      input.graphSource ?? buildTransformationGraphSource(input.graphSourceNodeIds ?? []),
    persist: true,
  };
}

function buildSelectedClosureDraft(): ReturnType<typeof buildWorkspaceGraphDraft> {
  const baseDraft = buildWorkspaceGraphDraft();

  return {
    ...baseDraft,
    nodeIds: [...baseDraft.nodeIds, 'loose_1'],
    nodePositions: {
      ...baseDraft.nodePositions,
      loose_1: { x: 720, y: 0 },
    },
    nodes: [
      ...baseDraft.nodes,
      {
        id: 'loose_1',
        name: 'Loose quality node',
        pluginId: 'dbt',
        kind: 'postgres_table',
        role: 'check' as const,
        status: 'idle' as const,
        tags: ['quality'],
        metadata: {
          schema: 'analytics',
          table: 'orders_quality',
        },
      },
    ],
  };
}

function buildTransformationGraphSource(nodeIds: readonly string[]): {
  kind: 'generic-graph-v1';
  sourceFamily: 'dvt-substrait';
  sourceVersion: 'substrait-v1';
  nodes: Array<Record<string, unknown>>;
} {
  const nodeSet = new Set(nodeIds);
  const allNodes: Array<Record<string, unknown>> = [
    {
      nodeId: 'source_1',
      stepKind: 'PREPARE_POSTGRES_TRANSFORM',
      dependsOn: [],
      stepTypeConfig: {
        targetSchema: 'analytics',
        sourceSchema: 'raw',
        sourceTable: 'orders',
        sourceAlias: 'orders',
      },
    },
    {
      nodeId: 'transform_1',
      stepKind: 'POSTGRES_SQL_TRANSFORM',
      dependsOn: ['source_1'],
      stepTypeConfig: {
        dialect: 'postgres',
        entrypoint: 'models/orders.sql',
        sql: 'select * from raw.orders',
        sqlArtifact: TRANSFORMATION_PREVIEW_PROVENANCE.sqlArtifact,
        sourceSchema: 'raw',
        sourceTable: 'orders',
        sourceAlias: 'orders',
        sinkSchema: 'analytics',
        sinkTable: 'orders_final',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
    {
      nodeId: 'sink_1',
      stepKind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
      dependsOn: ['transform_1'],
      stepTypeConfig: {
        sinkSchema: 'analytics',
        sinkTable: 'orders_final',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
  ];

  return {
    kind: 'generic-graph-v1',
    sourceFamily: 'dvt-substrait',
    sourceVersion: 'substrait-v1',
    nodes: allNodes.filter((node) => nodeSet.has(node.nodeId as string)),
  };
}

function buildMismatchedTransformationGraphSource(): ReturnType<
  typeof buildTransformationGraphSource
> {
  return {
    kind: 'generic-graph-v1',
    sourceFamily: 'dvt-substrait',
    sourceVersion: 'substrait-v1',
    nodes: [
      {
        nodeId: 'alternate_source',
        stepKind: 'PREPARE_POSTGRES_TRANSFORM',
        dependsOn: [],
        stepTypeConfig: {
          targetSchema: 'analytics',
          sourceSchema: 'raw',
          sourceTable: 'orders',
          sourceAlias: 'orders',
        },
      },
      {
        nodeId: 'alternate_transform',
        stepKind: 'POSTGRES_SQL_TRANSFORM',
        dependsOn: ['alternate_source'],
        stepTypeConfig: {
          dialect: 'postgres',
          entrypoint: 'models/orders.sql',
          sql: 'select * from raw.orders',
          sqlArtifact: TRANSFORMATION_PREVIEW_PROVENANCE.sqlArtifact,
          sourceSchema: 'raw',
          sourceTable: 'orders',
          sourceAlias: 'orders',
          sinkSchema: 'analytics',
          sinkTable: 'orders_final',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
      {
        nodeId: 'alternate_sink',
        stepKind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
        dependsOn: ['alternate_transform'],
        stepTypeConfig: {
          sinkSchema: 'analytics',
          sinkTable: 'orders_final',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    ],
  };
}
