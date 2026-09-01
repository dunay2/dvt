import { act } from 'react';

import type { WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord } from '@dvt/contracts';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildCanvasHarnessRemoteDraftRecord } from './useCanvasController.test.draftAuthoring';

export const WORKSPACE_LAYOUT_KEY = 'tenant-a::project-a::dev';
export const TRANSFORMATION_AUTHORING_CANONICAL_NODES: CanonicalNode[] = [
  {
    id: 'node_1',
    name: 'orders_source',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      config: {
        schema: 'raw',
        table: 'orders',
        alias: 'orders',
      },
    },
  },
  {
    id: 'node_2',
    name: 'orders_transform',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    path: 'models/transform.sql',
    metadata: {
      config: {
        dialect: 'postgres',
      },
    },
  },
  {
    id: 'node_3',
    name: 'orders_sink',
    pluginId: 'dvt',
    kind: 'dvt:sink',
    role: 'output',
    status: 'idle',
    tags: [],
    metadata: {
      config: {
        schema: 'analytics',
        table: 'orders_dashboard',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
  },
];
export const TRANSFORMATION_AUTHORING_CANONICAL_EDGES: CanonicalEdge[] = [
  {
    id: 'edge_1',
    sourceId: 'node_1',
    targetId: 'node_2',
    relation: 'lineage',
  },
  {
    id: 'edge_2',
    sourceId: 'node_2',
    targetId: 'node_3',
    relation: 'lineage',
  },
];

export type CanvasControllerHarness = ReturnType<typeof setupCanvasControllerHarness>;

type CanvasLayoutStoreState = {
  canvasLayouts: Record<
    string,
    {
      nodePositions?: Record<string, { x: number; y: number }>;
      viewport?: unknown;
    }
  >;
};

export const buildRemoteDraftRecord = buildCanvasHarnessRemoteDraftRecord;

export function setHarnessRemoteDraftRecord(
  harness: CanvasControllerHarness,
  record: ProtectedWorkspaceGraphDraftRecord
): void {
  harness.state.remoteDraftRecord = record;
  harness.state.graphDraftQueryData = undefined;
}

export function clearHarnessRemoteDraftRecord(harness: CanvasControllerHarness): void {
  harness.state.remoteDraftRecord = null;
  harness.state.graphDraftQueryData = undefined;
}

export async function waitForAutosaveDebounce(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 450));
  });
}

export async function createRenderedHarness(): Promise<CanvasControllerHarness> {
  const harness = setupCanvasControllerHarness();
  await harness.renderProbe();
  return harness;
}

export function createUnrenderedHarness(): CanvasControllerHarness {
  return setupCanvasControllerHarness();
}

export async function createHarnessWithDraft(
  record: ProtectedWorkspaceGraphDraftRecord
): Promise<CanvasControllerHarness> {
  const harness = setupCanvasControllerHarness();
  setHarnessRemoteDraftRecord(harness, record);
  await harness.renderProbe();
  await harness.renderProbe();
  return harness;
}

export async function createTransformationAuthoringHarness(
  visibleNodeIds: string[] = ['node_1', 'node_2', 'node_3']
): Promise<CanvasControllerHarness> {
  const harness = setupCanvasControllerHarness();
  applyTransformationAuthoringFixture(harness, visibleNodeIds);
  await harness.renderProbe();
  return harness;
}

export async function createTransformationAuthoringHarnessWithDraft(
  record: ProtectedWorkspaceGraphDraftRecord,
  visibleNodeIds: string[] = ['node_1', 'node_2', 'node_3']
): Promise<CanvasControllerHarness> {
  const harness = setupCanvasControllerHarness();
  applyTransformationAuthoringFixture(harness, visibleNodeIds);
  setHarnessRemoteDraftRecord(harness, record);
  await harness.renderProbe();
  await harness.renderProbe();
  return harness;
}

export function setCanvasLayoutNodePositions(
  harness: CanvasControllerHarness,
  nodePositions: Record<string, { x: number; y: number }>
): void {
  const storeState = harness.state.store as unknown as CanvasLayoutStoreState;
  storeState.canvasLayouts = {
    ...storeState.canvasLayouts,
    [WORKSPACE_LAYOUT_KEY]: {
      ...storeState.canvasLayouts[WORKSPACE_LAYOUT_KEY],
      nodePositions,
    },
  };
}

export function applyTransformationAuthoringFixture(
  harness: CanvasControllerHarness,
  visibleNodeIds: string[] = ['node_1', 'node_2', 'node_3']
): void {
  harness.state.canonicalNodes = TRANSFORMATION_AUTHORING_CANONICAL_NODES.map((node) => ({
    ...node,
    tags: [...node.tags],
    metadata: node.metadata ? { ...node.metadata } : undefined,
  }));
  harness.state.canonicalEdges = TRANSFORMATION_AUTHORING_CANONICAL_EDGES.map((edge) => ({
    ...edge,
  }));

  const visibleNodeIdSet = new Set(visibleNodeIds);
  harness.state.graphData = {
    nodes: visibleNodeIds.map((id) => ({ id })),
    edges: TRANSFORMATION_AUTHORING_CANONICAL_EDGES.filter(
      (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    ).map((edge) => ({ id: edge.id })),
  };
}
