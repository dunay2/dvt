/** Owned concern: adapt plugin artifact queries into the shared Canvas node presentation DTO. */
import { buildCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectDbtModelArtifact } from './canvasDbtModelArtifactProjection';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { DVT_TRANSFORM_AUTHORING_MODE, type VisualTransformRecipeV1 } from '@dvt/contracts';
import {
  isObjectFilePostgresNode,
  resolveObjectFilePostgresAuthoringMetadata,
} from './objectFilePostgresAuthoringModel';
import { resolveAuthoringSqlArtifactPath } from './previewGraphNodePayloads';
import { compileDvtVisualTransformNodeToPostgresSql } from './canvasVisualTransformSql';
import { readDvtTransformLineageProvenance } from './canvasTransformationSqlMirror';

export function projectCanvasNodePresentationTruth(
  args: Readonly<{
    node: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  }>
): CanvasNodePresentationTruth {
  return projectCanvasNodePresentationTruthInternal(args, new Set());
}

function projectCanvasNodePresentationTruthInternal(
  args: Readonly<{
    node: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  }>,
  ancestorNodeIds: ReadonlySet<string>
): CanvasNodePresentationTruth {
  const nextAncestorNodeIds = new Set(ancestorNodeIds);
  nextAncestorNodeIds.add(args.node.id);
  const artifactProjection = projectDbtModelArtifact({
    modelNode: args.node,
    nodes: args.nodes,
    edges: args.edges,
  });
  const generatedArtifact =
    artifactProjection.ok && artifactProjection.artifact.provenance === 'generated'
      ? artifactProjection.artifact
      : null;
  const objectFileMetadata = isObjectFilePostgresNode(args.node)
    ? resolveObjectFilePostgresAuthoringMetadata(args.node)
    : null;
  const presentationNode =
    objectFileMetadata == null
      ? args.node
      : {
          ...args.node,
          metadata: {
            ...args.node.metadata,
            columns: objectFileMetadata.columns.map((column) => ({
              name: column.targetColumn,
              type: column.dataType,
              nullable: column.nullable,
            })),
          },
        };
  let visualRecipe: VisualTransformRecipeV1 | null = null;
  let lineageRecipe: VisualTransformRecipeV1 | null = null;
  if (args.node.pluginId === 'dvt' && args.node.kind === 'dvt:sql_transform') {
    try {
      const authority = readDvtTransformAuthoringAuthority(args.node);
      if (authority.mode === DVT_TRANSFORM_AUTHORING_MODE.visual) {
        visualRecipe = authority.recipe;
        lineageRecipe = authority.recipe;
      } else {
        lineageRecipe = readDvtTransformLineageProvenance(args.node);
      }
    } catch {
      visualRecipe = null;
      lineageRecipe = null;
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
    node: presentationNode,
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
  const shouldProjectUpstreamColumns =
    args.node.role === 'output' ||
    (args.node.role === 'transform' &&
      baseTruth.columns.declared.length === 0 &&
      baseTruth.columns.inherited.length === 0);
  const upstreamNodeIds = shouldProjectUpstreamColumns
    ? new Set(
        args.edges.filter((edge) => edge.targetId === args.node.id).map((edge) => edge.sourceId)
      )
    : new Set<string>();
  const upstreamVisibleColumns = args.nodes
    .filter((node) => upstreamNodeIds.has(node.id) && !nextAncestorNodeIds.has(node.id))
    .flatMap((node) =>
      projectCanvasNodePresentationTruthInternal(
        { node, nodes: args.nodes, edges: args.edges },
        nextAncestorNodeIds
      ).columns.visible.map((column) => ({
        ...column,
        provenance: 'inherited' as const,
        sourceNodeId: column.sourceNodeId ?? node.id,
        sourceNodeName: column.sourceNodeName ?? node.name,
      }))
    );
  if (args.node.role === 'output') {
    const inherited = upstreamVisibleColumns;
    const visible = baseTruth.columns.declared.length > 0 ? baseTruth.columns.declared : inherited;
    return {
      ...baseTruth,
      columns: {
        declared: baseTruth.columns.declared,
        inherited,
        visible,
        declaredCount: baseTruth.columns.declaredCount,
        inheritedCount: inherited.length,
        visibleCount: visible.length,
        visibleProvenance:
          baseTruth.columns.declared.length > 0
            ? 'declared'
            : inherited.length > 0
              ? 'inherited'
              : 'none',
      },
    };
  }
  const presentationTruth =
    shouldProjectUpstreamColumns && args.node.role === 'transform'
      ? (() => {
          const inherited = upstreamVisibleColumns;
          return {
            ...baseTruth,
            columns: {
              declared: baseTruth.columns.declared,
              inherited,
              visible: inherited,
              declaredCount: 0,
              inheritedCount: inherited.length,
              visibleCount: inherited.length,
              visibleProvenance: inherited.length > 0 ? ('inherited' as const) : ('none' as const),
            },
          };
        })()
      : baseTruth;
  if (lineageRecipe == null) {
    return presentationTruth;
  }
  const declared = lineageRecipe.outputs.map((output) => ({
    name: output.name,
    type: output.dataType ?? 'unknown',
    provenance: 'declared' as const,
    reference: output.id,
  }));
  const declaredNames = new Set(declared.map((column) => column.name));
  const prospective = presentationTruth.columns.inherited.filter(
    (column) => !declaredNames.has(column.name)
  );
  const visible = [...declared, ...prospective];
  return {
    ...presentationTruth,
    columns: {
      declared,
      inherited: presentationTruth.columns.inherited,
      visible,
      declaredCount: declared.length,
      inheritedCount: presentationTruth.columns.inheritedCount,
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
