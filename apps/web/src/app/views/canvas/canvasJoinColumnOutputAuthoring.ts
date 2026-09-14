/** Owns routing card output commands to the existing canonical JOIN editor. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasColumnMappingResult } from './canvasColumnMappingModel';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  applyDvtSubstraitInnerJoinFieldEdit,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { readCanvasJoinColumnOutputs } from './canvasJoinColumnOutputModel';

type JoinEntry = NonNullable<ReturnType<typeof readCanvasJoinColumnOutputs>>;
type Placement = Readonly<{ targetColumnId: string; placement: 'before' | 'after' }>;

function placeOutput(
  draft: JoinEntry['draft'],
  field: JoinEntry['fields'][number],
  placement: Placement
): JoinEntry['draft'] | null {
  const inspected = inspectDvtSubstraitNInputJoinDraft(draft);
  if (!inspected.ok) return null;
  const outputs = inspected.projection.outputs;
  const currentIndex = outputs.findIndex((output) => output.source.fieldId === field.sourceFieldId);
  const remaining = outputs.filter((_, index) => index !== currentIndex);
  const targetIndex = remaining.findIndex((output) => output.fieldId === placement.targetColumnId);
  if (currentIndex < 0 || targetIndex < 0) return null;
  const desiredIndex = targetIndex + (placement.placement === 'after' ? 1 : 0);
  let changed = draft;
  for (let step = 0; step < Math.abs(desiredIndex - currentIndex); step += 1) {
    const next = applyDvtSubstraitInnerJoinFieldEdit(changed, {
      ...field.selector,
      kind: 'move',
      direction: desiredIndex < currentIndex ? 'up' : 'down',
    });
    if (next === changed) return null;
    changed = next;
  }
  return changed;
}

function applyOutputDraft(
  args: { draftSession: CanvasDraftSession; targetNode: CanonicalNode },
  draft: JoinEntry['draft'] | null
): CanvasColumnMappingResult {
  if (draft == null) return { outcome: 'rejected', reason: 'mapping_not_found' };
  const node = applyDvtSubstraitSemanticDocument(
    args.targetNode,
    encodeDvtSubstraitInnerJoinDocument(draft)
  );
  return {
    outcome: 'applied',
    draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, node),
  };
}

export function reorderCanvasJoinColumnOutput(
  args: {
    draftSession: CanvasDraftSession;
    targetNode: CanonicalNode;
    columnId: string;
  } & Placement
): CanvasColumnMappingResult | null {
  const entry = readCanvasJoinColumnOutputs(args.targetNode);
  if (entry == null) return null;
  const field = entry.fields.find((candidate) => candidate.columnId === args.columnId);
  return applyOutputDraft(args, field?.selected ? placeOutput(entry.draft, field, args) : null);
}

export function setCanvasJoinColumnOutputIncluded(args: {
  draftSession: CanvasDraftSession;
  targetNode: CanonicalNode;
  columnId: string;
  output: boolean;
  placement?: Placement;
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
  return applyOutputDraft(
    args,
    args.output && args.placement != null ? placeOutput(changed, field, args.placement) : changed
  );
}
