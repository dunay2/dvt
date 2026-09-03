import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import type { WorkspaceGraphSnapshot } from '../../ports/workspace';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import type { CanvasDraftEdge, CanvasDraftSession } from './canvasDraftSession';
import type { CanvasAuthoringCanvasDocument } from './canvasDraftReadModel';
import { preserveProjectCanvasWorkspaces } from './canvasProjectCanvasLifecycle';

export type CanvasDraftLifecycleCanonicalSnapshot = {
  canonicalNodeIds: string[];
  canonicalEdges: CanvasDraftEdge[];
};

export type CanvasDraftLifecycleGraphNode = {
  id: string;
  position: {
    x: number;
    y: number;
  };
};

export type CanvasDraftLifecycleGraphStrategy = {
  mapNodeToCanonical: (node: { id: string }) => { id: string } | null;
  mapEdgeToCanonical: (edge: { id: string }) => { sourceId: string; targetId: string } | null;
};

export function buildCanonicalSnapshotFromWorkspaceSnapshot(
  graphSnapshot: WorkspaceGraphSnapshot,
  graphStrategy: CanvasDraftLifecycleGraphStrategy
): CanvasDraftLifecycleCanonicalSnapshot {
  const canonicalNodeIds = [
    ...new Set(
      graphSnapshot.nodes.flatMap((node) => {
        const canonicalNode = graphStrategy.mapNodeToCanonical(node);
        return canonicalNode == null ? [] : [canonicalNode.id];
      })
    ),
  ];
  const canonicalNodeIdSet = new Set(canonicalNodeIds);
  const canonicalEdges: CanvasDraftEdge[] = [];
  const seenEdgeSignatures = new Set<string>();

  for (const edge of graphSnapshot.edges) {
    const canonicalEdge = graphStrategy.mapEdgeToCanonical(edge);
    const canProjectCanonicalEdge =
      canonicalEdge != null &&
      canonicalNodeIdSet.has(canonicalEdge.sourceId) &&
      canonicalNodeIdSet.has(canonicalEdge.targetId);
    if (!canProjectCanonicalEdge) {
      continue;
    }

    const signature = `${canonicalEdge.sourceId}::${canonicalEdge.targetId}`;
    if (seenEdgeSignatures.has(signature)) {
      continue;
    }

    seenEdgeSignatures.add(signature);
    canonicalEdges.push({
      sourceId: canonicalEdge.sourceId,
      targetId: canonicalEdge.targetId,
    });
  }

  return {
    canonicalNodeIds,
    canonicalEdges,
  };
}

export function buildCurrentDraftPayload(
  graphNodes: CanvasDraftLifecycleGraphNode[],
  draftSession: CanvasDraftSession,
  canvasDocument: CanvasAuthoringCanvasDocument,
  baselineDraft: WorkspaceGraphAuthoringDraft | null,
  canonicalNodes: readonly CanonicalNode[],
  canonicalEdges: readonly CanonicalEdge[]
): WorkspaceGraphAuthoringDraft {
  const draftCanonicalNodes = [
    ...new Map(
      [...canonicalNodes, ...Object.values(draftSession.localNodeCatalog ?? {})].map((node) => [
        node.id,
        node,
      ])
    ).values(),
  ];
  const currentNodePositions = Object.fromEntries(
    graphNodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }])
  );
  const visibleNodeIds = draftSession.workingSet.visibleNodeIds.filter(
    (nodeId) => currentNodePositions[nodeId] != null
  );
  const knownCanonicalNodeIds = new Set(draftCanonicalNodes.map((node) => node.id));
  const buildableNodeIds = visibleNodeIds.filter((nodeId) => knownCanonicalNodeIds.has(nodeId));
  const visibleNodeIdSet = new Set(buildableNodeIds);
  const nodePositions: Record<string, { x: number; y: number }> = {};

  for (const nodeId of buildableNodeIds) {
    const position = currentNodePositions[nodeId];
    if (position != null) {
      nodePositions[nodeId] = position;
    }
  }

  const activeDraft = buildCanvasAuthoringDraft({
    canvas: {
      ...(canvasDocument.id == null ? {} : { id: canvasDocument.id }),
      kind: canvasDocument.kind,
      title: canvasDocument.title,
      ...(canvasDocument.environmentId == null
        ? {}
        : { environmentId: canvasDocument.environmentId }),
      ...(canvasDocument.defaultPermission == null
        ? {}
        : { defaultPermission: canvasDocument.defaultPermission }),
    },
    nodeIds: buildableNodeIds,
    nodePositions,
    visibleEdges: draftSession.workingSet.visibleEdges.filter(
      (edge) => visibleNodeIdSet.has(edge.sourceId) && visibleNodeIdSet.has(edge.targetId)
    ),
    canonicalNodes: draftCanonicalNodes,
    canonicalEdges,
  });

  return preserveProjectCanvasWorkspaces({
    currentDraft: activeDraft,
    baselineDraft,
  });
}

export function isCurrentDraftProjectable(
  currentDraftPayload: WorkspaceGraphAuthoringDraft,
  draftSession: CanvasDraftSession
): boolean {
  return (
    currentDraftPayload.nodeIds.length === draftSession.workingSet.visibleNodeIds.length &&
    currentDraftPayload.nodes.length === draftSession.workingSet.visibleNodeIds.length &&
    currentDraftPayload.edges.length === draftSession.workingSet.visibleEdges.length
  );
}
