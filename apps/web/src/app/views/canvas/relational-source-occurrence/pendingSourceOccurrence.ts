/** A detached draft Read uses the same canonical identity and projection as a connected Read. */
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import { createCanvasInputRead } from '../canvasSourceRelation';
import { createSourceDocument } from '../canvasSourceDocument';
import { buildCanvasRelationalTreeRelation } from '../canvasRelationalTreeRelationProjection';

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

export function projectPendingSourceOccurrence({ read }: PendingSourceOccurrence) {
  const result = indexSubstraitRelations(createSourceDocument([read], read));
  if (!result.ok) throw result.error;
  return buildCanvasRelationalTreeRelation({
    index: result.index,
    digest: read.binding.relationId,
  });
}
