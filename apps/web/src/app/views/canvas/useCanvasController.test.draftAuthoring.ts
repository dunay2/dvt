import type { DesignGraphDraft } from '@dvt/contracts';

import type { SessionContextPort } from '../../ports/sessionContext';
import type {
  WorkspaceGraphDraftAuthoringReadResult,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import {
  buildDraftReadOkResponse,
  buildProtectedDraftRecord,
} from '../../services/workspace/workspaceGraphDraft.test.fixtures';
import { projectDesignGraphDraft } from '../../services/workspace/workspaceGraphDraftProjection';

function buildProtectedScope(
  sessionContext: Pick<SessionContextPort, 'getWorkspaceScopeSnapshot'>
) {
  const workspaceScope = sessionContext.getWorkspaceScopeSnapshot();

  return {
    tenantId: workspaceScope.tenantId,
    projectId: workspaceScope.projectId,
    environmentId: workspaceScope.environmentId,
  } as const;
}

export function buildCanvasHarnessDraftReadResult(
  record: WorkspaceGraphDraftRecord,
  sessionContext: Pick<SessionContextPort, 'getWorkspaceScopeSnapshot'>
): WorkspaceGraphDraftAuthoringReadResult {
  const protectedScope = buildProtectedScope(sessionContext);
  const totalNodeCount = record.draft.nodeIds.length;

  return buildDraftReadOkResponse(protectedScope, {
    record: buildProtectedDraftRecord(protectedScope, {
      revision: record.revision,
      updatedAt: record.savedAt,
      draft: {
        context: {
          ...protectedScope,
          executionTarget: 'postgres',
        },
        nodes: record.draft.nodeIds.map((nodeId, index) => {
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
        edges: record.draft.edges.map((edge) => ({
          fromNodeId: edge.sourceId,
          toNodeId: edge.targetId,
        })),
      },
    }),
  });
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

function buildProjectedRecordFromAuthoringDraft(
  draft: DesignGraphDraft,
  revision = crypto.randomUUID(),
  savedAt = '2026-04-08T00:00:00Z'
): WorkspaceGraphDraftRecord {
  return {
    revision,
    savedAt,
    draft: projectDesignGraphDraft(draft),
  };
}

export function resolveCanvasHarnessDraftSave(args: {
  currentRecord: WorkspaceGraphDraftRecord | null;
  draft: DesignGraphDraft;
  expectedRevision: string | null;
}): {
  nextRecord: WorkspaceGraphDraftRecord;
  result: WorkspaceGraphDraftAuthoringSaveResult;
} | {
  nextRecord: WorkspaceGraphDraftRecord | null;
  result: WorkspaceGraphDraftAuthoringSaveResult;
} {
  const { currentRecord, draft, expectedRevision } = args;
  const activeRevision = currentRecord?.revision ?? null;

  if (expectedRevision !== activeRevision && currentRecord != null) {
    return {
      nextRecord: currentRecord,
      result: buildConflictAuthoringResult(currentRecord.revision),
    };
  }

  const nextRecord = buildProjectedRecordFromAuthoringDraft(draft);
  return {
    nextRecord,
    result: buildSavedAuthoringResult(nextRecord.revision),
  };
}
