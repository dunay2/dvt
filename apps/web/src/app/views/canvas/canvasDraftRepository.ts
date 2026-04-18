import type {
  IWorkspacePort,
  SaveWorkspaceGraphDraftInput,
  SaveWorkspaceGraphDraftResult,
  WorkspaceGraphDraftRecord,
  WorkspaceGraphSnapshot,
} from '../../ports/workspace';

type CanvasDraftWorkspacePort = Pick<
  IWorkspacePort,
  'getGraphDraft' | 'saveGraphDraft' | 'getGraphSnapshot'
>;

export interface CanvasDraftRepository {
  readGraphDraft: () => Promise<WorkspaceGraphDraftRecord | null>;
  saveGraphDraft: (
    input: SaveWorkspaceGraphDraftInput
  ) => Promise<SaveWorkspaceGraphDraftResult>;
  readGraphSnapshot: () => Promise<WorkspaceGraphSnapshot>;
}

export function createCanvasDraftRepository(
  workspacePort: CanvasDraftWorkspacePort
): CanvasDraftRepository {
  return {
    readGraphDraft: () => workspacePort.getGraphDraft(),
    saveGraphDraft: (input) => workspacePort.saveGraphDraft(input),
    readGraphSnapshot: () => workspacePort.getGraphSnapshot(),
  };
}
