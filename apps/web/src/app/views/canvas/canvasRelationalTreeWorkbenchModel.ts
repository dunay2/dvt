/** Owned concern: project relational-tree query results into Workbench presentation identities. */
import type { CanonicalNode } from '../../types/canonical';
import { readCanvasInputBindings, type CanvasInputBindingEdge } from './canvasInputBindings';
import type {
  CanvasRelationalTreeInput,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { readDvtSourceOutputProjection } from './canvasDvtSourceSemanticAuthoring';

export function projectCanvasSourceOccurrencePublication(
  inputs: readonly CanvasRelationalTreeInput[],
  pending: readonly PendingSourceOccurrence[],
  nodes: readonly CanonicalNode[],
  edges?: readonly CanvasInputBindingEdge[],
  targetNodeId?: string
): ReadonlyMap<string, readonly string[]> {
  const fields = new Map<string, readonly string[]>();
  const publicationFor = (sourceNodeId: string | null): readonly string[] | null => {
    const producer = nodes.find((node) => node.id === sourceNodeId);
    if (producer == null) return null;
    try {
      const edge = edges?.find(
        (candidate) => candidate.sourceId === producer.id && candidate.targetId === targetNodeId
      );
      if (edges != null && edge == null) return [];
      const selected = edge == null ? undefined : readCanvasInputBindings(edge);
      return (
        readDvtSourceOutputProjection(producer)
          ?.outputs.filter(
            (field) =>
              selected == null ||
              selected.fields.some((binding) => binding.producerFieldId === field.sourceFieldName)
          )
          .map((output) => output.sourceFieldName!) ?? null
      );
    } catch {
      return null;
    }
  };
  for (const input of inputs) {
    if (input.relationId == null) continue;
    const publication = publicationFor(input.sourceNodeId);
    if (publication != null) fields.set(input.relationId, publication);
  }
  for (const occurrence of pending) {
    const publication = publicationFor(occurrence.sourceNodeId);
    if (publication != null) fields.set(occurrence.read.binding.relationId, publication);
  }
  return fields;
}

export function flattenCanvasRelationalTree(
  root: CanvasRelationalTreeNode
): readonly CanvasRelationalTreeNode[] {
  return [root, ...root.children.flatMap((child) => flattenCanvasRelationalTree(child.node))];
}

export function unavailableCanvasRelationIds(root?: CanvasRelationalTreeNode): ReadonlySet<string> {
  return new Set(
    (root == null ? [] : flattenCanvasRelationalTree(root))
      .filter((node) => node.rowUnavailable || (node.unavailableFields?.length ?? 0) > 0)
      .flatMap((node) => (node.relationId == null ? [] : [node.relationId]))
  );
}
