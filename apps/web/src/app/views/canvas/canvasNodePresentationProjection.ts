/** Owned concern: adapt plugin artifact queries into the shared Canvas node presentation DTO. */
import { buildCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectDbtModelArtifact } from './canvasDbtModelArtifactProjection';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';

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

  const baseTruth = buildCanvasNodePresentationTruth({
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
  if (args.node.pluginId !== 'dvt' || args.node.kind !== 'dvt:sql_transform') {
    return baseTruth;
  }
  try {
    const authority = readDvtTransformAuthoringAuthority(args.node);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.visual) return baseTruth;
    const declared = authority.recipe.outputs.map((output) => ({
      name: output.name,
      type: output.dataType ?? 'unknown',
      provenance: 'declared' as const,
      reference: output.id,
    }));
    return {
      ...baseTruth,
      columns: {
        declared,
        inherited: baseTruth.columns.inherited,
        visible: declared,
        declaredCount: declared.length,
        inheritedCount: baseTruth.columns.inheritedCount,
        visibleCount: declared.length,
        visibleProvenance: declared.length > 0 ? 'declared' : 'none',
      },
    };
  } catch {
    return baseTruth;
  }
}
