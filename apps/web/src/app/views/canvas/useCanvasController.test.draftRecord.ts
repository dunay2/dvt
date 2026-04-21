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
    nodes: draft.nodeIds.map((nodeId, index) => {
      if (index === 0) {
        return {
          id: nodeId,
          type: 'source' as const,
          payload: {
            kind: 'postgres_table' as const,
            schema: 'raw',
            table: nodeId,
            alias: nodeId,
          },
        };
      }

      if (index === totalNodeCount - 1 && totalNodeCount > 1) {
        return {
          id: nodeId,
          type: 'sink' as const,
          payload: {
            kind: 'postgres_table' as const,
            schema: 'analytics',
            table: nodeId,
            materialization: 'table' as const,
            writeMode: 'replace' as const,
          },
        };
      }

      return {
        id: nodeId,
        type: 'sql_transform' as const,
        payload: {
          dialect: 'postgres' as const,
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
    }),
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
