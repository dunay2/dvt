/** Adapt non-semantic plugin metadata without interpreting Substrait. */
import { buildCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectDbtModelArtifact } from './canvasDbtModelArtifactProjection';
import {
  isObjectFilePostgresNode,
  resolveObjectFilePostgresAuthoringMetadata,
} from './objectFilePostgresAuthoringModel';
import { canvasColumnTruth } from './canvasPresentationColumns';

export type CanvasPresentationQuery = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
}>;

export function canvasNodePresentationBase(
  args: CanvasPresentationQuery
): CanvasNodePresentationTruth {
  const artifact = projectDbtModelArtifact({
    modelNode: args.node,
    nodes: args.nodes,
    edges: args.edges,
  });
  const metadata = isObjectFilePostgresNode(args.node)
    ? resolveObjectFilePostgresAuthoringMetadata(args.node)
    : null;
  const node =
    metadata == null
      ? args.node
      : {
          ...args.node,
          metadata: {
            ...args.node.metadata,
            columns: metadata.columns.map((column) => ({
              name: column.targetColumn,
              type: column.dataType,
              nullable: column.nullable,
            })),
          },
        };
  return buildCanvasNodePresentationTruth({
    ...args,
    node,
    generatedCodeIsAuthoritative: false,
    ...(artifact.ok ? { generatedCode: artifact.artifact } : {}),
  });
}

export function pendingCanvasNodePresentation(
  args: CanvasPresentationQuery
): CanvasNodePresentationTruth {
  const base = canvasNodePresentationBase(args);
  return { ...base, columns: { ...canvasColumnTruth([], []), state: 'pending' } };
}
