/** Owned concern: resolve an existing canonical JOIN into an editable structural seed. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { createDvtTransformAuthoringMetadata } from './canvasDvtTransformAuthoring';
import { projectCanvasRelationalTree } from './canvasRelationalTreeProjection';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';

export type CanvasRelationalTreeExistingJoinDraft = Readonly<{
  draft: DvtSubstraitJoinDraft;
  inputIds: readonly string[];
  operation: CanvasRelationalOperation;
}>;

export function resolveCanvasRelationalTreeExistingJoinDraft(
  args: Readonly<{
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
  }>
): CanvasRelationalTreeExistingJoinDraft | null {
  try {
    const metadata = createDvtTransformAuthoringMetadata(args.transformNode);
    if (metadata.mode !== 'substrait' || metadata.shape === 'pilot') return null;
    const tree = projectCanvasRelationalTree({
      node: args.transformNode,
      nodes: args.nodes,
      edges: args.edges,
    });
    if (!tree.ok) return null;
    const inputIds = tree.projection.inputs
      .filter((input) => input.state === 'participating')
      .map((input) => input.sourceNodeId);
    if (inputIds.some((nodeId) => nodeId == null)) return null;
    return {
      draft: { plan: metadata.plan, sidecar: metadata.sidecar },
      operation: metadata.shape,
      inputIds: [...new Set(inputIds.filter((nodeId): nodeId is string => nodeId != null))],
    };
  } catch {
    return null;
  }
}
