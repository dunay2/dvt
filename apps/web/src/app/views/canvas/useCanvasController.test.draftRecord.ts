import type {
  WorkspaceGraphAuthoringDraft,
  WorkspaceGraphAuthoringNode,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { WorkspaceGraphDraftAuthoringReadResult } from '../../ports/workspaceGraphDraftAuthoring';
import { buildProtectedDraftRecord } from '../../services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import { buildDraftReadOkResponse } from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import {
  createUnknownCanvasAuthoringDraftReadModel,
  projectCanvasAuthoringDraftReadModel,
  projectProtectedCanvasAuthoringDraftRecord,
  type CanvasAuthoringDraftReadModel,
  type CanvasAuthoringDraftRecord,
} from './canvasDraftReadModel';

const DEFAULT_PROTECTED_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;
const DEFAULT_CANVAS_DOCUMENT = {
  id: 'main-canvas',
  kind: 'transformation',
  title: 'Main canvas',
} as const;

type AuthoringDraftNodeKind = WorkspaceGraphAuthoringNode['kind'];
type CanvasHarnessVisibleEdgeInput = Pick<
  WorkspaceGraphAuthoringDraft['edges'][number],
  'sourceId' | 'targetId'
>;
type CanvasHarnessDraftInput = Pick<WorkspaceGraphAuthoringDraft, 'nodeIds' | 'nodePositions'> & {
  canvas?: WorkspaceGraphAuthoringDraft['canvas'];
  edges: CanvasHarnessVisibleEdgeInput[];
};

const EXPLICIT_NODE_KIND_BY_ID: Readonly<Record<string, AuthoringDraftNodeKind>> = {
  node_1: 'source',
  node_2: 'transform',
  node_3: 'sink',
  node_4: 'sink',
  node_remote_only: 'transform',
};

function resolveAuthoringNodeRole(
  kind: AuthoringDraftNodeKind
): WorkspaceGraphAuthoringNode['role'] {
  if (kind === 'source') {
    return 'input';
  }

  if (kind === 'sink') {
    return 'output';
  }

  return 'transform';
}

function buildAuthoringDraftNode(
  nodeId: string,
  kind: AuthoringDraftNodeKind
): WorkspaceGraphAuthoringNode {
  const node: WorkspaceGraphAuthoringNode = {
    id: nodeId,
    name: nodeId,
    pluginId: 'dvt',
    kind,
    role: resolveAuthoringNodeRole(kind),
    status: 'idle',
    tags: [],
  };

  if (kind === 'transform') {
    node.path = `models/${nodeId}.sql`;
    node.metadata = {
      config: {
        dialect: 'postgres',
      },
    };
  }

  if (kind === 'source') {
    node.metadata = {
      config: {
        schema: 'raw',
        table: nodeId,
        alias: nodeId,
      },
    };
  }

  if (kind === 'sink') {
    node.metadata = {
      config: {
        schema: 'analytics',
        table: nodeId,
        materialization: 'table',
        writeMode: 'replace',
      },
    };
  }

  return node;
}

function resolveAuthoringDraftNodeKind(
  nodeId: string,
  index: number,
  totalNodeCount: number
): AuthoringDraftNodeKind {
  const explicitKind = EXPLICIT_NODE_KIND_BY_ID[nodeId];
  if (explicitKind != null) {
    return explicitKind;
  }

  if (index === 0) {
    return 'source';
  }

  if (index === totalNodeCount - 1 && totalNodeCount > 1) {
    return 'sink';
  }

  return 'transform';
}

function buildCanvasHarnessAuthoringDraft(
  draft: CanvasHarnessDraftInput
): WorkspaceGraphAuthoringDraft {
  const totalNodeCount = draft.nodeIds.length;
  const canvas = {
    id: draft.canvas?.id ?? DEFAULT_CANVAS_DOCUMENT.id,
    kind: draft.canvas?.kind ?? DEFAULT_CANVAS_DOCUMENT.kind,
    title: draft.canvas?.title ?? DEFAULT_CANVAS_DOCUMENT.title,
  };
  const nodes = draft.nodeIds.map((nodeId, index) =>
    buildAuthoringDraftNode(nodeId, resolveAuthoringDraftNodeKind(nodeId, index, totalNodeCount))
  );
  const edges = draft.edges.map((edge) => ({
    id: `draft_edge_${edge.sourceId}_${edge.targetId}`,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relation: 'lineage' as const,
  }));

  return {
    canvas,
    activeCanvasId: canvas.id,
    canvases: [
      {
        canvas,
        nodeIds: [...draft.nodeIds],
        nodePositions: { ...draft.nodePositions },
        nodes: nodes.map((node) => ({ ...node })),
        edges: edges.map((edge) => ({ ...edge })),
      },
    ],
    nodeIds: [...draft.nodeIds],
    nodePositions: { ...draft.nodePositions },
    nodes,
    edges,
  };
}

export function buildCanvasHarnessRemoteDraftRecord(
  draft: CanvasHarnessDraftInput,
  revision = 'rev-1',
  updatedAt = '2026-04-16T00:00:00Z',
  scope: WorkspaceGraphDraftScope = DEFAULT_PROTECTED_SCOPE
): ProtectedWorkspaceGraphDraftRecord {
  return buildProtectedDraftRecord(scope, {
    revision,
    updatedAt,
    draft: buildCanvasHarnessAuthoringDraft(draft),
  });
}

export function projectCanvasHarnessRemoteDraftRecord(
  record: ProtectedWorkspaceGraphDraftRecord | null
): CanvasAuthoringDraftRecord | null {
  if (record == null) {
    return null;
  }

  return projectProtectedCanvasAuthoringDraftRecord(record);
}

export function buildCanvasHarnessDraftReadResult(
  record: ProtectedWorkspaceGraphDraftRecord
): WorkspaceGraphDraftAuthoringReadResult {
  return buildDraftReadOkResponse(record.scope, { record });
}

export function projectCanvasHarnessDraftReadModel(
  record: ProtectedWorkspaceGraphDraftRecord | null
): CanvasAuthoringDraftReadModel {
  if (record == null) {
    return createUnknownCanvasAuthoringDraftReadModel();
  }

  return projectCanvasAuthoringDraftReadModel(buildCanvasHarnessDraftReadResult(record));
}
