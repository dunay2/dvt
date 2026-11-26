/** Owned concern: derive the bounded protected DVT Preview intent from Canvas state. */
import {
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
  parseExecutionSelection,
  type ExecutionSelection,
  readWorkspaceDbtModelReference,
  ConnectedSourceRefSchema,
  resolveWorkspaceNodeInstances,
  projectWorkspaceNodeInstanceEdges,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import { toCanvasAuthoringSerializableValue } from './canvasAuthoringMetadata';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { hasConnectedRelationSources } from './canvasConnectedRelationInputs';
import { hasSameConnectionRef } from '@dvt/postgres-projection';
import { resolveCanvasDbtModelSignature } from './canvasDbtModelReference';

export type ProtectedDvtPreviewProjection =
  | {
      readonly ok: true;
      readonly selection: ExecutionSelection;
      readonly selectedRoot: Readonly<Pick<CanonicalNode, 'id' | 'name'>>;
      readonly selectionMode: 'explicit';
      readonly requestedRootNodeIds: readonly string[];
      readonly derivedDependencyNodeIds: readonly string[];
      readonly scopedNodeIds: readonly string[];
      readonly draftSignature: string;
    }
  | {
      readonly ok: false;
      readonly cause: 'graph_authority_unavailable' | 'protected_path_required';
    };

type TerminalProjectionClosure = {
  readonly root: CanonicalNode;
  readonly sources: readonly CanonicalNode[];
  readonly transform: CanonicalNode;
  readonly edges: readonly CanonicalEdge[];
};

function resolveTerminalProjectionClosure(
  root: CanonicalNode,
  nodesById: ReadonlyMap<string, CanonicalNode>,
  edges: readonly CanonicalEdge[]
): TerminalProjectionClosure | null {
  const terminal = resolveTerminalTransform(root, nodesById, edges);
  if (terminal == null) return null;
  const { transform, sinkEdges } = terminal;
  const incoming = edges
    .filter((edge) => edge.targetId === transform.id)
    .sort((a, b) => a.id.localeCompare(b.id));
  const sources = resolveTerminalSources(transform, incoming, nodesById);
  if (sources == null) return null;
  if (!hasValidProjectionSources(transform, sources)) return null;
  return {
    sources,
    transform,
    root,
    edges: [...incoming, ...sinkEdges].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function resolveTerminalTransform(
  root: CanonicalNode,
  nodesById: ReadonlyMap<string, CanonicalNode>,
  edges: readonly CanonicalEdge[]
) {
  if (edges.some((edge) => edge.sourceId === root.id)) return null;
  let sinkEdges: readonly CanonicalEdge[] = [];
  let transform: CanonicalNode | undefined = root;
  if (isProjectionSink(root)) {
    sinkEdges = edges.filter((edge) => edge.targetId === root.id);
    if (sinkEdges.length !== 1) return null;
    const sinkEdge = sinkEdges[0]!;
    if (sinkEdge.relation !== 'lineage') return null;
    transform = nodesById.get(sinkEdge.sourceId);
  }
  if (!isTerminalTransform(transform, edges, sinkEdges[0]?.id)) return null;
  return { transform, sinkEdges };
}

function isTerminalTransform(
  transform: CanonicalNode | undefined,
  edges: readonly CanonicalEdge[],
  sinkEdgeId: string | undefined
): transform is CanonicalNode {
  if (transform == null) return false;
  // The semantic authority reader validates the DVT plugin identity.
  if (transform.kind !== 'dvt:transform') return false;
  if (transform.role !== 'transform') return false;
  return !edges.some((edge) => edge.sourceId === transform.id && edge.id !== sinkEdgeId);
}

function resolveTerminalSources(
  transform: CanonicalNode,
  incoming: readonly CanonicalEdge[],
  nodesById: ReadonlyMap<string, CanonicalNode>
): CanonicalNode[] | null {
  if (readWorkspaceDbtModelReference(transform) != null) return null;
  if (incoming.length === 0) return null;
  if (incoming.some((edge) => edge.relation !== 'lineage')) return null;
  const sources = incoming.map((edge) => nodesById.get(edge.sourceId)).filter(isProjectionSource);
  if (sources.length !== incoming.length) return null;
  if (new Set(sources.map((source) => source.id)).size !== sources.length) return null;
  return sources.sort((a, b) => a.id.localeCompare(b.id));
}

function isProjectionSource(source: CanonicalNode | undefined): source is CanonicalNode {
  if (source == null) return false;
  if (source.kind === 'dvt:source' && source.role === 'input') {
    if (['dvt', 'dvt.warehouse-source'].includes(source.pluginId)) return true;
  }
  return readWorkspaceDbtModelReference(source) != null;
}

function resolveProjectionInputs(sources: readonly CanonicalNode[]) {
  return sources.map((source) => {
    const signature = resolveCanvasDbtModelSignature(source);
    if (signature == null) {
      const sourceRef = ConnectedSourceRefSchema.parse(source.metadata?.connectedSourceRef);
      return { input: { sourceRef }, connection: sourceRef.connectionRef };
    }
    return {
      input: {
        sourceRef: null,
        producer: {
          nodeId: source.id,
          name: source.name,
          document: signature.document,
          connection: signature.connection,
        },
      },
      connection: signature.connection,
    };
  });
}

function hasValidProjectionSources(
  transform: CanonicalNode,
  sources: readonly CanonicalNode[]
): boolean {
  try {
    const authority = readDvtTransformAuthoringAuthority(transform);
    if (authority == null) return false;
    const prepared = resolveProjectionInputs(sources);
    const connections = prepared.map((entry) => entry.connection);
    if (connections.some((connection) => !hasSameConnectionRef(connections[0]!, connection)))
      return false;
    return hasConnectedRelationSources(
      decodeDvtSubstraitSemanticDocument(authority.semanticDocument),
      prepared.map((entry) => entry.input)
    );
  } catch {
    return false;
  }
}

function buildDraftSignature(
  canvasId: string,
  closure: TerminalProjectionClosure,
  selection: ExecutionSelection
): string {
  return JSON.stringify(
    toCanvasAuthoringSerializableValue({
      canvasId,
      selection,
      nodes: [
        ...closure.sources,
        closure.transform,
        ...(closure.root === closure.transform ? [] : [closure.root]),
      ].sort((left, right) => left.id.localeCompare(right.id)),
      edges: closure.edges,
    })
  );
}

export function buildProtectedDvtPreviewProjection(args: {
  readonly canvasId: string | null;
  readonly canonicalNodes: readonly CanonicalNode[];
  readonly canonicalEdges: readonly CanonicalEdge[];
  readonly selectionIntent: CanvasExecutionSelectionIntent;
  readonly workspaceNodeIds: readonly string[];
}): ProtectedDvtPreviewProjection {
  if (args.canvasId === null) {
    return { ok: false, cause: 'graph_authority_unavailable' };
  }

  const workspaceNodeIds = new Set(
    args.workspaceNodeIds.length > 0
      ? args.workspaceNodeIds
      : args.canonicalNodes.map((node) => node.id)
  );
  let projection: ReturnType<typeof projectProtectedPreviewGraph>;
  try {
    projection = projectProtectedPreviewGraph(args, workspaceNodeIds);
  } catch {
    return { ok: false, cause: 'protected_path_required' };
  }
  const { nodes, nodesById, edges } = projection;
  const candidates = selectTerminalProjectionCandidates(args.selectionIntent, nodes, nodesById);
  const closure = selectUniqueTerminalClosure(candidates, nodesById, edges);
  if (closure === undefined) return { ok: false, cause: 'protected_path_required' };
  return buildProtectedPreviewSelection(args.canvasId, closure);
}

function selectTerminalProjectionCandidates(
  intent: CanvasExecutionSelectionIntent,
  nodes: readonly CanonicalNode[],
  nodesById: ReadonlyMap<string, CanonicalNode>
): readonly CanonicalNode[] {
  if (intent.mode === 'explicit') {
    if (intent.nodeIds.length !== 1) return [];
    const candidate = nodesById.get(intent.nodeIds[0] ?? '');
    return candidate === undefined ? [] : [candidate];
  }
  return nodes.filter(
    (node) =>
      (node.kind === 'dvt:transform' && node.role === 'transform') ||
      (node.kind === 'dvt:sink' && node.role === 'output')
  );
}

function isProjectionSink(node: CanonicalNode): boolean {
  return node.pluginId === 'dvt' && node.kind === 'dvt:sink' && node.role === 'output';
}

function projectProtectedPreviewGraph(
  args: Pick<
    Parameters<typeof buildProtectedDvtPreviewProjection>[0],
    'canonicalNodes' | 'canonicalEdges'
  >,
  workspaceNodeIds: ReadonlySet<string>
) {
  const resolvedNodes = resolveWorkspaceNodeInstances(args.canonicalNodes);
  const contextEdges = projectWorkspaceNodeInstanceEdges(resolvedNodes, args.canonicalEdges);
  const nodes = resolvedNodes.filter((node) => workspaceNodeIds.has(node.id));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edges = contextEdges.filter(
    (edge) =>
      workspaceNodeIds.has(edge.sourceId) &&
      workspaceNodeIds.has(edge.targetId) &&
      isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge)
  );
  return { nodes, nodesById, edges };
}

function selectUniqueTerminalClosure(
  candidates: readonly CanonicalNode[],
  nodesById: ReadonlyMap<string, CanonicalNode>,
  edges: readonly CanonicalEdge[]
): TerminalProjectionClosure | undefined {
  const closures = candidates
    .map(function admitCandidate(candidate) {
      try {
        return resolveTerminalProjectionClosure(candidate, nodesById, edges);
      } catch {
        return null;
      }
    })
    .filter((closure): closure is TerminalProjectionClosure => closure !== null);
  return closures.length === 1 ? closures[0] : undefined;
}

function buildProtectedPreviewSelection(
  canvasId: string,
  closure: TerminalProjectionClosure
): Extract<ProtectedDvtPreviewProjection, { ok: true }> {
  const selection = parseExecutionSelection({
    mode: 'upstream',
    nodeIds: [closure.root.id],
  });
  const dependencies = [
    ...closure.sources.map((source) => source.id),
    ...(closure.root === closure.transform ? [] : [closure.transform.id]),
  ].sort();
  return {
    ok: true,
    selection,
    selectedRoot: { id: closure.root.id, name: closure.root.name },
    selectionMode: 'explicit',
    requestedRootNodeIds: [closure.root.id],
    derivedDependencyNodeIds: dependencies,
    scopedNodeIds: [...dependencies, closure.root.id].sort(),
    draftSignature: buildDraftSignature(canvasId, closure, selection),
  };
}
