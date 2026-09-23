/** Owned concern: resolve an existing canonical JOIN into an editable structural seed. */
import type { CanonicalNode } from '../../types/canonical';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { createDvtTransformAuthoringMetadata } from './canvasDvtTransformAuthoring';
import type { CanvasRelationalTreeProjection } from './canvasRelationalTreeProjection';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';

export type CanvasRelationalTreeExistingJoinDraft = Readonly<{
  draft: DvtSubstraitJoinDraft;
  inputIds: readonly string[];
  operation: CanvasRelationalOperation;
}>;

export function resolveCanvasRelationalTreeExistingJoinDraft(
  args: Readonly<{
    transformNode: CanonicalNode;
    projection: CanvasRelationalTreeProjection | null;
  }>
): CanvasRelationalTreeExistingJoinDraft | null {
  try {
    if (args.projection == null) return null;
    const metadata = createDvtTransformAuthoringMetadata(args.transformNode);
    if (metadata.mode !== 'substrait' || metadata.shape === 'pilot') return null;
    const inputIds = args.projection.inputs
      .filter((input) => input.state === 'participating')
      .map((input) => input.sourceNodeId);
    if (inputIds.some((nodeId) => nodeId == null)) return null;
    return {
      draft: { plan: metadata.plan, sidecar: metadata.sidecar },
      operation: metadata.shape,
      // Ordered physical provenance for every occurrence; not a set of occurrence identities.
      inputIds: inputIds.filter((nodeId): nodeId is string => nodeId != null),
    };
  } catch {
    return null;
  }
}
