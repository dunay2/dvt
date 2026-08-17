/** Owned concern: adapt plugin artifact queries into the shared Canvas node presentation DTO. */
import { buildCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectDbtModelArtifact } from './canvasDbtModelArtifactProjection';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { DVT_TRANSFORM_AUTHORING_MODE, type VisualTransformRecipeV1 } from '@dvt/contracts';
import { resolveAuthoringSqlArtifactPath } from './previewGraphNodePayloads';
import { compileDvtVisualTransformNodeToPostgresSql } from './canvasVisualTransformSql';

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
  let visualRecipe: VisualTransformRecipeV1 | null = null;
  if (args.node.pluginId === 'dvt' && args.node.kind === 'dvt:sql_transform') {
    try {
      const authority = readDvtTransformAuthoringAuthority(args.node);
      visualRecipe =
        authority.mode === DVT_TRANSFORM_AUTHORING_MODE.visual ? authority.recipe : null;
    } catch {
      visualRecipe = null;
    }
  }
  let visualGeneratedCode: Readonly<{
    content: string;
    path: string;
    language: 'sql';
  }> | null = null;
  if (visualRecipe != null) {
    try {
      const sourceNodeIds = new Set(
        args.edges.filter((edge) => edge.targetId === args.node.id).map((edge) => edge.sourceId)
      );
      const sourceNodes = args.nodes.filter(
        (node) => sourceNodeIds.has(node.id) && node.role === 'input'
      );
      if (sourceNodes.length === 1) {
        const sourceNode = sourceNodes[0]!;
        visualGeneratedCode = {
          content: compileDvtVisualTransformNodeToPostgresSql({
            transformNode: args.node,
            sourceNode,
          }),
          path: resolveAuthoringSqlArtifactPath(args.node),
          language: 'sql',
        };
      }
    } catch {
      visualGeneratedCode = null;
    }
  }

  const baseTruth = buildCanvasNodePresentationTruth({
    ...args,
    generatedCodeIsAuthoritative: visualGeneratedCode != null,
    ...(generatedArtifact == null && visualGeneratedCode == null
      ? {}
      : {
          generatedCode:
            visualGeneratedCode ??
            ({
              content: generatedArtifact!.content,
              path: generatedArtifact!.path,
              language: generatedArtifact!.language,
            } as const),
        }),
  });
  if (visualRecipe == null) {
    return baseTruth;
  }
  const declared = visualRecipe.outputs.map((output) => ({
    name: output.name,
    type: output.dataType ?? 'unknown',
    provenance: 'declared' as const,
    reference: output.id,
  }));
  const declaredNames = new Set(declared.map((column) => column.name));
  const prospective = baseTruth.columns.inherited.filter(
    (column) => !declaredNames.has(column.name)
  );
  const visible = [...declared, ...prospective];
  return {
    ...baseTruth,
    columns: {
      declared,
      inherited: baseTruth.columns.inherited,
      visible,
      declaredCount: declared.length,
      inheritedCount: baseTruth.columns.inheritedCount,
      visibleCount: visible.length,
      visibleProvenance:
        declared.length > 0 && prospective.length > 0
          ? 'mixed'
          : declared.length > 0
            ? 'declared'
            : prospective.length > 0
              ? 'inherited'
              : 'none',
    },
  };
}
