import type {
  IWorkspacePort,
  SaveWorkspaceGraphDraftResult,
  WorkspaceGraphDraftRecord,
  WorkspaceGraphSnapshot,
} from '../../ports/workspace';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import { projectProtectedWorkspaceGraphDraftRecord } from '../../services/workspace/workspaceGraphDraftProjection';
import {
  buildCanvasDraftAuthoringGraph,
  type CanvasDraftAuthoringPayload,
} from './canvasDraftAuthoring';

type CanvasDraftWorkspacePort = Pick<
  IWorkspacePort,
  'getFileContent' | 'getGraphSnapshot'
>;

export type SaveCanvasDraftInput = {
  expectedRevision: string | null;
  idempotencyKey: string;
  draft: CanvasDraftAuthoringPayload;
};

export interface CanvasDraftRepository {
  readGraphDraft: () => Promise<WorkspaceGraphDraftRecord | null>;
  saveGraphDraft: (input: SaveCanvasDraftInput) => Promise<SaveWorkspaceGraphDraftResult>;
  readGraphSnapshot: () => Promise<WorkspaceGraphSnapshot>;
}

export function createCanvasDraftRepository(
  workspacePort: CanvasDraftWorkspacePort,
  workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort
): CanvasDraftRepository {
  async function readProjectedDraftRecord(): Promise<WorkspaceGraphDraftRecord | null> {
    const result = await workspaceGraphDraftAuthoringPort.readGraphDraft();
    if (result.kind === 'not_found') {
      return null;
    }

    if (result.kind !== 'ok') {
      throw new Error(`Workspace graph draft read failed with ${result.kind}.`);
    }

    return projectProtectedWorkspaceGraphDraftRecord(result.record);
  }

  return {
    readGraphDraft: readProjectedDraftRecord,
    saveGraphDraft: async (input) => {
      const authoringDraft = await buildCanvasDraftAuthoringGraph({
        workspaceService: workspacePort,
        payload: input.draft,
      });
      const result = await workspaceGraphDraftAuthoringPort.saveGraphDraft({
        expectedRevision: input.expectedRevision,
        idempotencyKey: input.idempotencyKey,
        draft: authoringDraft,
      });

      if (result.kind === 'saved') {
        return {
          outcome: 'saved',
          record: {
            revision: result.revision,
            savedAt: new Date().toISOString(),
            draft: input.draft.projectedDraft,
          },
        };
      }

      if (result.kind === 'conflict') {
        let currentRecord: WorkspaceGraphDraftRecord | null;
        try {
          currentRecord = await readProjectedDraftRecord();
        } catch {
          throw new Error('Workspace graph draft conflict could not reload the current remote draft.');
        }
        if (currentRecord == null) {
          throw new Error('Workspace graph draft conflict could not reload the current remote draft.');
        }

        return {
          outcome: 'conflict',
          current: currentRecord,
        };
      }

      if (result.kind === 'denied') {
        throw new Error('Workspace graph draft authoring is not writable for the current scope.');
      }

      if (result.kind === 'unsupported_schema_version') {
        throw new Error(
          `Workspace graph draft authoring rejected schema version; expected ${result.expectedSchemaVersion}.`
        );
      }

      throw new Error(
        'Workspace graph draft authoring rejected the idempotency key for a different payload.'
      );
    },
    readGraphSnapshot: () => workspacePort.getGraphSnapshot(),
  };
}
