import type {
  WorkspaceGraphDraftCapabilityMode,
  WorkspaceGraphDraftCapabilityReason,
  WorkspaceGraphDraftFormatError,
  WorkspaceGraphDraftFormatMeta,
} from '@dvt/contracts';

import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import type { WorkspaceGraphDraftAuthoringReadResult } from '../../ports/workspaceGraphDraftAuthoring';
import { projectProtectedWorkspaceGraphDraftRecord } from '../../services/workspace/workspaceGraphDraftProjection';

export type CanvasDraftAccessMode = WorkspaceGraphDraftCapabilityMode | 'unknown';

export type CanvasDraftReadModel = {
  accessMode: CanvasDraftAccessMode;
  capabilityReason: WorkspaceGraphDraftCapabilityReason | null;
  formatError: WorkspaceGraphDraftFormatError | null;
  formatMeta: WorkspaceGraphDraftFormatMeta | null;
  record: WorkspaceGraphDraftRecord | null;
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
  };
}

export function createWritableCanvasDraftReadModel(
  record: WorkspaceGraphDraftRecord
): CanvasDraftReadModel {
  return {
    accessMode: 'writable',
    capabilityReason: 'authorized',
    formatError: null,
    formatMeta: null,
    record,
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
      };
    case 'denied':
      return {
        accessMode: result.capability.mode,
        capabilityReason: result.capability.reason,
        formatError: null,
        formatMeta: null,
        record: null,
      };
    case 'format_error':
      return {
        accessMode: result.capability.mode,
        capabilityReason: result.capability.reason,
        formatError: result.formatError,
        formatMeta: null,
        record: null,
      };
  }
}
