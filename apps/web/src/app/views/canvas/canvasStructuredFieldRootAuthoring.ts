/** Owned concern: apply structured-root lifecycle commands through ConfigureCanvasDvtNode. */
import { allocateDvtFieldId } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import { appendDvtSubstraitSourceFieldRoot } from './canvasDvtSubstraitStructuredFieldAppend';
import { encodeDvtSubstraitStructuredFieldDocument } from './canvasDvtSubstraitStructuredField';
import { removeDvtSubstraitProjectionRoot } from './canvasDvtSubstraitStructuredFieldRemove';
import { reorderDvtSubstraitStructuredFieldRoots } from './canvasDvtSubstraitStructuredFieldReorder';
import {
  type CanvasStructuredFieldResult,
  resolveStructuredFieldDraft,
} from './canvasStructuredFieldAuthoring';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

export function reorderCanvasStructuredFieldRoots(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  nodeId: string;
  fieldId: string;
  targetFieldId: string;
  placement: 'before' | 'after';
}): CanvasStructuredFieldResult {
  try {
    const resolved = resolveStructuredFieldDraft(args);
    if (resolved == null) return { outcome: 'rejected' };
    const changed = reorderDvtSubstraitStructuredFieldRoots(resolved.draft, args);
    if (changed === resolved.draft) return { outcome: 'rejected' };
    const node = applyDvtSubstraitSemanticDocument(
      resolved.target,
      encodeDvtSubstraitStructuredFieldDocument(changed)
    );
    return {
      outcome: 'applied',
      draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, node),
    };
  } catch {
    return { outcome: 'rejected' };
  }
}

export function setCanvasStructuredRootOutputIncluded(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  nodeId: string;
  columnId: string;
  output: boolean;
  placement?: Readonly<{ targetColumnId: string; placement: 'before' | 'after' }>;
}): CanvasStructuredFieldResult {
  try {
    const resolved = resolveStructuredFieldDraft(args);
    if (resolved == null) return { outcome: 'rejected' };
    const createdFieldId = args.output ? allocateDvtFieldId() : null;
    let changed =
      createdFieldId == null
        ? removeDvtSubstraitProjectionRoot(resolved.draft, { fieldId: args.columnId })
        : appendDvtSubstraitSourceFieldRoot(resolved.draft, {
            fieldId: createdFieldId,
            sourceFieldName: args.columnId,
          });
    if (changed === resolved.draft) return { outcome: 'rejected' };
    if (createdFieldId != null && args.placement != null) {
      const reordered = reorderDvtSubstraitStructuredFieldRoots(changed, {
        fieldId: createdFieldId,
        targetFieldId: args.placement.targetColumnId,
        placement: args.placement.placement,
      });
      if (reordered === changed) return { outcome: 'rejected' };
      changed = reordered;
    }
    const node = applyDvtSubstraitSemanticDocument(
      resolved.target,
      encodeDvtSubstraitStructuredFieldDocument(changed)
    );
    return {
      outcome: 'applied',
      draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, node),
    };
  } catch {
    return { outcome: 'rejected' };
  }
}
