/** Owned concern: compose canonical Transform output with pending relational authoring. */
import type { ReactNode } from 'react';

import type { CanvasRelationalCompositionTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

export function DvtTransformCodeWorkbenchContent({
  transformNode,
  nodes,
  edges,
  relationalComposition,
  pendingCompositionAuthoring,
  copy,
}: Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  relationalComposition?: CanvasRelationalCompositionTruth;
  pendingCompositionAuthoring: ReactNode;
  copy: CanvasRelationalTreeWorkbenchCopy;
}>): JSX.Element {
  return (
    <CanvasRelationalTreeWorkbench
      transformNode={transformNode}
      nodes={nodes}
      edges={edges}
      relationalComposition={relationalComposition}
      pendingCompositionAuthoring={pendingCompositionAuthoring}
      copy={copy}
    />
  );
}
