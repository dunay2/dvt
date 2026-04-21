import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import type {
  IWorkspacePort,
  SaveWorkspaceGraphDraftResult,
  WorkspaceGraphDraftRecord,
  WorkspaceGraphSnapshot,
} from '../../ports/workspace';
import {
  buildCanvasDraftAuthoringGraph,
  type CanvasDraftAuthoringPayload,
} from './canvasDraftAuthoring';
import {
  projectCanvasDraftReadModel,
  type CanvasDraftReadModel,
} from './canvasDraftReadModel';

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
  readGraphDraftState: () => Promise<CanvasDraftReadModel>;
  readGraphDraft: () => Promise<WorkspaceGraphDraftRecord | null>;
  saveGraphDraft: (input: SaveCanvasDraftInput) => Promise<SaveWorkspaceGraphDraftResult>;
  readGraphSnapshot: () => Promise<WorkspaceGraphSnapshot>;
}

const CONFLICT_RELOAD_ERROR =
  'Workspace graph draft conflict could not reload the current remote draft.';

type NonRecoverableCanvasDraftSaveResult = Exclude<
  WorkspaceGraphDraftAuthoringSaveResult,
  { kind: 'saved' } | { kind: 'conflict' }
>;

function buildSavedCanvasDraftResult(args: {
  input: SaveCanvasDraftInput;
  revision: string;
}): SaveWorkspaceGraphDraftResult {
  const { input, revision } = args;

  return {
    outcome: 'saved',
    record: {
      revision,
      savedAt: new Date().toISOString(),
      draft: input.draft.projectedDraft,
    },
  };
}

async function resolveCanvasDraftConflictResult(
  readProjectedDraftRecord: () => Promise<WorkspaceGraphDraftRecord | null>
): Promise<SaveWorkspaceGraphDraftResult> {
  let currentRecord: WorkspaceGraphDraftRecord | null;

  try {
    currentRecord = await readProjectedDraftRecord();
  } catch {
    throw new Error(CONFLICT_RELOAD_ERROR);
  }

  if (currentRecord == null) {
    throw new Error(CONFLICT_RELOAD_ERROR);
  }

  return {
    outcome: 'conflict',
    current: currentRecord,
  };
}

function throwCanvasDraftSaveFailure(result: NonRecoverableCanvasDraftSaveResult): never {
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
}

async function resolveCanvasDraftSaveResult(args: {
  input: SaveCanvasDraftInput;
  result: WorkspaceGraphDraftAuthoringSaveResult;
  readProjectedDraftRecord: () => Promise<WorkspaceGraphDraftRecord | null>;
}): Promise<SaveWorkspaceGraphDraftResult> {
  const { input, result, readProjectedDraftRecord } = args;

  if (result.kind === 'saved') {
    return buildSavedCanvasDraftResult({
      input,
      revision: result.revision,
    });
  }

  if (result.kind === 'conflict') {
    return resolveCanvasDraftConflictResult(readProjectedDraftRecord);
  }

  return throwCanvasDraftSaveFailure(result);
}

export function createCanvasDraftRepository(
  workspacePort: CanvasDraftWorkspacePort,
  workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort
): CanvasDraftRepository {
  async function readGraphDraftState(): Promise<CanvasDraftReadModel> {
    return projectCanvasDraftReadModel(await workspaceGraphDraftAuthoringPort.readGraphDraft());
  }

  async function readProjectedDraftRecord(): Promise<WorkspaceGraphDraftRecord | null> {
    const draftState = await readGraphDraftState();
    if (draftState.formatError != null) {
      throw new Error(
        `Workspace graph draft read failed with ${draftState.formatError.reason}.`
      );
    }

    if (draftState.accessMode === 'forbidden') {
      throw new Error('Workspace graph draft read is forbidden for the current scope.');
    }

    return draftState.record;
  }

  return {
    readGraphDraftState,
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
      return resolveCanvasDraftSaveResult({
        input,
        result,
        readProjectedDraftRecord,
      });
    },
    readGraphSnapshot: () => workspacePort.getGraphSnapshot(),
  };
}
