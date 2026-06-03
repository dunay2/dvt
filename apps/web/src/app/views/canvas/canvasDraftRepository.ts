import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import {
  projectWorkspaceGraphAuthoringDraftSemanticGraph,
  type CanvasAuthoringSemanticGraph,
} from '../../services/workspace/workspaceGraphDraftProjection';
import {
  createWritableCanvasAuthoringDraftReadModel,
  projectCanvasAuthoringDraftReadModel,
  type CanvasAuthoringDraftRecord,
  type CanvasAuthoringDraftReadModel,
} from './canvasDraftReadModel';
import { toCanvasAuthoringMetadata } from './canvasAuthoringMetadata';

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

type NonRecoverableCanvasDraftSaveResult = Exclude<
  WorkspaceGraphDraftAuthoringSaveResult,
  { kind: 'saved' } | { kind: 'conflict' }
>;

function cloneSemanticGraph(
  semanticGraph: CanvasAuthoringSemanticGraph
): CanvasAuthoringSemanticGraph {
  return {
    canonicalNodes: semanticGraph.canonicalNodes.map((node) => ({
      ...node,
      tags: [...node.tags],
      metadata: toCanvasAuthoringMetadata(node.metadata),
    })),
    canonicalEdges: semanticGraph.canonicalEdges.map((edge) => ({
      ...edge,
      metadata: toCanvasAuthoringMetadata(edge.metadata),
    })),
  };
}

function buildSavedCanvasDraftResult(args: {
  input: SaveCanvasDraftInput;
  revision: string;
}): CanvasDraftSaveResult {
  const { input, revision } = args;
  const record = {
    revision,
    savedAt: new Date().toISOString(),
    draft: input.draft,
  };

  return {
    outcome: 'saved',
    record,
    remoteDraftState: createWritableCanvasAuthoringDraftReadModel(
      record,
      cloneSemanticGraph(projectWorkspaceGraphAuthoringDraftSemanticGraph(input.draft))
    ),
  };
}

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
  readGraphDraftState: () => Promise<CanvasAuthoringDraftReadModel>;
}): Promise<CanvasDraftSaveResult> {
  const { input, result, readGraphDraftState } = args;

  if (result.kind === 'saved') {
    return buildSavedCanvasDraftResult({
      input,
      revision: result.revision,
    });
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
        input,
        result,
        readGraphDraftState,
      });
    },
  };
}
