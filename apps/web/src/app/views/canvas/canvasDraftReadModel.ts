/** Owned concern: translate protected draft-authoring outcomes into the Canvas route read model and semantic graph handoff. */
import type {
  WorkspaceGraphDraftCapabilityMode,
  WorkspaceGraphDraftCapabilityReason,
  WorkspaceGraphDraftFormatError,
  WorkspaceGraphDraftFormatMeta,
} from '@dvt/contracts';

import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import type { WorkspaceGraphDraftAuthoringReadResult } from '../../ports/workspaceGraphDraftAuthoring';
import {
  projectWorkspaceGraphAuthoringDraftSemanticGraph,
  projectProtectedWorkspaceGraphDraftRecord,
  type WorkspaceGraphDraftSemanticGraph,
} from '../../services/workspace/workspaceGraphDraftProjection';

export type CanvasDraftAccessMode = WorkspaceGraphDraftCapabilityMode | 'unknown';

export type CanvasDraftReadModel = {
  accessMode: CanvasDraftAccessMode;
  capabilityReason: WorkspaceGraphDraftCapabilityReason | null;
  formatError: WorkspaceGraphDraftFormatError | null;
  formatMeta: WorkspaceGraphDraftFormatMeta | null;
  record: WorkspaceGraphDraftRecord | null;
  semanticGraph: WorkspaceGraphDraftSemanticGraph | null;
};

export function createUnknownCanvasDraftReadModel(
  record: WorkspaceGraphDraftRecord | null = null
): CanvasDraftReadModel {
  return {
    accessMode: 'unknown',
    capabilityReason: null,
    formatError: null,
    formatMeta: null,
    record,
    semanticGraph: null,
  };
}

export function createWritableCanvasDraftReadModel(
  record: WorkspaceGraphDraftRecord,
  semanticGraph: WorkspaceGraphDraftSemanticGraph | null = null
): CanvasDraftReadModel {
  return {
    accessMode: 'writable',
    capabilityReason: 'authorized',
    formatError: null,
    formatMeta: null,
    record,
    semanticGraph,
  };
}

export function projectCanvasDraftReadModel(
  result: WorkspaceGraphDraftAuthoringReadResult
): CanvasDraftReadModel {
  switch (result.kind) {
    case 'not_found':
      return createUnknownCanvasDraftReadModel();
    case 'ok':
      return {
        accessMode: result.capability.mode,
        capabilityReason: result.capability.reason,
        formatError: null,
        formatMeta: result.formatMeta,
        record: projectProtectedWorkspaceGraphDraftRecord(result.record),
        semanticGraph: projectWorkspaceGraphAuthoringDraftSemanticGraph(result.record.draft),
      };
    case 'denied':
      return {
        accessMode: result.capability.mode,
        capabilityReason: result.capability.reason,
        formatError: null,
        formatMeta: null,
        record: null,
        semanticGraph: null,
      };
    case 'format_error':
      return {
        accessMode: result.capability.mode,
        capabilityReason: result.capability.reason,
        formatError: result.formatError,
        formatMeta: null,
        record: null,
        semanticGraph: null,
      };
  }
}
