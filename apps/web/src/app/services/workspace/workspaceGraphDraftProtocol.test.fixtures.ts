/** Owned concern: build protected workspace graph draft protocol envelope fixtures. */
import type {
  WorkspaceGraphDraftAuditAction,
  WorkspaceGraphDraftAuditOutcome,
  WorkspaceGraphDraftCapabilityMode,
  WorkspaceGraphDraftCapabilityOutcome,
  WorkspaceGraphDraftCapabilityReason,
  WorkspaceGraphDraftReadResponse,
  WorkspaceGraphDraftSaveResponse,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import { buildProtectedDraftRecord } from './workspaceGraphDraftAuthoring.test.fixtures';

type DraftCapabilityOverrides = Partial<
  Pick<WorkspaceGraphDraftCapabilityOutcome, 'mode' | 'canRead' | 'canWrite' | 'reason'>
>;

function buildDraftCapability(
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

function buildDraftAuditRef(
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

function buildDraftFormatMeta() {
  return {
    schemaVersion: 'workspace-graph-draft.v1',
    storedSchemaVersion: 'workspace-graph-draft.v1',
    migrationState: 'native' as const,
  };
}

export function buildDraftReadOkResponse(
  scope: WorkspaceGraphDraftScope,
  overrides: Partial<WorkspaceGraphDraftReadResponse & { kind: 'ok' }> = {}
): WorkspaceGraphDraftReadResponse {
  const record = overrides.record ?? buildProtectedDraftRecord(scope);
  const canvasId = record.draft.activeCanvasId ?? record.draft.canvas.id ?? null;
  return {
    kind: 'ok',
    capability: buildDraftCapability(scope),
    auditRef: buildDraftAuditRef('draft_read', 'allowed'),
    formatMeta: buildDraftFormatMeta(),
    authoringAuthority:
      canvasId === null
        ? { kind: 'unresolved', reason: 'missing_authority', canvasId: null }
        : {
            kind: 'resolved',
            binding: {
              schemaVersion: 'canvas-authoring-authority-binding.v1',
              canvasId,
              authority: { kind: 'graph-draft' },
            },
          },
    record,
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

export function buildDraftReadNotFoundResponse(
  scope: WorkspaceGraphDraftScope
): WorkspaceGraphDraftReadResponse {
  return {
    kind: 'not_found',
    capability: buildDraftCapability(scope),
    auditRef: buildDraftAuditRef('draft_read', 'allowed'),
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

export function buildDraftSaveUnsupportedSchemaResponse(
  scope: WorkspaceGraphDraftScope
): WorkspaceGraphDraftSaveResponse {
  return {
    kind: 'unsupported_schema_version',
    capability: buildDraftCapability(scope),
    auditRef: buildDraftAuditRef('draft_write', 'allowed'),
    expectedSchemaVersion: 'workspace-graph-draft.v1',
    requestedSchemaVersion: 'workspace-graph-draft.v0',
  };
}

export function buildDraftSaveIdempotencyMismatchResponse(
  scope: WorkspaceGraphDraftScope
): WorkspaceGraphDraftSaveResponse {
  return {
    kind: 'idempotency_mismatch',
    capability: buildDraftCapability(scope),
    auditRef: buildDraftAuditRef('draft_write', 'conflict'),
  };
}
