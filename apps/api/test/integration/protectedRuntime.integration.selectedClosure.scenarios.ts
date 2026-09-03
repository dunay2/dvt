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
import { ENVIRONMENT_ID, PROJECT_ID, TENANT_ID } from './protectedRuntime.integration.shared.js';

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
      graphSource: buildMismatchedSelectedClosureGraphSource(),
    }),
  });

  return {
    saveResponse,
    previewResponse,
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
  graphSource?: ReturnType<typeof buildSelectedClosureGraphSource>;
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
      input.graphSource ?? buildSelectedClosureGraphSource(input.graphSourceNodeIds ?? []),
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

function buildSelectedClosureGraphSource(nodeIds: readonly string[]): {
  kind: 'generic-graph-v1';
  sourceFamily: 'dvt-substrait';
  sourceVersion: 'substrait-v1';
  nodes: Array<Record<string, unknown>>;
} {
  const nodeSet = new Set(nodeIds);
  const allNodes: Array<Record<string, unknown>> = [
    {
      nodeId: 'source_1',
      stepKind: 'DBT_MODEL',
      dependsOn: [],
    },
    {
      nodeId: 'transform_1',
      stepKind: 'DBT_MODEL',
      dependsOn: ['source_1'],
    },
    {
      nodeId: 'sink_1',
      stepKind: 'DBT_TEST',
      dependsOn: ['transform_1'],
    },
  ];

  return {
    kind: 'generic-graph-v1',
    sourceFamily: 'dvt-substrait',
    sourceVersion: 'substrait-v1',
    nodes: allNodes.filter((node) => nodeSet.has(node.nodeId as string)),
  };
}

function buildMismatchedSelectedClosureGraphSource(): ReturnType<
  typeof buildSelectedClosureGraphSource
> {
  return {
    kind: 'generic-graph-v1',
    sourceFamily: 'dvt-substrait',
    sourceVersion: 'substrait-v1',
    nodes: [
      {
        nodeId: 'alternate_source',
        stepKind: 'DBT_MODEL',
        dependsOn: [],
      },
      {
        nodeId: 'alternate_transform',
        stepKind: 'DBT_MODEL',
        dependsOn: ['alternate_source'],
      },
      {
        nodeId: 'alternate_sink',
        stepKind: 'DBT_TEST',
        dependsOn: ['alternate_transform'],
      },
    ],
  };
}
