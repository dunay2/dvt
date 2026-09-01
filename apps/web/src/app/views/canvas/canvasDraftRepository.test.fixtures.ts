import { vi } from 'vitest';

import type {
  CanvasAuthoringAuthorityResolution,
  WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringReadResult,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export const WORKSPACE_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

export function buildGraphDraftAuthority(
  canvasId: string | null = 'main-canvas'
): CanvasAuthoringAuthorityResolution {
  return canvasId === null
    ? { kind: 'unresolved', reason: 'missing_authority', canvasId: null }
    : {
        kind: 'resolved',
        binding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId,
          authority: { kind: 'graph-draft' },
        },
      };
}
const DEFAULT_AUTHORING_DRAFT_LAYOUT = {
  canvas: {
    id: 'main-canvas',
    kind: 'transformation',
    title: 'Main canvas',
  },
  nodeIds: ['source-node', 'transform-node', 'sink-node'],
  nodePositions: {
    'source-node': { x: 0, y: 0 },
    'transform-node': { x: 120, y: 0 },
    'sink-node': { x: 240, y: 0 },
  },
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
    kind: 'dvt:transform',
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

export function buildAuthoringDraft(): WorkspaceGraphAuthoringDraft {
  return {
    canvas: {
      id: DEFAULT_AUTHORING_DRAFT_LAYOUT.canvas.id,
      kind: DEFAULT_AUTHORING_DRAFT_LAYOUT.canvas.kind,
      title: DEFAULT_AUTHORING_DRAFT_LAYOUT.canvas.title,
    },
    activeCanvasId: DEFAULT_AUTHORING_DRAFT_LAYOUT.canvas.id,
    nodeIds: [...DEFAULT_AUTHORING_DRAFT_LAYOUT.nodeIds],
    nodePositions: { ...DEFAULT_AUTHORING_DRAFT_LAYOUT.nodePositions },
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

const DEFAULT_READ_RESULT = {
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
  },
  authoringAuthority: {
    kind: 'resolved',
    binding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'main-canvas',
      authority: { kind: 'graph-draft' },
    },
  },
  record: {
    scope: WORKSPACE_SCOPE,
    schemaVersion: 'workspace-graph-draft.v1',
    revision: 'rev-1',
    updatedAt: '2026-04-18T00:00:00Z',
    draft: buildAuthoringDraft(),
  },
} as const satisfies WorkspaceGraphDraftAuthoringReadResult;
const DEFAULT_SAVE_RESULT = {
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
  },
  revision: 'rev-2',
} as const satisfies WorkspaceGraphDraftAuthoringSaveResult;
export function buildAuthoringPort(
  overrides: Partial<IWorkspaceGraphDraftAuthoringPort> = {}
): IWorkspaceGraphDraftAuthoringPort {
  let currentReadResult: Extract<WorkspaceGraphDraftAuthoringReadResult, { kind: 'ok' }> =
    DEFAULT_READ_RESULT;
  return {
    readGraphDraft: vi.fn(async () => currentReadResult),
    saveGraphDraft: vi.fn(async (input) => {
      const canvasId = input.draft.activeCanvasId ?? input.draft.canvas.id;
      currentReadResult = {
        ...DEFAULT_READ_RESULT,
        authoringAuthority:
          canvasId == null
            ? {
                kind: 'unresolved',
                reason: 'missing_authority',
                canvasId: null,
              }
            : {
                kind: 'resolved',
                binding: {
                  schemaVersion: 'canvas-authoring-authority-binding.v1',
                  canvasId,
                  authority: { kind: 'graph-draft' },
                },
              },
        record: {
          ...DEFAULT_READ_RESULT.record,
          revision: DEFAULT_SAVE_RESULT.revision,
          updatedAt: DEFAULT_SAVE_RESULT.auditRef.recordedAt,
          draft: input.draft,
        },
      };
      return DEFAULT_SAVE_RESULT;
    }),
    ...overrides,
  };
}
export function buildSaveInput() {
  return {
    expectedRevision: 'rev-1',
    idempotencyKey: 'idem-1',
    draft: buildAuthoringDraft(),
  };
}
