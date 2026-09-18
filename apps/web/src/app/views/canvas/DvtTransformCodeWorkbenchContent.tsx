/** Owned concern: compose canonical Transform output with pending relational authoring. */
import type { ReactNode } from 'react';

import type { CanvasRelationalCompositionTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasViewCopy } from './canvasCopy.types';
import { DvtTransformOutputView } from './DvtTransformOutputView';

export function DvtTransformCodeWorkbenchContent({
  transformNode,
  nodes,
  edges,
  canonicalContent,
  canonicalDescription,
  relationalComposition,
  pendingCompositionAuthoring,
  copy,
}: Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  canonicalContent: string;
  canonicalDescription?: string;
  relationalComposition?: CanvasRelationalCompositionTruth;
  pendingCompositionAuthoring: ReactNode;
  copy: Pick<
    CanvasViewCopy,
    | 'inspectorTransformOutputViewLabel'
    | 'inspectorTransformOutputSubstraitLabel'
    | 'inspectorTransformOutputPostgresSqlLabel'
    | 'inspectorTransformOutputLoadingMessage'
    | 'inspectorTransformOutputErrorMessage'
  >;
}>): JSX.Element {
  if (relationalComposition?.state === 'pending') {
    return <>{pendingCompositionAuthoring}</>;
  }

  return (
    <DvtTransformOutputView
      transformNode={transformNode}
      nodes={nodes}
      edges={edges}
      canonicalContent={canonicalContent}
      canonicalDescription={canonicalDescription}
      copy={copy}
    />
  );
}
