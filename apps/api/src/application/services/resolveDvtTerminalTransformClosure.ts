/**
 * Owned concern: resolve the exact protected Source -> terminal Transform
 * closure shared by PostgreSQL projection and workload lowering.
 */
import {
  ConnectedSourceRefSchema,
  DVT_POSTGRES_INNER_JOIN_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DvtTransformAuthoringAuthorityV1Schema,
  WorkspaceGraphAuthoringDraftSchema,
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
  type ConnectionRef,
  type ConnectedSourceRef,
  type DvtTransformAuthoringAuthorityV1,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringEdge,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

export type DvtTerminalTransformClosure = {
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly sources: readonly { node: WorkspaceGraphAuthoringNode; ref: ConnectedSourceRef }[];
  readonly transform: WorkspaceGraphAuthoringNode;
  readonly edges: readonly WorkspaceGraphAuthoringEdge[];
  readonly connectionRef: ConnectionRef;
  readonly profileId:
    typeof DVT_POSTGRES_PROJECT_REL_PROFILE_ID | typeof DVT_POSTGRES_INNER_JOIN_PROFILE_ID;
  readonly authority: DvtTransformAuthoringAuthorityV1;
};

export function resolveDvtTerminalTransformClosure(input: {
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly selectedNodeIds: readonly string[];
  readonly selectedEdgeIds: readonly string[];
}): DvtTerminalTransformClosure {
  const draft = WorkspaceGraphAuthoringDraftSchema.parse(input.draft);
  requireUniqueIdentities(input.selectedNodeIds, 'selected node');
  requireUniqueIdentities(input.selectedEdgeIds, 'selected edge');

  const selectedNodes = selectExact(draft.nodes, input.selectedNodeIds, 'node');
  const selectedEdges = selectExact(draft.edges, input.selectedEdgeIds, 'edge');
  const sourceNodes = selectedNodes.filter(
    (node) =>
      (node.pluginId === 'dvt' || node.pluginId === 'dvt.warehouse-source') &&
      node.kind === 'dvt:source' &&
      node.role === 'input'
  );
  const transform = selectedNodes.find(
    (node) => node.pluginId === 'dvt' && node.kind === 'transform' && node.role === 'transform'
  );
  if (
    sourceNodes.length === 0 ||
    transform === undefined ||
    selectedNodes.length !== sourceNodes.length + 1
  ) {
    throw new Error('Selection must contain DVT Sources and exactly one DVT Transform.');
  }

  if (
    draft.edges.some(
      (candidate) =>
        candidate.sourceId === transform.id &&
        isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(candidate)
    )
  ) {
    throw new Error('Selected DVT Transform must be terminal in the protected Canvas.');
  }

  const sourceIds = new Set(sourceNodes.map((source) => source.id));
  if (
    selectedEdges.length !== sourceNodes.length ||
    new Set(selectedEdges.map((edge) => edge.sourceId)).size !== sourceNodes.length ||
    selectedEdges.some(
      (edge) =>
        !sourceIds.has(edge.sourceId) ||
        edge.targetId !== transform.id ||
        edge.relation !== 'lineage' ||
        !isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge)
    ) ||
    draft.edges.some(
      (edge) =>
        edge.targetId === transform.id &&
        isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge) &&
        !input.selectedEdgeIds.includes(edge.id)
    )
  ) {
    throw new Error(
      'Selection must contain every effective lineage Source to Transform dependency exactly once.'
    );
  }

  const sources = sourceNodes.map((node) => ({
    node,
    ref: ConnectedSourceRefSchema.parse(node.metadata?.connectedSourceRef),
  }));
  const connectionRef = sources[0]!.ref.connectionRef;
  const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
    transform.metadata?.transformAuthoring
  );
  const semanticSources = authority.semanticDocument.sidecar.relations.flatMap(({ sourceRef }) =>
    sourceRef === undefined ? [] : [sourceRef]
  );
  if (
    connectionRef.provider !== 'postgres' ||
    sources.some(({ ref }) => !sameConnection(ref.connectionRef, connectionRef)) ||
    semanticSources.length !== sources.length ||
    sources.some(
      ({ ref }) =>
        semanticSources.filter((semantic) => sameConnectedSource(semantic, ref)).length !== 1
    ) ||
    semanticSources.some(
      (semantic) => sources.filter(({ ref }) => sameConnectedSource(semantic, ref)).length !== 1
    )
  ) {
    throw new Error(
      'Transform semantic sources must exactly match the selected connected Sources on one PostgreSQL connection.'
    );
  }

  return {
    draft,
    sources,
    transform,
    edges: selectedEdges,
    connectionRef,
    authority,
    profileId:
      sources.length === 1
        ? DVT_POSTGRES_PROJECT_REL_PROFILE_ID
        : DVT_POSTGRES_INNER_JOIN_PROFILE_ID,
  };
}

function selectExact<T extends { readonly id: string }>(
  items: readonly T[],
  ids: readonly string[],
  kind: string
): readonly T[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  return ids.map((id) => {
    const item = itemById.get(id);
    if (item === undefined) throw new Error(`Selection references an unknown ${kind}.`);
    return item;
  });
}

function requireUniqueIdentities(ids: readonly string[], label: string): void {
  if (ids.length === 0 || new Set(ids).size !== ids.length) {
    throw new Error(`Expected unique ${label} identities.`);
  }
}

export function sameConnection(left: ConnectionRef, right: ConnectionRef): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.connectionId === right.connectionId &&
    left.provider === right.provider
  );
}

export function sameConnectedSource(left: ConnectedSourceRef, right: ConnectedSourceRef): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.sourceObjectId === right.sourceObjectId &&
    sameConnection(left.connectionRef, right.connectionRef)
  );
}
