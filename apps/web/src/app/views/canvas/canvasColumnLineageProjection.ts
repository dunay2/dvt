/** Column lineage consumes the same resolved field facts as the cards. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  CanvasNodePresentationColumn,
  CanvasNodePresentationTruth,
} from '../../components/canvas/canvasNodePresentationTruth.contract';
import { canAuthorCanvasColumnMappings } from './canvasColumnProjectionAuthority';
import { canvasInputBindingIsConsumed } from './canvasInputBindingUsage';
import {
  buildCanvasColumnLineageEdge,
  type CanvasColumnLineageEdge,
} from './canvasColumnLineageEdgeModel';
export function projectCanvasColumnLineage(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly Readonly<{ sourceId: string; targetId: string }>[];
  expandedNodeIds: ReadonlySet<string>;
  presentations: ReadonlyMap<string, CanvasNodePresentationTruth>;
  columnViews?: ReadonlyMap<string, 'input' | 'output'>;
}): CanvasColumnLineageEdge[] {
  const nodeById = new Map(args.nodes.map((node) => [node.id, node]));
  const projected: CanvasColumnLineageEdge[] = [];
  const dependencies = new Set(
    args.edges.map((edge) => JSON.stringify([edge.sourceId, edge.targetId]))
  );
  for (const node of args.nodes) {
    if (!args.expandedNodeIds.has(node.id)) continue;
    const truth = args.presentations.get(node.id);
    if (truth?.inputBindings != null) {
      if (args.columnViews != null && args.columnViews.get(node.id) !== 'input') continue;
      for (const input of truth.inputBindings) {
        const producer = nodeById.get(input.source.nodeId);
        if (
          producer == null ||
          input.state !== 'available' ||
          !args.expandedNodeIds.has(producer.id) ||
          (producer.role === 'transform' &&
            args.columnViews != null &&
            args.columnViews.get(producer.id) !== 'output') ||
          !dependencies.has(JSON.stringify([producer.id, node.id]))
        )
          continue;
        projected.push(
          buildCanvasColumnLineageEdge({
            sourceNodeId: producer.id,
            sourceFieldId: input.source.columnId,
            sourceColumnName: input.name,
            sourceHandleColumnId: input.source.columnId,
            targetNodeId: node.id,
            outputId: input.inputId,
            targetColumnName: input.name,
            targetHandleColumnId: input.inputId,
            terminal: false,
            removable: !canvasInputBindingIsConsumed(input, node, producer),
          })
        );
      }
      continue;
    }
    if (truth == null || truth.columns.state === 'pending' || truth.columns.state === 'unavailable')
      continue;
    const roots = truth.columns.declared;
    const pending = roots.map((field) => ({ field, root: field, path: field.name })).reverse();
    while (pending.length > 0) {
      const { field, root, path } = pending.pop()!;
      if (field.children != null) {
        pending.push(
          ...field.children
            .map((child) => ({ field: child, root, path: path + '.' + child.name }))
            .reverse()
        );
        continue;
      }
      if (field.reference == null || root.reference == null) continue;
      for (const source of field.sources ?? []) {
        const producer = nodeById.get(source.nodeId);
        if (
          producer == null ||
          !args.expandedNodeIds.has(source.nodeId) ||
          !dependencies.has(JSON.stringify([source.nodeId, node.id]))
        )
          continue;
        const sourceTruth = args.presentations.get(source.nodeId);
        const available = sourceTruth?.columns.visible.find((column) =>
          producer.role === 'input'
            ? column.name === source.name
            : column.reference === source.fieldId
        );
        if (available == null || available.selected === false) continue;
        projected.push(
          buildCanvasColumnLineageEdge({
            sourceNodeId: source.nodeId,
            sourceFieldId: source.fieldId,
            sourceColumnName: source.name,
            sourceHandleColumnId: producer.role === 'input' ? source.name : source.fieldId,
            targetNodeId: node.id,
            outputId: field.reference,
            targetColumnName: path,
            targetHandleColumnId: root.reference,
            terminal: false,
            removable:
              root === field &&
              canAuthorCanvasColumnMappings(node) &&
              canRemoveMapping(field, roots),
          })
        );
      }
    }
  }
  return projected;
}

function canRemoveMapping(
  field: CanvasNodePresentationColumn,
  fields: readonly CanvasNodePresentationColumn[]
): boolean {
  return (
    field.sources?.length === 1 &&
    fields.every((column) => column.sources?.length === 1 && column.children == null)
  );
}
