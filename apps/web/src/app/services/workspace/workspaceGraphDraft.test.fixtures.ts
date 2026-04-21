import type {
  WorkspaceGraphDraftAuditAction,
  WorkspaceGraphDraftAuditOutcome,
  WorkspaceGraphDraftCapabilityMode,
  WorkspaceGraphDraftCapabilityOutcome,
  WorkspaceGraphDraftCapabilityReason,
  WorkspaceGraphDraftReadResponse,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
  WorkspaceGraphDraftSaveResponse,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { WorkspaceGraphDraft, WorkspaceGraphDraftRecord } from '../../ports/workspace';
import { projectDesignGraphDraft } from './workspaceGraphDraftProjection';
import type { WorkspaceScope } from './workspaceScope.test.harness';

type DraftCapabilityOverrides = Partial<
  Pick<WorkspaceGraphDraftCapabilityOutcome, 'mode' | 'canRead' | 'canWrite' | 'reason'>
>;

export function buildWorkspaceGraphDraftEndpoint(scope: WorkspaceScope): string {
  const query = new URLSearchParams(scope);
  return `/workspace/graph/draft?${query.toString()}`;
}

export function buildPresentationGraphDraft(
  overrides: Partial<WorkspaceGraphDraft> = {}
): WorkspaceGraphDraft {
  return {
    nodeIds: ['node_1'],
    nodePositions: { node_1: { x: 10, y: 20 } },
    edges: [],
    ...overrides,
  };
}

export function buildDraftCapability(
  scope: WorkspaceGraphDraftScope,
  overrides: DraftCapabilityOverrides = {}
): WorkspaceGraphDraftCapabilityOutcome {
  const mode = overrides.mode ?? ('writable' satisfies WorkspaceGraphDraftCapabilityMode);
  const defaultsByMode: Record<
    WorkspaceGraphDraftCapabilityMode,
    {
      canRead: boolean;
      canWrite: boolean;
      reason: WorkspaceGraphDraftCapabilityReason;
    }
  > = {
    writable: {
      canRead: true,
      canWrite: true,
      reason: 'authorized',
    },
    read_only: {
      canRead: true,
      canWrite: false,
      reason: 'write_denied',
    },
    forbidden: {
      canRead: false,
      canWrite: false,
      reason: 'workspace_scope_denied',
    },
  };
  const defaults = defaultsByMode[mode];

  return {
    scope,
    mode,
    canRead: overrides.canRead ?? defaults.canRead,
    canWrite: overrides.canWrite ?? defaults.canWrite,
    reason: overrides.reason ?? defaults.reason,
  };
}

export function buildDraftAuditRef(
  action: WorkspaceGraphDraftAuditAction,
  outcome: WorkspaceGraphDraftAuditOutcome
) {
  return {
    correlationId: 'corr-1',
    decisionId: 'dec-1',
    action,
    outcome,
    recordedAt: '2026-04-18T00:00:00.000Z',
  };
}

export function buildDraftFormatMeta() {
  return {
    schemaVersion: 'workspace-graph-draft.v1',
    storedSchemaVersion: 'workspace-graph-draft.v1',
    migrationState: 'native' as const,
  };
}

export function buildProtectedDraftRecord(
  scope: WorkspaceGraphDraftScope,
  overrides: Partial<ProtectedWorkspaceGraphDraftRecord> = {}
): ProtectedWorkspaceGraphDraftRecord {
  const baseRecord: ProtectedWorkspaceGraphDraftRecord = {
    scope,
    schemaVersion: 'workspace-graph-draft.v1',
    revision: 'rev-1',
    draft: {
      context: {
        tenantId: scope.tenantId,
        projectId: scope.projectId,
        environmentId: scope.environmentId,
        executionTarget: 'postgres',
      },
      nodes: [
        {
          id: 'source_node',
          type: 'source',
          payload: {
            kind: 'postgres_table',
            schema: 'raw',
            table: 'orders',
            alias: 'orders',
          },
        },
        {
          id: 'transform_node',
          type: 'sql_transform',
          payload: {
            dialect: 'postgres',
            sqlArtifact: {
              repo: 'repo',
              path: 'models/transform.sql',
              ref: 'main',
              commitSha: 'abc123',
              contentSha256: 'a'.repeat(64),
            },
            entrypoint: 'models/transform.sql',
          },
        },
        {
          id: 'sink_node',
          type: 'sink',
          payload: {
            kind: 'postgres_table',
            schema: 'analytics',
            table: 'orders_final',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      ],
      edges: [
        { fromNodeId: 'source_node', toNodeId: 'transform_node' },
        { fromNodeId: 'transform_node', toNodeId: 'sink_node' },
      ],
    },
    updatedAt: '2026-04-18T01:00:00.000Z',
  };

  return {
    ...baseRecord,
    ...overrides,
    scope: overrides.scope ?? baseRecord.scope,
  };
}

export function buildDraftReadOkResponse(
  scope: WorkspaceGraphDraftScope,
  overrides: Partial<WorkspaceGraphDraftReadResponse & { kind: 'ok' }> = {}
): WorkspaceGraphDraftReadResponse {
  return {
    kind: 'ok',
    capability: buildDraftCapability(scope),
    auditRef: buildDraftAuditRef('draft_read', 'allowed'),
    formatMeta: buildDraftFormatMeta(),
    record: buildProtectedDraftRecord(scope),
    ...overrides,
  };
}

export function buildDraftReadDeniedResponse(
  scope: WorkspaceGraphDraftScope,
  overrides: Partial<WorkspaceGraphDraftReadResponse & { kind: 'denied' }> = {}
): WorkspaceGraphDraftReadResponse {
  return {
    kind: 'denied',
    capability: buildDraftCapability(scope, { mode: 'forbidden' }),
    auditRef: buildDraftAuditRef('draft_read', 'forbidden'),
    ...overrides,
  };
}

export function buildDraftSaveSavedResponse(
  scope: WorkspaceGraphDraftScope,
  overrides: Partial<WorkspaceGraphDraftSaveResponse & { kind: 'saved' }> = {}
): WorkspaceGraphDraftSaveResponse {
  return {
    kind: 'saved',
    capability: buildDraftCapability(scope),
    auditRef: buildDraftAuditRef('draft_write', 'allowed'),
    formatMeta: buildDraftFormatMeta(),
    revision: 'rev-2',
    ...overrides,
  };
}

export function buildDraftSaveConflictResponse(
  scope: WorkspaceGraphDraftScope,
  overrides: Partial<WorkspaceGraphDraftSaveResponse & { kind: 'conflict' }> = {}
): WorkspaceGraphDraftSaveResponse {
  return {
    kind: 'conflict',
    capability: buildDraftCapability(scope),
    auditRef: buildDraftAuditRef('draft_write', 'conflict'),
    formatMeta: buildDraftFormatMeta(),
    currentRevision: 'rev-current',
    ...overrides,
  };
}

export function buildDraftSaveDeniedResponse(
  scope: WorkspaceGraphDraftScope,
  overrides: Partial<WorkspaceGraphDraftSaveResponse & { kind: 'denied' }> = {}
): WorkspaceGraphDraftSaveResponse {
  return {
    kind: 'denied',
    capability: buildDraftCapability(scope, { mode: 'read_only' }),
    auditRef: buildDraftAuditRef('draft_write', 'read_only'),
    ...overrides,
  };
}

export function buildProjectedDraftRecord(
  overrides: Partial<WorkspaceGraphDraftRecord> = {}
): WorkspaceGraphDraftRecord {
  const protectedRecord = buildProtectedDraftRecord({
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'dev',
  });
  return {
    revision: 'rev-1',
    savedAt: '2026-04-18T01:00:00.000Z',
    draft: projectDesignGraphDraft(protectedRecord.draft),
    ...overrides,
  };
}
