/** Owns routing card output commands to the existing canonical JOIN editor. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasColumnMappingResult } from './canvasColumnMappingModel';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  applyDvtSubstraitInnerJoinFieldEdit,
  encodeDvtSubstraitInnerJoinDocument,
} from './canvasDvtSubstraitJoinComposition';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { readCanvasJoinColumnOutputs } from './canvasJoinColumnOutputModel';

export function setCanvasJoinColumnOutputIncluded(args: {
  draftSession: CanvasDraftSession;
  targetNode: CanonicalNode;
  columnId: string;
  output: boolean;
}): CanvasColumnMappingResult | null {
  const entry = readCanvasJoinColumnOutputs(args.targetNode);
  if (entry == null) return null;
  const field = entry.fields.find((candidate) => candidate.columnId === args.columnId);
  if (field == null) return { outcome: 'rejected', reason: 'mapping_not_found' };
  if (field.selected === args.output)
    return { outcome: 'applied', draftSession: args.draftSession };
  const changed = applyDvtSubstraitInnerJoinFieldEdit(entry.draft, {
    ...field.selector,
    kind: 'set-selected',
    selected: args.output,
  });
  if (changed === entry.draft) return { outcome: 'rejected', reason: 'mapping_not_found' };
  const node = applyDvtSubstraitSemanticDocument(
    args.targetNode,
    encodeDvtSubstraitInnerJoinDocument(changed)
  );
  return {
    outcome: 'applied',
    draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, node),
  };
}
