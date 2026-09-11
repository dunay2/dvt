/** Owned concern: derive the bounded protected DVT Preview intent from Canvas state. */
import {
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
  parseExecutionSelection,
  type ExecutionSelection,
} from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import { toCanvasAuthoringSerializableValue } from './canvasAuthoringMetadata';
import { resolveEffectiveDvtConnectionRef } from './canvasDvtAuthoringModel';
import { decodeDvtSubstraitProjectionDocument } from './canvasDvtSubstraitProjection';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { canvasViewCopy } from './copy';

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
      readonly message: string;
    };

type TerminalProjectionClosure = {
  readonly source: CanonicalNode;
  readonly transform: CanonicalNode;
  readonly edge: CanonicalEdge;
};

function resolveTerminalProjectionClosure(
  transform: CanonicalNode,
  nodesById: ReadonlyMap<string, CanonicalNode>,
  edges: readonly CanonicalEdge[]
): TerminalProjectionClosure | null {
  if (
    transform.pluginId !== 'dvt' ||
    transform.kind !== 'dvt:transform' ||
    transform.role !== 'transform' ||
    edges.some((edge) => edge.sourceId === transform.id)
  ) {
    return null;
  }

  const incoming = edges.filter((edge) => edge.targetId === transform.id);
  if (incoming.length !== 1) return null;
  const edge = incoming[0];
  if (edge === undefined || edge.relation !== 'lineage') return null;
  const source = nodesById.get(edge.sourceId);
  if (
    source === undefined ||
    source.kind !== 'dvt:source' ||
    source.role !== 'input' ||
    (source.pluginId !== 'dvt' && source.pluginId !== 'dvt.warehouse-source')
  ) {
    return null;
  }

  try {
    if (resolveEffectiveDvtConnectionRef(source) === undefined) return null;
    const authority = readDvtTransformAuthoringAuthority(transform);
    if (authority === null) return null;
    decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  } catch {
    return null;
  }

  return { source, transform, edge };
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
      nodes: [closure.source, closure.transform].sort((left, right) =>
        left.id.localeCompare(right.id)
      ),
      edges: [closure.edge],
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
    return { ok: false, message: canvasViewCopy.planGraphAuthorityRefusedMessage };
  }

  const workspaceNodeIds = new Set(
    args.workspaceNodeIds.length > 0
      ? args.workspaceNodeIds
      : args.canonicalNodes.map((node) => node.id)
  );
  const nodes = args.canonicalNodes.filter((node) => workspaceNodeIds.has(node.id));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edges = args.canonicalEdges.filter(
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
      : nodes.filter((node) => node.kind === 'dvt:transform' && node.role === 'transform');
  const closures = candidates
    .map((candidate) => resolveTerminalProjectionClosure(candidate, nodesById, edges))
    .filter((closure): closure is TerminalProjectionClosure => closure !== null);

  if (closures.length !== 1) {
    return {
      ok: false,
      message: canvasViewCopy.previewProvenanceTransformPathRequiredMessage,
    };
  }

  const closure = closures[0];
  if (closure === undefined) {
    return {
      ok: false,
      message: canvasViewCopy.previewProvenanceTransformPathRequiredMessage,
    };
  }
  const selection = parseExecutionSelection({
    mode: 'upstream',
    nodeIds: [closure.transform.id],
  });
  return {
    ok: true,
    selection,
    selectionMode: 'explicit',
    requestedRootNodeIds: [closure.transform.id],
    derivedDependencyNodeIds: [closure.source.id],
    scopedNodeIds: [closure.source.id, closure.transform.id],
    draftSignature: buildDraftSignature(args.canvasId, closure, selection),
  };
}
