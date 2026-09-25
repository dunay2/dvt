/** Owned concern: project a local relational authoring draft through the canonical tree query. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import {
  projectCanvasRelationalTree,
  type CanvasRelationalTreeProjection,
} from './canvasRelationalTreeProjection';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

export function projectCanvasRelationalTreeAuthoringDraft(
  args: Readonly<{
    edges: readonly CanonicalEdge[];
    joinDraft: SubstraitDocument | null;
    nodes: readonly CanonicalNode[];
    operation: CanvasRelationalOperation | null;
    transformNode: CanonicalNode;
  }>
): CanvasRelationalTreeProjection | null {
  const semantic = args.joinDraft;
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
