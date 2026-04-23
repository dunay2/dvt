/**
 * Owned concern: define the web-facing authoring port for protected workspace
 * graph draft read/write outcomes.
 *
 * The port preserves boundary-native read/save envelopes before Canvas projects
 * them into route-local state. It does not own React Flow state, local cache
 * mutation, or compile projection.
 */
import type {
  WorkspaceGraphAuthoringDraft,
  WorkspaceGraphDraftReadResponse,
  WorkspaceGraphDraftSaveResponse,
} from '@dvt/contracts';

export type WorkspaceGraphDraftAuthoringReadResult =
  | WorkspaceGraphDraftReadResponse
  | {
      readonly kind: 'not_found';
    };

export type SaveWorkspaceGraphDraftAuthoringInput = {
  readonly expectedRevision: string | null;
  readonly idempotencyKey: string;
  readonly draft: WorkspaceGraphAuthoringDraft;
};

export type WorkspaceGraphDraftAuthoringSaveResult =
  | WorkspaceGraphDraftSaveResponse
  | {
      readonly kind: 'unsupported_schema_version';
      readonly expectedSchemaVersion: string;
    }
  | {
      readonly kind: 'idempotency_mismatch';
    };

export interface IWorkspaceGraphDraftAuthoringPort {
  readGraphDraft: () => Promise<WorkspaceGraphDraftAuthoringReadResult>;
  saveGraphDraft: (
    input: SaveWorkspaceGraphDraftAuthoringInput
  ) => Promise<WorkspaceGraphDraftAuthoringSaveResult>;
}
