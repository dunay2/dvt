/** Validate protected dependency selection independently of semantic projection. */
import {
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
  WorkspaceGraphAuthoringDraftSchema,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

export type DvtTransformSelection = Readonly<{
  draft: WorkspaceGraphAuthoringDraft;
  selectedNodeIds: readonly string[];
  selectedEdgeIds: readonly string[];
  previewTargetId?: string;
}>;

type ProtectedTransformSelection = Readonly<{
  draft: WorkspaceGraphAuthoringDraft;
  sources: Readonly<WorkspaceGraphAuthoringDraft['nodes']>;
  transforms: Readonly<WorkspaceGraphAuthoringDraft['nodes']>;
  transform: WorkspaceGraphAuthoringDraft['nodes'][number];
  edges: Readonly<WorkspaceGraphAuthoringDraft['edges']>;
}>;

export function selectProtectedDvtTransforms(
  input: DvtTransformSelection
): ProtectedTransformSelection {
  const draft = WorkspaceGraphAuthoringDraftSchema.parse(input.draft);
  const nodes = selectExact(draft.nodes, input.selectedNodeIds, 'node');
  const edges = selectExact(draft.edges, input.selectedEdgeIds, 'edge');
  const sources = nodes.filter(
    (node) =>
      (node.pluginId === 'dvt' || node.pluginId === 'dvt.warehouse-source') &&
      node.kind === 'dvt:source' &&
      node.role === 'input'
  );
  const transforms = nodes.filter(
    (node) => node.pluginId === 'dvt' && node.kind === 'transform' && node.role === 'transform'
  );
  if (input.previewTargetId == null && transforms.length !== 1) {
    throw new Error('Operational workloads require exactly one Transform authority.');
  }
  const transform =
    input.previewTargetId == null
      ? transforms[0]
      : transforms.find((node) => node.id === input.previewTargetId);
  if (
    sources.length === 0 ||
    transform == null ||
    nodes.length !== sources.length + transforms.length
  ) {
    throw new Error('Selection must contain DVT Sources and one rooted consumer closure.');
  }
  if (
    input.previewTargetId == null &&
    draft.edges.some(
      (edge) =>
        edge.sourceId === transform.id && isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge)
    )
  ) {
    throw new Error('Selected DVT Transform must be terminal in the protected Canvas.');
  }

  const producerIds = new Set(nodes.map((node) => node.id));
  const consumerIds = new Set(transforms.map((node) => node.id));
  const selectedEdgeIds = new Set(input.selectedEdgeIds);
  if (
    new Set(edges.map((edge) => JSON.stringify([edge.sourceId, edge.targetId]))).size !==
      edges.length ||
    edges.some(
      (edge) =>
        !producerIds.has(edge.sourceId) ||
        !consumerIds.has(edge.targetId) ||
        edge.relation !== 'lineage' ||
        !isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge)
    ) ||
    draft.edges.some(
      (edge) =>
        consumerIds.has(edge.targetId) &&
        isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge) &&
        !selectedEdgeIds.has(edge.id)
    )
  ) {
    throw new Error('Selection must contain every effective producer dependency exactly once.');
  }
  return { draft, sources, transforms, transform, edges };
}

function selectExact<T extends { readonly id: string }>(
  items: readonly T[],
  ids: readonly string[],
  kind: string
): readonly T[] {
  if (ids.length === 0 || new Set(ids).size !== ids.length) {
    throw new Error(`Expected unique selected ${kind} identities.`);
  }
  const itemById = new Map(items.map((item) => [item.id, item]));
  return ids.map((id) => {
    const item = itemById.get(id);
    if (item === undefined) throw new Error(`Selection references an unknown ${kind}.`);
    return item;
  });
}
