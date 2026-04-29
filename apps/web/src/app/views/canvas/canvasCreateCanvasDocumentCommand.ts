/** Owned concern: persist first or explicitly replaced typed canvas documents through authoritative draft CAS save semantics. */
import { canvasDraftSession } from './canvasDraftSession';
import { serializeCanvasDraftAuthoringSignature } from './canvasDraftAuthoring';
import { createCanvasDraftIdempotencyKey } from './canvasDraftIdempotencyKey';
import type { CanvasCreateCanvasDocumentCommandDto } from './canvasDraftLifecycle.types';

type CanvasCreateCanvasDocumentCommandEligibility =
  | {
      kind: 'blocked';
    }
  | {
      kind: 'ready';
      expectedRevision: string | null;
    };

type SaveGraphDraftInput = Parameters<
  CanvasCreateCanvasDocumentCommandDto['draftRepository']['saveGraphDraft']
>[0];

type SaveGraphDraftResult = Awaited<
  ReturnType<CanvasCreateCanvasDocumentCommandDto['draftRepository']['saveGraphDraft']>
>;

type SavedGraphDraftResult = Extract<SaveGraphDraftResult, { outcome: 'saved' }>;
type ConflictedGraphDraftResult = Extract<SaveGraphDraftResult, { outcome: 'conflict' }>;
type ExistingGraphDraftRecord = NonNullable<
  NonNullable<CanvasCreateCanvasDocumentCommandDto['graphDraftQuery']['data']>['record']
>;
type ExistingGraphDraftRecordOrNull = ExistingGraphDraftRecord | null;

function resolveCreateFirstCanvasDocumentEligibility(
  existingRecord: ExistingGraphDraftRecordOrNull
): CanvasCreateCanvasDocumentCommandEligibility {
  if (existingRecord != null) {
    return { kind: 'blocked' };
  }

  return { kind: 'ready', expectedRevision: null };
}

function resolveReplaceCurrentCanvasDocumentEligibility(
  existingRecord: ExistingGraphDraftRecordOrNull
): CanvasCreateCanvasDocumentCommandEligibility {
  if (existingRecord == null) {
    return { kind: 'blocked' };
  }

  return { kind: 'ready', expectedRevision: existingRecord.revision };
}

function resolveCreateCanvasDocumentCommandEligibility({
  command,
  graphDraftQuery,
  canPersistGraphDraft,
}: Pick<
  CanvasCreateCanvasDocumentCommandDto,
  'command' | 'graphDraftQuery' | 'canPersistGraphDraft'
>): CanvasCreateCanvasDocumentCommandEligibility {
  if (!canPersistGraphDraft) {
    return { kind: 'blocked' };
  }

  if (graphDraftQuery.isPending || graphDraftQuery.isError) {
    return { kind: 'blocked' };
  }

  const existingRecord = graphDraftQuery.data?.record ?? null;
  const commandMode = command.mode ?? 'create_first';

  switch (commandMode) {
    case 'create_first':
      return resolveCreateFirstCanvasDocumentEligibility(existingRecord);
    case 'replace_current':
      return resolveReplaceCurrentCanvasDocumentEligibility(existingRecord);
  }
}

function buildBlankCanvasDocumentDraftInput({
  command,
  expectedRevision,
  workspaceScope,
  previewProvenanceConfig,
}: Pick<
  CanvasCreateCanvasDocumentCommandDto,
  'command' | 'workspaceScope' | 'previewProvenanceConfig'
> & {
  expectedRevision: string | null;
}): SaveGraphDraftInput {
  return {
    expectedRevision,
    idempotencyKey: createCanvasDraftIdempotencyKey(),
    draft: {
      projectedDraft: {
        canvas: {
          kind: command.kind,
          title: command.title,
        },
        nodeIds: [],
        nodePositions: {},
        edges: [],
      },
      canonicalNodes: [],
      canonicalEdges: [],
      workspaceScope,
      previewProvenanceConfig,
    },
  };
}

function applyCanvasDocumentSaveSuccess({
  result,
  draftQueryCache,
  setDraftSession,
  setDraftSaveStatus,
  lastSavedSignatureRef,
}: Pick<
  CanvasCreateCanvasDocumentCommandDto,
  'draftQueryCache' | 'setDraftSession' | 'setDraftSaveStatus' | 'lastSavedSignatureRef'
> & {
  result: SavedGraphDraftResult;
}): void {
  lastSavedSignatureRef.current = serializeCanvasDraftAuthoringSignature({
    projectedDraft: result.record.draft,
    canonicalNodes: [],
    canonicalEdges: [],
  });
  draftQueryCache.replaceRemoteDraftState(result.remoteDraftState);
  setDraftSession((currentSession) =>
    canvasDraftSession.machine.applySaveSuccess(currentSession, result.record)
  );
  setDraftSaveStatus('saved');
}

function applyCanvasDocumentSaveConflict({
  result,
  draftQueryCache,
  setDraftSession,
  setDraftSaveStatus,
}: Pick<
  CanvasCreateCanvasDocumentCommandDto,
  'draftQueryCache' | 'setDraftSession' | 'setDraftSaveStatus'
> & {
  result: ConflictedGraphDraftResult;
}): void {
  draftQueryCache.replaceRemoteDraftState(result.remoteDraftState);
  setDraftSession((currentSession) =>
    canvasDraftSession.machine.applyConflict(currentSession, result.current)
  );
  setDraftSaveStatus('idle');
}

export async function executeCreateCanvasDocumentCommand({
  command,
  draftRepository,
  graphDraftQuery,
  draftQueryCache,
  canPersistGraphDraft,
  setDraftSession,
  setDraftSaveStatus,
  lastSavedSignatureRef,
  workspaceScope,
  previewProvenanceConfig,
}: CanvasCreateCanvasDocumentCommandDto): Promise<void> {
  const eligibility = resolveCreateCanvasDocumentCommandEligibility({
    command,
    graphDraftQuery,
    canPersistGraphDraft,
  });
  if (eligibility.kind === 'blocked') {
    return;
  }

  setDraftSaveStatus('saving');

  try {
    const result = await draftRepository.saveGraphDraft(
      buildBlankCanvasDocumentDraftInput({
        command,
        expectedRevision: eligibility.expectedRevision,
        workspaceScope,
        previewProvenanceConfig,
      })
    );

    if (result.outcome === 'saved') {
      applyCanvasDocumentSaveSuccess({
        result,
        draftQueryCache,
        setDraftSession,
        setDraftSaveStatus,
        lastSavedSignatureRef,
      });
      return;
    }

    applyCanvasDocumentSaveConflict({
      result,
      draftQueryCache,
      setDraftSession,
      setDraftSaveStatus,
    });
  } catch {
    setDraftSaveStatus('idle');
  }
}
