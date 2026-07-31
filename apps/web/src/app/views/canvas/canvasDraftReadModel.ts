/** Owned concern: translate protected draft-authoring outcomes into the Canvas route read model and semantic graph handoff. */
import type {
  CanvasAuthoringAuthorityResolution,
  WorkspaceGraphAuthoringDraft,
  WorkspaceGraphDraftCapabilityMode,
  WorkspaceGraphDraftCapabilityReason,
  WorkspaceGraphDraftFormatError,
  WorkspaceGraphDraftFormatMeta,
  WorkspaceGraphDraftRecord as ProtectedWorkspaceGraphDraftRecord,
} from '@dvt/contracts';

import type { WorkspaceGraphDraftAuthoringReadResult } from '../../ports/workspaceGraphDraftAuthoring';
import {
  projectWorkspaceGraphAuthoringDraftSemanticGraph,
  type CanvasAuthoringSemanticGraph,
} from '../../services/workspace/workspaceGraphDraftProjection';

export type CanvasDraftAccessMode = WorkspaceGraphDraftCapabilityMode | 'unknown';

export type CanvasAuthoringCanvasDocument = WorkspaceGraphAuthoringDraft['canvas'];

export type CanvasAuthoringDraftRecord = {
  revision: string;
  draft: WorkspaceGraphAuthoringDraft;
  savedAt: string;
};

export type CanvasAuthoringDraftReadModel = {
  accessMode: CanvasDraftAccessMode;
  authoringAuthority: CanvasAuthoringAuthorityResolution;
  capabilityReason: WorkspaceGraphDraftCapabilityReason | null;
  formatError: WorkspaceGraphDraftFormatError | null;
  formatMeta: WorkspaceGraphDraftFormatMeta | null;
  record: CanvasAuthoringDraftRecord | null;
  semanticGraph: CanvasAuthoringSemanticGraph | null;
};

export function resolveGraphDraftAuthoringCanvasId(
  readModel: CanvasAuthoringDraftReadModel | undefined
): string | null {
  const authority = readModel?.authoringAuthority;
  return authority?.kind === 'resolved' && authority.binding.authority.kind === 'graph-draft'
    ? authority.binding.canvasId
    : null;
}

export function projectProtectedCanvasAuthoringDraftRecord(
  record: ProtectedWorkspaceGraphDraftRecord
): CanvasAuthoringDraftRecord {
  return {
    revision: record.revision,
    savedAt: record.updatedAt,
    draft: record.draft,
  };
}

export function createUnknownCanvasAuthoringDraftReadModel(
  record: CanvasAuthoringDraftRecord | null = null
): CanvasAuthoringDraftReadModel {
  return {
    accessMode: 'unknown',
    authoringAuthority: {
      kind: 'unresolved',
      reason: 'missing_authority',
      canvasId: record?.draft.activeCanvasId ?? record?.draft.canvas.id ?? null,
    },
    capabilityReason: null,
    formatError: null,
    formatMeta: null,
    record,
    semanticGraph: null,
  };
}

export function createWritableCanvasAuthoringDraftReadModel(
  record: CanvasAuthoringDraftRecord,
  authoringAuthority: CanvasAuthoringAuthorityResolution,
  semanticGraph: CanvasAuthoringSemanticGraph | null = null
): CanvasAuthoringDraftReadModel {
  return {
    accessMode: 'writable',
    authoringAuthority,
    capabilityReason: 'authorized',
    formatError: null,
    formatMeta: null,
    record,
    semanticGraph,
  };
}

export function projectCanvasAuthoringDraftReadModel(
  result: WorkspaceGraphDraftAuthoringReadResult
): CanvasAuthoringDraftReadModel {
  switch (result.kind) {
    case 'not_found':
      return createUnknownCanvasAuthoringDraftReadModel();
    case 'ok':
      return {
        accessMode: result.capability.mode,
        authoringAuthority: result.authoringAuthority,
        capabilityReason: result.capability.reason,
        formatError: null,
        formatMeta: result.formatMeta,
        record: projectProtectedCanvasAuthoringDraftRecord(result.record),
        semanticGraph: projectWorkspaceGraphAuthoringDraftSemanticGraph(result.record.draft),
      };
    case 'denied':
      return {
        accessMode: result.capability.mode,
        authoringAuthority: {
          kind: 'unresolved',
          reason: 'missing_authority',
          canvasId: null,
        },
        capabilityReason: result.capability.reason,
        formatError: null,
        formatMeta: null,
        record: null,
        semanticGraph: null,
      };
    case 'format_error':
      return {
        accessMode: result.capability.mode,
        authoringAuthority: {
          kind: 'unresolved',
          reason: 'missing_authority',
          canvasId: null,
        },
        capabilityReason: result.capability.reason,
        formatError: result.formatError,
        formatMeta: null,
        record: null,
        semanticGraph: null,
      };
  }
}
