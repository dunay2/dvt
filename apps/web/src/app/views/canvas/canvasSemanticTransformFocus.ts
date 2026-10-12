/** Owned concern: decide whether stored Transform semantics match the visible graph topology. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasRelationalCompositionTruth } from './canvasRelationalCompositionTruth';

export type CanvasSemanticTransformFocus =
  | Readonly<{ state: 'current'; transform: CanonicalNode }>
  | Readonly<{
      state: 'topology-mismatch';
      transform: CanonicalNode;
      connectedInputCount: number;
    }>;

export function projectCanvasSemanticTransformFocus(
  args: Readonly<{
    transform: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
  }>
): CanvasSemanticTransformFocus {
  const composition = resolveCanvasRelationalCompositionTruth({
    node: args.transform,
    nodes: args.nodes,
    edges: args.edges,
  });

  if (
    composition?.state === 'incomplete' ||
    composition?.state === 'pending' ||
    composition?.state === 'unresolved'
  ) {
    return {
      state: 'topology-mismatch',
      transform: args.transform,
      connectedInputCount: composition.connectedInputCount,
    };
  }

  return { state: 'current', transform: args.transform };
}
