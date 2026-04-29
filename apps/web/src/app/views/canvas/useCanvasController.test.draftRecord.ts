import type {
  WorkspaceGraphAuthoringDraft,
  WorkspaceGraphAuthoringNode,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { WorkspaceGraphDraftAuthoringReadResult } from '../../ports/workspaceGraphDraftAuthoring';
import type { WorkspaceGraphDraft, WorkspaceGraphDraftRecord } from '../../ports/workspace';
import { buildProtectedDraftRecord } from '../../services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import { buildDraftReadOkResponse } from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import {
  createUnknownCanvasDraftReadModel,
  projectCanvasDraftReadModel,
  type CanvasDraftReadModel,
} from './canvasDraftReadModel';

const DEFAULT_PROTECTED_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;
const DEFAULT_CANVAS_DOCUMENT = {
  kind: 'transformation',
  title: 'Main canvas',
} as const;

type AuthoringDraftNodeKind = WorkspaceGraphAuthoringNode['kind'];
type CanvasHarnessDraftInput = Omit<WorkspaceGraphDraft, 'canvas'> & {
  canvas?: WorkspaceGraphDraft['canvas'];
};

const EXPLICIT_NODE_KIND_BY_ID: Readonly<Record<string, AuthoringDraftNodeKind>> = {
  node_1: 'source',
  node_2: 'sql_transform',
  node_3: 'sink',
  node_4: 'sink',
  node_remote_only: 'sql_transform',
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

  if (kind === 'sql_transform') {
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

  return 'sql_transform';
}

function withCanvasDocument(draft: CanvasHarnessDraftInput): WorkspaceGraphDraft {
  return {
    canvas: draft.canvas ?? DEFAULT_CANVAS_DOCUMENT,
    nodeIds: [...draft.nodeIds],
    nodePositions: { ...draft.nodePositions },
    edges: draft.edges.map((edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
    })),
  };
}

function buildAuthoringDraftFromProjectedDraft(
  draft: CanvasHarnessDraftInput
): WorkspaceGraphAuthoringDraft {
  const draftWithCanvas = withCanvasDocument(draft);
  const totalNodeCount = draft.nodeIds.length;

  return {
    canvas: {
      kind: draftWithCanvas.canvas.kind,
      title: draftWithCanvas.canvas.title,
    },
    nodeIds: [...draftWithCanvas.nodeIds],
    nodePositions: { ...draftWithCanvas.nodePositions },
    nodes: draftWithCanvas.nodeIds.map((nodeId, index) =>
      buildAuthoringDraftNode(nodeId, resolveAuthoringDraftNodeKind(nodeId, index, totalNodeCount))
    ),
    edges: draftWithCanvas.edges.map((edge) => ({
      id: `draft_edge_${edge.sourceId}_${edge.targetId}`,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relation: 'lineage',
    })),
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
    draft: buildAuthoringDraftFromProjectedDraft(draft),
  });
}

export function projectCanvasHarnessRemoteDraftRecord(
  record: ProtectedWorkspaceGraphDraftRecord | null
): WorkspaceGraphDraftRecord | null {
  if (record == null) {
    return null;
  }

  return {
    revision: record.revision,
    savedAt: record.updatedAt,
    draft: {
      canvas: {
        kind: record.draft.canvas.kind,
        title: record.draft.canvas.title,
      },
      nodeIds: [...record.draft.nodeIds],
      nodePositions: { ...record.draft.nodePositions },
      edges: record.draft.edges.map((edge) => ({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
      })),
    },
  };
}

export function buildCanvasHarnessDraftReadResult(
  record: ProtectedWorkspaceGraphDraftRecord
): WorkspaceGraphDraftAuthoringReadResult {
  return buildDraftReadOkResponse(record.scope, { record });
}

export function projectCanvasHarnessDraftReadModel(
  record: ProtectedWorkspaceGraphDraftRecord | null
): CanvasDraftReadModel {
  if (record == null) {
    return createUnknownCanvasDraftReadModel();
  }

  return projectCanvasDraftReadModel(buildCanvasHarnessDraftReadResult(record));
}
