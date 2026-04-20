import type {
  DesignGraphDraft,
  WorkspaceGraphDraftAuditAction,
  WorkspaceGraphDraftAuditOutcome,
  WorkspaceGraphDraftCapabilityMode,
  WorkspaceGraphDraftCapabilityOutcome,
  WorkspaceGraphDraftCapabilityReason,
  WorkspaceGraphDraftFormatMeta,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { SessionContextPort } from '../../ports/sessionContext';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import type { IWorkspacePort } from '../../ports/workspace';
import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from './workspaceGraphDraftProtocol';

type MockWorkspaceGraphDraftPortArgs = {
  workspaceService: Pick<IWorkspacePort, 'getGraphDraft' | 'saveGraphDraft'>;
  sessionContext: Pick<SessionContextPort, 'getWorkspaceScopeSnapshot'>;
};

const draftsByWorkspaceService = new WeakMap<
  MockWorkspaceGraphDraftPortArgs['workspaceService'],
  Map<string, DesignGraphDraft>
>();

function getDraftStore(
  workspaceService: MockWorkspaceGraphDraftPortArgs['workspaceService']
): Map<string, DesignGraphDraft> {
  const existingDraftStore = draftsByWorkspaceService.get(workspaceService);
  if (existingDraftStore) {
    return existingDraftStore;
  }

  const nextDraftStore = new Map<string, DesignGraphDraft>();
  draftsByWorkspaceService.set(workspaceService, nextDraftStore);
  return nextDraftStore;
}

function readWorkspaceGraphDraftScope(
  sessionContext: Pick<SessionContextPort, 'getWorkspaceScopeSnapshot'>
): WorkspaceGraphDraftScope {
  const scope = sessionContext.getWorkspaceScopeSnapshot();

  return {
    tenantId: scope.tenantId,
    projectId: scope.projectId,
    environmentId: scope.environmentId,
  };
}

function buildCapability(
  scope: WorkspaceGraphDraftScope,
  mode: WorkspaceGraphDraftCapabilityMode,
  reason: WorkspaceGraphDraftCapabilityReason
): WorkspaceGraphDraftCapabilityOutcome {
  switch (mode) {
    case 'writable':
      return {
        scope,
        mode,
        canRead: true,
        canWrite: true,
        reason,
      };
    case 'read_only':
      return {
        scope,
        mode,
        canRead: true,
        canWrite: false,
        reason,
      };
    case 'forbidden':
      return {
        scope,
        mode,
        canRead: false,
        canWrite: false,
        reason,
      };
  }
}

function buildAuditRef(
  action: WorkspaceGraphDraftAuditAction,
  outcome: WorkspaceGraphDraftAuditOutcome
) {
  return {
    correlationId: 'mock-correlation-id',
    decisionId: 'mock-decision-id',
    action,
    outcome,
    recordedAt: new Date().toISOString(),
  };
}

function buildFormatMeta(): WorkspaceGraphDraftFormatMeta {
  return {
    schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    storedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    migrationState: 'native',
  };
}

function projectDesignGraphDraft(draft: DesignGraphDraft) {
  return {
    nodeIds: draft.nodes.map((node) => node.id),
    nodePositions: {},
    edges: draft.edges.map((edge) => ({
      sourceId: edge.fromNodeId,
      targetId: edge.toNodeId,
    })),
  };
}

export function createMockWorkspaceGraphDraftAuthoringPort({
  workspaceService,
  sessionContext,
}: MockWorkspaceGraphDraftPortArgs): IWorkspaceGraphDraftAuthoringPort {
  const draftsByRevision = getDraftStore(workspaceService);

  return {
    async readGraphDraft() {
      const legacyRecord = await workspaceService.getGraphDraft();
      if (legacyRecord == null) {
        return { kind: 'not_found' };
      }

      const typedDraft = draftsByRevision.get(legacyRecord.revision);
      if (typedDraft == null) {
        return { kind: 'not_found' };
      }

      const scope = readWorkspaceGraphDraftScope(sessionContext);

      return {
        kind: 'ok',
        capability: buildCapability(scope, 'writable', 'authorized'),
        auditRef: buildAuditRef('draft_read', 'allowed'),
        formatMeta: buildFormatMeta(),
        record: {
          scope,
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          revision: legacyRecord.revision,
          draft: typedDraft,
          updatedAt: legacyRecord.savedAt,
        },
      };
    },

    async saveGraphDraft(input) {
      const scope = readWorkspaceGraphDraftScope(sessionContext);
      const result = await workspaceService.saveGraphDraft({
        expectedRevision: input.expectedRevision,
        idempotencyKey: input.idempotencyKey,
        draft: projectDesignGraphDraft(input.draft),
      });

      if (result.outcome === 'saved') {
        draftsByRevision.set(result.record.revision, input.draft);

        return {
          kind: 'saved',
          capability: buildCapability(scope, 'writable', 'authorized'),
          auditRef: buildAuditRef('draft_write', 'allowed'),
          formatMeta: buildFormatMeta(),
          revision: result.record.revision,
        };
      }

      return {
        kind: 'conflict',
        capability: buildCapability(scope, 'writable', 'authorized'),
        auditRef: buildAuditRef('draft_write', 'conflict'),
        formatMeta: buildFormatMeta(),
        currentRevision: result.current.revision,
      };
    },
  };
}
