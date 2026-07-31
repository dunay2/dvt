import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import {
  projectCanvasAuthoringDraftReadModel,
  type CanvasAuthoringDraftRecord,
  type CanvasAuthoringDraftReadModel,
} from './canvasDraftReadModel';

export type SaveCanvasDraftInput = {
  expectedRevision: string | null;
  idempotencyKey: string;
  draft: WorkspaceGraphAuthoringDraft;
};

export type CanvasDraftSaveResult =
  | {
      outcome: 'saved';
      record: CanvasAuthoringDraftRecord;
      remoteDraftState: CanvasAuthoringDraftReadModel;
    }
  | {
      outcome: 'conflict';
      current: CanvasAuthoringDraftRecord;
      remoteDraftState: CanvasAuthoringDraftReadModel;
    };

export interface CanvasDraftRepository {
  readGraphDraftState: () => Promise<CanvasAuthoringDraftReadModel>;
  readGraphDraft: () => Promise<CanvasAuthoringDraftRecord | null>;
  saveGraphDraft: (input: SaveCanvasDraftInput) => Promise<CanvasDraftSaveResult>;
}

const CONFLICT_RELOAD_ERROR =
  'Workspace graph draft conflict could not reload the current remote draft.';
const SAVED_RELOAD_ERROR =
  'Workspace graph draft save could not confirm the canonical remote revision.';

type NonRecoverableCanvasDraftSaveResult = Exclude<
  WorkspaceGraphDraftAuthoringSaveResult,
  { kind: 'saved' } | { kind: 'conflict' }
>;

async function resolveCanvasDraftConflictResult(
  readGraphDraftState: () => Promise<CanvasAuthoringDraftReadModel>
): Promise<CanvasDraftSaveResult> {
  let currentState: CanvasAuthoringDraftReadModel;

  try {
    currentState = await readGraphDraftState();
  } catch {
    throw new Error(CONFLICT_RELOAD_ERROR);
  }

  const currentRecord = currentState.record;
  if (currentRecord == null) {
    throw new Error(CONFLICT_RELOAD_ERROR);
  }

  return {
    outcome: 'conflict',
    current: currentRecord,
    remoteDraftState: currentState,
  };
}

async function resolveSavedCanvasDraftResult(
  revision: string,
  readGraphDraftState: () => Promise<CanvasAuthoringDraftReadModel>
): Promise<CanvasDraftSaveResult> {
  const remoteDraftState = await readGraphDraftState();
  const record = remoteDraftState.record;
  if (record === null || record.revision !== revision) {
    throw new Error(SAVED_RELOAD_ERROR);
  }

  return {
    outcome: 'saved',
    record,
    remoteDraftState,
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
  result: WorkspaceGraphDraftAuthoringSaveResult;
  readGraphDraftState: () => Promise<CanvasAuthoringDraftReadModel>;
}): Promise<CanvasDraftSaveResult> {
  const { result, readGraphDraftState } = args;

  if (result.kind === 'saved') {
    return resolveSavedCanvasDraftResult(result.revision, readGraphDraftState);
  }

  if (result.kind === 'conflict') {
    return resolveCanvasDraftConflictResult(readGraphDraftState);
  }

  return throwCanvasDraftSaveFailure(result);
}

export function createCanvasDraftRepository(
  workspaceGraphDraftAuthoringPort: IWorkspaceGraphDraftAuthoringPort
): CanvasDraftRepository {
  async function readGraphDraftState(): Promise<CanvasAuthoringDraftReadModel> {
    return projectCanvasAuthoringDraftReadModel(
      await workspaceGraphDraftAuthoringPort.readGraphDraft()
    );
  }

  async function readAuthoringDraftRecord(): Promise<CanvasAuthoringDraftRecord | null> {
    const draftState = await readGraphDraftState();
    if (draftState.formatError != null) {
      throw new Error(`Workspace graph draft read failed with ${draftState.formatError.reason}.`);
    }

    if (draftState.accessMode === 'forbidden') {
      throw new Error('Workspace graph draft read is forbidden for the current scope.');
    }

    return draftState.record;
  }

  return {
    readGraphDraftState,
    readGraphDraft: readAuthoringDraftRecord,
    saveGraphDraft: async (input) => {
      const result = await workspaceGraphDraftAuthoringPort.saveGraphDraft({
        expectedRevision: input.expectedRevision,
        idempotencyKey: input.idempotencyKey,
        draft: input.draft,
      });
      return resolveCanvasDraftSaveResult({
        result,
        readGraphDraftState,
      });
    },
  };
}
