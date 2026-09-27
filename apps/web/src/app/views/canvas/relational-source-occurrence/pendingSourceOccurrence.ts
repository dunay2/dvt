/** A detached draft Read uses the same canonical identity and projection as a connected Read. */
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import { createCanvasInputRead } from '../canvasSourceRelation';
import { createSourceDocument } from '../canvasSourceDocument';
import { buildCanvasRelationalTreeRelation } from '../canvasRelationalTreeRelationProjection';
import type { DvtRelationalAuthoringDraftV1 } from '@dvt/contracts';

export type PendingSourceOccurrence = Readonly<{
  sourceNodeId: string;
  read: ReturnType<typeof createCanvasInputRead>;
}>;

export function createPendingSourceOccurrence(
  input: CanvasDvtCompositionInput
): PendingSourceOccurrence {
  return {
    sourceNodeId: input.nodeId,
    read: createCanvasInputRead(input, 1),
  };
}

export function restorePendingSourceOccurrence(
  input: CanvasDvtCompositionInput,
  source: DvtRelationalAuthoringDraftV1['sources'][number]
): PendingSourceOccurrence | null {
  const occurrence = createPendingSourceOccurrence(input);
  if (occurrence.read.fields.length !== source.fieldIds.length) return null;
  return {
    sourceNodeId: source.sourceNodeId,
    read: {
      ...occurrence.read,
      binding: {
        ...occurrence.read.binding,
        relationId: source.relationId,
        displayName: source.displayName,
      },
      fields: occurrence.read.fields.map((field, index) => ({
        ...field,
        relationId: source.relationId,
        fieldId: source.fieldIds[index]!,
      })),
    },
  };
}

export function projectPendingSourceOccurrence({ read }: PendingSourceOccurrence) {
  const result = indexSubstraitRelations(createSourceDocument([read], read));
  if (!result.ok) throw result.error;
  return buildCanvasRelationalTreeRelation({
    index: result.index,
    digest: read.binding.relationId,
  });
}
