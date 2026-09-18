/** Owned concern: project a local relational authoring draft through the canonical tree query. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import {
  createCanvasRelationalTreeNodeDraft,
  createCanvasRelationalTreeUnionAllDraft,
} from './canvasRelationalTreeAuthoringModel';
import {
  projectCanvasRelationalTree,
  type CanvasRelationalTreeProjection,
} from './canvasRelationalTreeProjection';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';

export function projectCanvasRelationalTreeAuthoringDraft(
  args: Readonly<{
    edges: readonly CanonicalEdge[];
    inputs: readonly CanvasDvtCompositionInput[];
    joinDraft: DvtSubstraitInnerJoinDraft | null;
    nodes: readonly CanonicalNode[];
    operation: CanvasRelationalOperation | null;
    selectedInputIds: readonly string[];
    transformNode: CanonicalNode;
  }>
): CanvasRelationalTreeProjection | null {
  const semantic =
    args.operation === 'projection' && args.joinDraft == null
      ? (() => {
          const input = args.inputs.find(
            (candidate) => candidate.nodeId === args.selectedInputIds[0]
          );
          return input == null
            ? null
            : createCanvasRelationalTreeProjectionDraft({
                input,
                targetNodeId: args.transformNode.id,
              });
        })()
      : args.joinDraft != null || args.operation === 'inner_join' || args.operation === 'projection'
        ? args.joinDraft
        : args.operation === 'union_all'
          ? createCanvasRelationalTreeUnionAllDraft({
              edges: args.edges,
              nodes: args.nodes,
              selectedInputIds: args.selectedInputIds,
              targetNodeId: args.transformNode.id,
            })
          : null;
  if (semantic == null || args.operation == null) return null;

  const draftNode = applyCanvasInspectorNodeDraft(
    args.transformNode,
    createCanvasRelationalTreeNodeDraft(args.transformNode, args.operation, semantic)
  );
  const draftNodes = args.nodes.some((node) => node.id === draftNode.id)
    ? args.nodes.map((node) => (node.id === draftNode.id ? draftNode : node))
    : [...args.nodes, draftNode];
  const result = projectCanvasRelationalTree({
    node: draftNode,
    nodes: draftNodes,
    edges: args.edges,
  });
  return result.ok ? result.projection : null;
}
