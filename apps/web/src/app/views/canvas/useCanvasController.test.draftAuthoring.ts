import type {
  DesignGraphDraft,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { SessionContextPort } from '../../ports/sessionContext';
import type {
  WorkspaceGraphDraftAuthoringReadResult,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import type { WorkspaceGraphDraft, WorkspaceGraphDraftRecord } from '../../ports/workspace';
import {
  buildDraftReadOkResponse,
  buildProtectedDraftRecord,
} from '../../services/workspace/workspaceGraphDraft.test.fixtures';

const DEFAULT_PROTECTED_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

function buildProtectedScope(
  sessionContext: Pick<SessionContextPort, 'getWorkspaceScopeSnapshot'>
): WorkspaceGraphDraftScope {
  const workspaceScope = sessionContext.getWorkspaceScopeSnapshot();

  return {
    tenantId: workspaceScope.tenantId,
    projectId: workspaceScope.projectId,
    environmentId: workspaceScope.environmentId,
  } as const;
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

function buildSavedAuthoringResult(revision: string): WorkspaceGraphDraftAuthoringSaveResult {
  return {
    kind: 'saved',
    capability: {
      scope: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
      },
      mode: 'writable',
      canRead: true,
      canWrite: true,
      reason: 'authorized',
    },
    auditRef: {
      correlationId: 'corr-1',
      decisionId: 'dec-1',
      action: 'draft_write',
      outcome: 'allowed',
      recordedAt: '2026-04-08T00:00:00Z',
    },
    formatMeta: {
      schemaVersion: 'workspace-graph-draft.v1',
      storedSchemaVersion: 'workspace-graph-draft.v1',
      migrationState: 'native',
    },
    revision,
  };
}

function buildConflictAuthoringResult(currentRevision: string): WorkspaceGraphDraftAuthoringSaveResult {
  return {
    kind: 'conflict',
    capability: {
      scope: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
      },
      mode: 'writable',
      canRead: true,
      canWrite: true,
      reason: 'authorized',
    },
    auditRef: {
      correlationId: 'corr-1',
      decisionId: 'dec-1',
      action: 'draft_write',
      outcome: 'conflict',
      recordedAt: '2026-04-08T00:00:00Z',
    },
    formatMeta: {
      schemaVersion: 'workspace-graph-draft.v1',
      storedSchemaVersion: 'workspace-graph-draft.v1',
      migrationState: 'native',
    },
    currentRevision,
  };
}

function buildProtectedRecordFromAuthoringDraft(
  draft: DesignGraphDraft,
  scope: WorkspaceGraphDraftScope,
  revision = crypto.randomUUID(),
  updatedAt = '2026-04-08T00:00:00Z'
): ProtectedWorkspaceGraphDraftRecord {
  return buildProtectedDraftRecord(scope, {
    revision,
    updatedAt,
    draft: structuredClone(draft),
  });
}

export function resolveCanvasHarnessDraftSave(args: {
  currentRecord: ProtectedWorkspaceGraphDraftRecord | null;
  draft: DesignGraphDraft;
  expectedRevision: string | null;
  sessionContext: Pick<SessionContextPort, 'getWorkspaceScopeSnapshot'>;
}): {
  nextRecord: ProtectedWorkspaceGraphDraftRecord;
  result: WorkspaceGraphDraftAuthoringSaveResult;
} | {
  nextRecord: ProtectedWorkspaceGraphDraftRecord | null;
  result: WorkspaceGraphDraftAuthoringSaveResult;
} {
  const { currentRecord, draft, expectedRevision, sessionContext } = args;
  const activeRevision = currentRecord?.revision ?? null;

  if (expectedRevision !== activeRevision && currentRecord != null) {
    return {
      nextRecord: currentRecord,
      result: buildConflictAuthoringResult(currentRecord.revision),
    };
  }

  const nextRecord = buildProtectedRecordFromAuthoringDraft(
    draft,
    buildProtectedScope(sessionContext)
  );
  return {
    nextRecord,
    result: buildSavedAuthoringResult(nextRecord.revision),
  };
}
