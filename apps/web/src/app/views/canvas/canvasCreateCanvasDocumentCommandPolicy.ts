/** Owned concern: decide create-canvas document CAS eligibility and draft save input semantics. */
import { createCanvasDraftIdempotencyKey } from './canvasDraftIdempotencyKey';
import type { CanvasCreateCanvasDocumentCommandDto } from './canvasDraftLifecycle.types';

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
  }
}

export function buildBlankCanvasDocumentDraftInput({
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
