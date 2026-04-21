import type {
  DesignGraphDraft,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { SessionContextPort } from '../../ports/sessionContext';
import type { WorkspaceGraphDraftAuthoringSaveResult } from '../../ports/workspaceGraphDraftAuthoring';
import { buildProtectedDraftRecord } from '../../services/workspace/workspaceGraphDraft.test.fixtures';

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
