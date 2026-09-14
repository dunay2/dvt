/** Owned concern: derive the bounded protected DVT Preview intent from Canvas state. */
import {
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
  parseExecutionSelection,
  type ExecutionSelection,
  ConnectedSourceRefSchema,
} from '@dvt/contracts';
import { inspectDvtSubstraitNInputJoinDraft, hasSameConnectionRef } from '@dvt/postgres-projection';

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
  readonly sources: readonly CanonicalNode[];
  readonly transform: CanonicalNode;
  readonly edges: readonly CanonicalEdge[];
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

  const incoming = edges
    .filter((edge) => edge.targetId === transform.id)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (incoming.length === 0 || incoming.some((edge) => edge.relation !== 'lineage')) return null;
  const sources = incoming
    .map((edge) => nodesById.get(edge.sourceId))
    .filter(
      (source): source is CanonicalNode =>
        source !== undefined &&
        source.kind === 'dvt:source' &&
        source.role === 'input' &&
        (source.pluginId === 'dvt' || source.pluginId === 'dvt.warehouse-source')
    );
  if (
    sources.length !== incoming.length ||
    new Set(sources.map((source) => source.id)).size !== sources.length
  )
    return null;
  sources.sort((a, b) => a.id.localeCompare(b.id));

  try {
    if (sources.some((source) => resolveEffectiveDvtConnectionRef(source) === undefined))
      return null;
    const authority = readDvtTransformAuthoringAuthority(transform);
    if (authority === null) return null;
    const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
    if (sources.length > 1) {
      const inspection = inspectDvtSubstraitNInputJoinDraft(draft);
      if (!inspection.ok || inspection.projection.inputs.length !== sources.length) return null;
      const refs = sources.map((source) =>
        ConnectedSourceRefSchema.parse(source.metadata?.connectedSourceRef)
      );
      if (
        inspection.projection.inputs.some(
          (input) =>
            refs.filter(
              (ref) =>
                ref.sourceObjectId === input.sourceRef.sourceObjectId &&
                hasSameConnectionRef(ref.connectionRef, input.sourceRef.connectionRef)
            ).length !== 1
        )
      )
        return null;
    } else if (
      draft.sidecar.relations.filter((relation) => relation.sourceRef !== undefined).length !== 1
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return { sources, transform, edges: incoming };
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
      nodes: [...closure.sources, closure.transform].sort((left, right) =>
        left.id.localeCompare(right.id)
      ),
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
    derivedDependencyNodeIds: closure.sources.map((source) => source.id),
    scopedNodeIds: [...closure.sources.map((source) => source.id), closure.transform.id].sort(),
    draftSignature: buildDraftSignature(args.canvasId, closure, selection),
  };
}
