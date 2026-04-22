import type {
  IWorkspaceGraphDraftAuthoringPort,
  WorkspaceGraphDraftAuthoringSaveResult,
} from '../../ports/workspaceGraphDraftAuthoring';
import type {
  IWorkspacePort,
  WorkspaceGraphDraftRecord,
} from '../../ports/workspace';
import {
  buildCanvasDraftAuthoringGraph,
  type CanvasDraftAuthoringPayload,
} from './canvasDraftAuthoring';
import {
  createWritableCanvasDraftReadModel,
  projectCanvasDraftReadModel,
  type CanvasDraftReadModel,
} from './canvasDraftReadModel';
import type { WorkspaceGraphDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';

type CanvasDraftWorkspacePort = Pick<IWorkspacePort, 'getFileContent'>;

export type SaveCanvasDraftInput = {
  expectedRevision: string | null;
  idempotencyKey: string;
  draft: CanvasDraftAuthoringPayload;
};

export type CanvasDraftSaveResult =
  | {
      outcome: 'saved';
      record: WorkspaceGraphDraftRecord;
      remoteDraftState: CanvasDraftReadModel;
    }
  | {
      outcome: 'conflict';
      current: WorkspaceGraphDraftRecord;
      remoteDraftState: CanvasDraftReadModel;
    };

export interface CanvasDraftRepository {
  readGraphDraftState: () => Promise<CanvasDraftReadModel>;
  readGraphDraft: () => Promise<WorkspaceGraphDraftRecord | null>;
  saveGraphDraft: (input: SaveCanvasDraftInput) => Promise<CanvasDraftSaveResult>;
}

const CONFLICT_RELOAD_ERROR =
  'Workspace graph draft conflict could not reload the current remote draft.';

type NonRecoverableCanvasDraftSaveResult = Exclude<
  WorkspaceGraphDraftAuthoringSaveResult,
  { kind: 'saved' } | { kind: 'conflict' }
>;

function cloneSemanticGraph(
  semanticGraph: WorkspaceGraphDraftSemanticGraph
): WorkspaceGraphDraftSemanticGraph {
  return {
    canonicalNodes: semanticGraph.canonicalNodes.map((node) => ({
      ...node,
      tags: [...node.tags],
      metadata: node.metadata == null ? undefined : { ...node.metadata },
    })),
    canonicalEdges: semanticGraph.canonicalEdges.map((edge) => ({
      ...edge,
      metadata: edge.metadata == null ? undefined : { ...edge.metadata },
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
    draft: input.draft.projectedDraft,
  };

  return {
    outcome: 'saved',
    record,
    remoteDraftState: createWritableCanvasDraftReadModel(
      record,
      cloneSemanticGraph({
        canonicalNodes: [...input.draft.canonicalNodes],
        canonicalEdges: [...input.draft.canonicalEdges],
      })
    ),
  };
}

async function resolveCanvasDraftConflictResult(
  readGraphDraftState: () => Promise<CanvasDraftReadModel>
): Promise<CanvasDraftSaveResult> {
  let currentState: CanvasDraftReadModel;

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
  readGraphDraftState: () => Promise<CanvasDraftReadModel>;
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
        readGraphDraftState,
      });
    },
  };
}
