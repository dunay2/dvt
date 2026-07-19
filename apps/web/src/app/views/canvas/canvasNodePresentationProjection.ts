/** Owned concern: adapt plugin artifact queries into the shared Canvas node presentation DTO. */
import { buildCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectDbtModelArtifact } from './canvasDbtModelArtifactProjection';

export function projectCanvasNodePresentationTruth(
  args: Readonly<{
    node: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  }>
): CanvasNodePresentationTruth {
  const artifactProjection = projectDbtModelArtifact({
    modelNode: args.node,
    nodes: args.nodes,
    edges: args.edges,
  });
  const generatedArtifact =
    artifactProjection.ok && artifactProjection.artifact.provenance === 'generated'
      ? artifactProjection.artifact
      : null;

  return buildCanvasNodePresentationTruth({
    ...args,
    ...(generatedArtifact == null
      ? {}
      : {
          generatedCode: {
            content: generatedArtifact.content,
            path: generatedArtifact.path,
            language: generatedArtifact.language,
          },
        }),
  });
}
