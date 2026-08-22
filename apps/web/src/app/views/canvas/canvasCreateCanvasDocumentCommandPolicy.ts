/** Owned concern: decide create-canvas document CAS eligibility and draft save input semantics. */
import { createBrowserIdempotencyKey } from '../../services/idempotency/createBrowserIdempotencyKey';
import type { CanvasCreateCanvasDocumentCommandDto } from './canvasDraftLifecycle.types';
import {
  buildDraftWithCreatedProjectCanvas,
  buildInitialProjectCanvasDraft,
} from './canvasProjectCanvasLifecycle';

export type CanvasCreateCanvasDocumentCommandEligibility =
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

function resolveCreateNewCanvasDocumentEligibility(
  existingRecord: ExistingGraphDraftRecordOrNull
): CanvasCreateCanvasDocumentCommandEligibility {
  if (existingRecord == null) {
    return { kind: 'blocked' };
  }

  return { kind: 'ready', expectedRevision: existingRecord.revision };
}

export function resolveCreateCanvasDocumentCommandEligibility({
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
    case 'create_new':
      return resolveCreateNewCanvasDocumentEligibility(existingRecord);
  }
}

export function buildBlankCanvasDocumentDraftInput({
  command,
  expectedRevision,
}: Pick<CanvasCreateCanvasDocumentCommandDto, 'command'> & {
  expectedRevision: string | null;
}): SaveGraphDraftInput {
  return {
    expectedRevision,
    idempotencyKey: createBrowserIdempotencyKey('canvas-draft'),
    draft: buildInitialProjectCanvasDraft(command),
  };
}

export function buildCreateCanvasDocumentDraftInput({
  command,
  currentDraftPayload,
  expectedRevision,
}: Pick<CanvasCreateCanvasDocumentCommandDto, 'command' | 'currentDraftPayload'> & {
  expectedRevision: string | null;
}): SaveGraphDraftInput {
  if (command.mode === 'create_new') {
    return {
      expectedRevision,
      idempotencyKey: createBrowserIdempotencyKey('canvas-draft'),
      draft: buildDraftWithCreatedProjectCanvas({
        currentDraft: currentDraftPayload,
        command,
      }),
    };
  }

  return buildBlankCanvasDocumentDraftInput({
    command,
    expectedRevision,
  });
}
