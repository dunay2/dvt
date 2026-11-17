/** Read published producer fields from the existing canonical presentation authority. */
import type { CanonicalNode } from '../../types/canonical';
import { readWorkspaceDbtModelReference } from '@dvt/contracts';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import type { CanvasInputBindingEdge, CanvasPublishedInputField } from './canvasInputBindings';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import { readCanvasModelCompositionPublication } from './canvasModelCompositionInput';

export async function readCanvasPublishedInputFields(
  args: Readonly<{
    node: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanvasInputBindingEdge[];
  }>,
  signal?: AbortSignal
): Promise<readonly CanvasPublishedInputField[]> {
  const isModel = args.node.pluginId === 'dvt' && args.node.kind === 'dvt:transform';
  const isSource =
    ['dvt', 'dvt.warehouse-source'].includes(args.node.pluginId) && args.node.kind === 'dvt:source';
  if (!isModel && !isSource) return [];
  if (isModel && readWorkspaceDbtModelReference(args.node) != null) {
    const publication = readCanvasModelCompositionPublication(args.node, args.nodes, args.edges);
    if (signal?.aborted || publication == null || publication.rootPublication.rowUnavailable)
      return [];
    return publication.fields.flatMap((field) =>
      field.id != null && publication.publishedFieldIds.has(field.id)
        ? [{ columnId: field.id, name: field.name, type: field.dataType }]
        : []
    );
  }
  const truth = await projectCanvasNodePresentationTruth(args, undefined, signal);
  return projectCanvasPublishedInputFields(args.node, truth);
}

export function projectCanvasPublishedInputFields(
  node: CanonicalNode,
  truth: CanvasNodePresentationTruth
): readonly CanvasPublishedInputField[] {
  const isModel = node.pluginId === 'dvt' && node.kind === 'dvt:transform';
  const isSource =
    ['dvt', 'dvt.warehouse-source'].includes(node.pluginId) && node.kind === 'dvt:source';
  if (
    (!isModel && !isSource) ||
    truth.columns.state === 'unavailable' ||
    truth.columns.state === 'pending'
  )
    return [];
  return truth.columns.visible.flatMap((column) => {
    const columnId = isModel ? column.reference : (column.sourceFieldName ?? column.name);
    return column.selected === false || columnId == null
      ? []
      : [{ columnId, name: column.name, type: column.type }];
  });
}
