/**
 * Owned concern: resolve the exact protected Source -> terminal Transform
 * closure shared by PostgreSQL projection and workload lowering.
 */
import {
  ConnectedSourceRefSchema,
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
  readonly source: WorkspaceGraphAuthoringNode;
  readonly transform: WorkspaceGraphAuthoringNode;
  readonly edge: WorkspaceGraphAuthoringEdge;
  readonly connectedSource: ConnectedSourceRef;
  readonly authority: DvtTransformAuthoringAuthorityV1;
};

export function resolveDvtTerminalTransformClosure(input: {
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly selectedNodeIds: readonly string[];
  readonly selectedEdgeIds: readonly string[];
}): DvtTerminalTransformClosure {
  const draft = WorkspaceGraphAuthoringDraftSchema.parse(input.draft);
  requireUniqueExactCount(input.selectedNodeIds, 2, 'selected node');
  requireUniqueExactCount(input.selectedEdgeIds, 1, 'selected edge');

  const selectedNodes = selectExact(draft.nodes, input.selectedNodeIds, 'node');
  const selectedEdges = selectExact(draft.edges, input.selectedEdgeIds, 'edge');
  const source = selectedNodes.find((node) => node.kind === 'dvt:source' && node.role === 'input');
  const transform = selectedNodes.find(
    (node) => node.pluginId === 'dvt' && node.kind === 'dvt:transform' && node.role === 'transform'
  );
  if (
    source === undefined ||
    transform === undefined ||
    source.id === transform.id ||
    selectedNodes.some((node) => node.id !== source.id && node.id !== transform.id)
  ) {
    throw new Error('Selection must contain exactly one DVT Source and one DVT Transform.');
  }

  const edge = selectedEdges[0]!;
  if (
    edge.sourceId !== source.id ||
    edge.targetId !== transform.id ||
    !isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge)
  ) {
    throw new Error('Selection must contain one effective Source to Transform dependency.');
  }

  const connectedSource = ConnectedSourceRefSchema.parse(source.metadata?.connectedSourceRef);
  const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
    transform.metadata?.transformAuthoring
  );
  const semanticSources = authority.semanticDocument.sidecar.relations.flatMap(({ sourceRef }) =>
    sourceRef === undefined ? [] : [sourceRef]
  );
  if (semanticSources.length !== 1 || !sameConnectedSource(semanticSources[0]!, connectedSource)) {
    throw new Error('Transform semantic source must match the selected connected Source.');
  }

  return { draft, source, transform, edge, connectedSource, authority };
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

function requireUniqueExactCount(ids: readonly string[], count: number, label: string): void {
  if (ids.length !== count || new Set(ids).size !== count) {
    throw new Error(`Expected exactly ${count} unique ${label} identities.`);
  }
}

export function sameConnection(left: ConnectionRef, right: ConnectionRef): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.connectionId === right.connectionId &&
    left.provider === right.provider
  );
}

function sameConnectedSource(left: ConnectedSourceRef, right: ConnectedSourceRef): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.sourceObjectId === right.sourceObjectId &&
    sameConnection(left.connectionRef, right.connectionRef)
  );
}
