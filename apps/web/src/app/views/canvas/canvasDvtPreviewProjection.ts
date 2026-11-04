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
  if (edges.some((edge) => edge.sourceId === root.id)) return null;
  const isSink = root.pluginId === 'dvt' && root.kind === 'dvt:sink' && root.role === 'output';
  const sinkEdges = isSink ? edges.filter((edge) => edge.targetId === root.id) : [];
  if (isSink && (sinkEdges.length !== 1 || sinkEdges[0]?.relation !== 'lineage')) return null;
  const transform = isSink ? nodesById.get(sinkEdges[0]!.sourceId) : root;
  if (
    transform === undefined ||
    transform.pluginId !== 'dvt' ||
    transform.kind !== 'dvt:transform' ||
    transform.role !== 'transform' ||
    edges.some((edge) => edge.sourceId === transform.id && edge.id !== sinkEdges[0]?.id)
  ) {
    return null;
  }

  const incoming = edges
    .filter((edge) => edge.targetId === transform.id)
    .sort((a, b) => a.id.localeCompare(b.id));
  const external = readWorkspaceDbtModelReference(transform) != null;
  if (
    (!external && incoming.length === 0) ||
    (external && incoming.length !== 0) ||
    incoming.some((edge) => edge.relation !== 'lineage')
  )
    return null;
  const sources = incoming
    .map((edge) => nodesById.get(edge.sourceId))
    .filter(
      (source): source is CanonicalNode =>
        source !== undefined &&
        ((source.kind === 'dvt:source' &&
          source.role === 'input' &&
          (source.pluginId === 'dvt' || source.pluginId === 'dvt.warehouse-source')) ||
          readWorkspaceDbtModelReference(source) != null)
    );
  if (
    sources.length !== incoming.length ||
    new Set(sources.map((source) => source.id)).size !== sources.length
  )
    return null;
  sources.sort((a, b) => a.id.localeCompare(b.id));

  try {
    if (external) {
      if (resolveCanvasDbtModelSignature(transform)?.connection.provider !== 'postgres')
        return null;
    } else {
      const authority = readDvtTransformAuthoringAuthority(transform);
      if (authority == null) return null;
      const inputs = sources.map((source) => {
        const signature = resolveCanvasDbtModelSignature(source);
        return signature == null
          ? { sourceRef: ConnectedSourceRefSchema.parse(source.metadata?.connectedSourceRef) }
          : {
              sourceRef: null,
              producer: {
                nodeId: source.id,
                name: source.name,
                document: signature.document,
                connection: signature.connection,
              },
            };
      });
      const connections = inputs.map(
        (input) => input.producer?.connection ?? input.sourceRef!.connectionRef
      );
      if (
        connections.some((connection) => !hasSameConnectionRef(connections[0]!, connection)) ||
        !hasConnectedRelationSources(
          decodeDvtSubstraitSemanticDocument(authority.semanticDocument),
          inputs
        )
      )
        return null;
    }
  } catch {
    return null;
  }

  return {
    sources,
    transform,
    root,
    edges: [...incoming, ...sinkEdges].sort((a, b) => a.id.localeCompare(b.id)),
  };
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
  let resolvedNodes: readonly CanonicalNode[];
  let contextEdges: readonly CanonicalEdge[];
  try {
    resolvedNodes = resolveWorkspaceNodeInstances(args.canonicalNodes);
    contextEdges = projectWorkspaceNodeInstanceEdges(resolvedNodes, args.canonicalEdges);
  } catch {
    return { ok: false, cause: 'protected_path_required' };
  }
  const nodes = resolvedNodes.filter((node) => workspaceNodeIds.has(node.id));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edges = contextEdges.filter(
    (edge) =>
      workspaceNodeIds.has(edge.sourceId) &&
      workspaceNodeIds.has(edge.targetId) &&
      isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge)
  );
  const candidates =
    args.selectionIntent.mode === 'explicit'
      ? args.selectionIntent.nodeIds.length === 1
        ? [nodesById.get(args.selectionIntent.nodeIds[0] ?? '')].filter(
            (node): node is CanonicalNode => node !== undefined
          )
        : []
      : nodes.filter(
          (node) =>
            (node.kind === 'dvt:transform' && node.role === 'transform') ||
            (node.kind === 'dvt:sink' && node.role === 'output')
        );
  const closures = candidates
    .map((candidate) => {
      try {
        return resolveTerminalProjectionClosure(candidate, nodesById, edges);
      } catch {
        return null;
      }
    })
    .filter((closure): closure is TerminalProjectionClosure => closure !== null);

  if (closures.length !== 1) {
    return {
      ok: false,
      cause: 'protected_path_required',
    };
  }

  const closure = closures[0];
  if (closure === undefined) {
    return {
      ok: false,
      cause: 'protected_path_required',
    };
  }
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
    selectionMode: 'explicit',
    requestedRootNodeIds: [closure.root.id],
    derivedDependencyNodeIds: dependencies,
    scopedNodeIds: [...dependencies, closure.root.id].sort(),
    draftSignature: buildDraftSignature(args.canvasId, closure, selection),
  };
}
