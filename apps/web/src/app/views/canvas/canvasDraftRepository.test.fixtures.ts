import { vi } from 'vitest';

import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringReadResult,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import type { IWorkspacePort } from '../../ports/workspace';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

export const WORKSPACE_SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' } as const;
export const PROJECTED_DRAFT = {
  canvas: {
    kind: 'transformation',
    title: 'Main canvas',
  },
  nodeIds: ['source-node', 'transform-node', 'sink-node'],
  nodePositions: {
    'source-node': { x: 0, y: 0 },
    'transform-node': { x: 120, y: 0 },
    'sink-node': { x: 240, y: 0 },
  },
  edges: [
    { sourceId: 'source-node', targetId: 'transform-node' },
    { sourceId: 'transform-node', targetId: 'sink-node' },
  ],
};
const CANONICAL_NODES = [
  {
    id: 'source-node',
    name: 'Source',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: { config: { schema: 'raw', table: 'orders', alias: 'orders' } },
  },
  {
    id: 'transform-node',
    name: 'Transform',
    pluginId: 'dvt',
    kind: 'dvt:sql_transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    path: 'models/transform.sql',
    metadata: { config: { dialect: 'postgres' } },
  },
  {
    id: 'sink-node',
    name: 'Sink',
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
] satisfies CanonicalNode[];
const CANONICAL_EDGES = [
  { id: 'edge-1', sourceId: 'source-node', targetId: 'transform-node', relation: 'lineage' },
  { id: 'edge-2', sourceId: 'transform-node', targetId: 'sink-node', relation: 'lineage' },
] satisfies CanonicalEdge[];

function buildAuthoringDraft(): WorkspaceGraphAuthoringDraft {
  return {
    canvas: {
      kind: 'transformation',
      title: 'Main canvas',
    },
    nodeIds: [...PROJECTED_DRAFT.nodeIds],
    nodePositions: { ...PROJECTED_DRAFT.nodePositions },
    nodes: CANONICAL_NODES.map((node) => ({
      ...node,
      kind: node.kind.split(':').at(-1) ?? node.kind,
    })),
    edges: CANONICAL_EDGES.map((edge) => ({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relation: edge.relation,
    })),
  };
}

const DEFAULT_READ_RESULT: WorkspaceGraphDraftAuthoringReadResult = {
  kind: 'ok',
  capability: {
    scope: WORKSPACE_SCOPE,
    mode: 'writable',
    canRead: true,
    canWrite: true,
    reason: 'authorized',
  },
  auditRef: {
    correlationId: 'corr-1',
    decisionId: 'dec-1',
    action: 'draft_read',
    outcome: 'allowed',
    recordedAt: '2026-04-18T00:00:00Z',
  },
  formatMeta: {
    schemaVersion: 'workspace-graph-draft.v1',
    storedSchemaVersion: 'workspace-graph-draft.v1',
    migrationState: 'native',
  },
  record: {
    scope: WORKSPACE_SCOPE,
    schemaVersion: 'workspace-graph-draft.v1',
    revision: 'rev-1',
    updatedAt: '2026-04-18T00:00:00Z',
    draft: buildAuthoringDraft(),
  },
};
const DEFAULT_SAVE_RESULT: WorkspaceGraphDraftAuthoringSaveResult = {
  kind: 'saved',
  capability: {
    scope: WORKSPACE_SCOPE,
    mode: 'writable',
    canRead: true,
    canWrite: true,
    reason: 'authorized',
  },
  auditRef: {
    correlationId: 'corr-2',
    decisionId: 'dec-2',
    action: 'draft_write',
    outcome: 'allowed',
    recordedAt: '2026-04-18T00:00:01Z',
  },
  formatMeta: {
    schemaVersion: 'workspace-graph-draft.v1',
    storedSchemaVersion: 'workspace-graph-draft.v1',
    migrationState: 'native',
  },
  revision: 'rev-2',
};
export function buildAuthoringPort(
  overrides: Partial<IWorkspaceGraphDraftAuthoringPort> = {}
): IWorkspaceGraphDraftAuthoringPort {
  return {
    readGraphDraft: vi.fn(async () => DEFAULT_READ_RESULT),
    saveGraphDraft: vi.fn(async () => DEFAULT_SAVE_RESULT),
    ...overrides,
  };
}
export function buildWorkspacePort(
  overrides: Partial<Pick<IWorkspacePort, 'getGraphSnapshot' | 'getFileContent'>> = {}
): Pick<IWorkspacePort, 'getGraphSnapshot' | 'getFileContent'> {
  return {
    getGraphSnapshot: vi.fn(async () => ({ nodes: [], edges: [] })),
    getFileContent: vi.fn(async (path: string) => ({
      path,
      name: path.split('/').at(-1) ?? path,
      language: 'sql',
      content: 'select * from raw.orders',
      lastModified: '2026-04-18T00:00:00Z',
    })),
    ...overrides,
  };
}
export function buildSaveInput() {
  return {
    expectedRevision: 'rev-1',
    idempotencyKey: 'idem-1',
    draft: {
      projectedDraft: { ...PROJECTED_DRAFT },
      canonicalNodes: CANONICAL_NODES,
      canonicalEdges: CANONICAL_EDGES,
      workspaceScope: {
        ...WORKSPACE_SCOPE,
        targetAdapter: 'mock' as const,
      },
      previewProvenanceConfig: { gitBranch: 'main', gitSha: 'local', gitRepo: 'dunay2/dvt' },
    },
  };
}
