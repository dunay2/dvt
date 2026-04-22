import type {
  DesignGraphDraft,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { WorkspaceGraphDraftAuthoringReadResult } from '../../ports/workspaceGraphDraftAuthoring';
import type { WorkspaceGraphDraft, WorkspaceGraphDraftRecord } from '../../ports/workspace';
import {
  buildDraftReadOkResponse,
  buildProtectedDraftRecord,
} from '../../services/workspace/workspaceGraphDraft.test.fixtures';
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

type AuthoringDraftNode = DesignGraphDraft['nodes'][number];
type AuthoringDraftNodeKind = AuthoringDraftNode['type'];

const EXPLICIT_NODE_KIND_BY_ID: Readonly<Record<string, AuthoringDraftNodeKind>> = {
  node_1: 'source',
  node_2: 'sql_transform',
  node_3: 'sink',
  node_4: 'sink',
  node_remote_only: 'sql_transform',
};

function buildAuthoringDraftNode(nodeId: string, kind: AuthoringDraftNodeKind): AuthoringDraftNode {
  switch (kind) {
    case 'source':
      return {
        id: nodeId,
        type: 'source',
        payload: {
          kind: 'postgres_table',
          schema: 'raw',
          table: nodeId,
          alias: nodeId,
        },
      };

    case 'sql_transform':
      return {
        id: nodeId,
        type: 'sql_transform',
        payload: {
          dialect: 'postgres',
          sqlArtifact: {
            repo: 'dunay2/dvt',
            path: `models/${nodeId}.sql`,
            ref: 'refs/heads/main',
            commitSha: 'local',
            contentSha256: 'a'.repeat(64),
          },
          entrypoint: `models/${nodeId}.sql`,
        },
      };

    case 'sink':
      return {
        id: nodeId,
        type: 'sink',
        payload: {
          kind: 'postgres_table',
          schema: 'analytics',
          table: nodeId,
          materialization: 'table',
          writeMode: 'replace',
        },
      };
  }
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

function buildAuthoringDraftFromProjectedDraft(
  draft: WorkspaceGraphDraft,
  scope: WorkspaceGraphDraftScope
): DesignGraphDraft {
  const totalNodeCount = draft.nodeIds.length;

  return {
    context: {
      ...scope,
      executionTarget: 'postgres',
    },
    nodes: draft.nodeIds.map((nodeId, index) =>
      buildAuthoringDraftNode(nodeId, resolveAuthoringDraftNodeKind(nodeId, index, totalNodeCount))
    ),
    edges: draft.edges.map((edge) => ({
      fromNodeId: edge.sourceId,
      toNodeId: edge.targetId,
    })),
  };
}

export function buildCanvasHarnessRemoteDraftRecord(
  draft: WorkspaceGraphDraft,
  revision = 'rev-1',
  updatedAt = '2026-04-16T00:00:00Z',
  scope: WorkspaceGraphDraftScope = DEFAULT_PROTECTED_SCOPE
): ProtectedWorkspaceGraphDraftRecord {
  return buildProtectedDraftRecord(scope, {
    revision,
    updatedAt,
    draft: buildAuthoringDraftFromProjectedDraft(draft, scope),
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
      nodeIds: record.draft.nodes.map((node) => node.id),
      nodePositions: {},
      edges: record.draft.edges.map((edge) => ({
        sourceId: edge.fromNodeId,
        targetId: edge.toNodeId,
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
