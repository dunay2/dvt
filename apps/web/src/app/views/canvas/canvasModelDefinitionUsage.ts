/** Owned concern: read all live placements, dependencies and sibling-Canvas uses before definition disposal. */
import { workspaceNodeDefinitionId } from '@dvt/contracts';
import { projectAuthoringNodeToCanonical } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession.types';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

export function readCanvasModelDefinitions(session: CanvasDraftSession): CanonicalNode[] {
  const saved = session.baseline.record?.draft.nodes.map(projectAuthoringNodeToCanonical) ?? [];
  return [
    ...new Map(
      [...saved, ...Object.values(session.localNodeCatalog ?? {})].map((node) => [node.id, node])
    ).values(),
  ];
}

function hasSemanticConsumer(nodes: readonly CanonicalNode[], id: string): boolean {
  return nodes.some((node) => {
    if (node.id === id || !['dvt:source', 'dvt:transform'].includes(node.kind)) return false;
    try {
      return (
        readDvtTransformAuthoringAuthority(node)?.semanticDocument.sidecar.relations.some(
          (relation) => relation.producerRef?.nodeId === id
        ) === true
      );
    } catch {
      // Unreadable authority cannot establish that deletion is safe.
      return true;
    }
  });
}

function usedInAnotherCanvas(session: CanvasDraftSession, id: string): boolean {
  const draft = session.baseline.record?.draft;
  const activeId = draft?.activeCanvasId ?? draft?.canvas.id;
  return (
    draft?.canvases?.some(
      (workspace) =>
        workspace.canvas.id !== activeId &&
        workspace.nodes.some((node) => node.id === id || workspaceNodeDefinitionId(node) === id)
    ) === true
  );
}

export function hasCanvasModelDefinitionUses(
  session: CanvasDraftSession,
  nodes: readonly CanonicalNode[],
  id: string
): boolean {
  if (usedInAnotherCanvas(session, id)) return true;
  const visible = new Set(session.workingSet.visibleNodeIds);
  if (nodes.some((node) => visible.has(node.id) && workspaceNodeDefinitionId(node) === id))
    return true;
  const identities = new Set([
    id,
    ...nodes.filter((node) => workspaceNodeDefinitionId(node) === id).map((node) => node.id),
  ]);
  const edges = [
    ...(session.baseline.record?.draft.edges ?? []),
    ...session.workingSet.visibleEdges,
    ...(session.localDefinitionEdges ?? []),
  ];
  if (edges.some((edge) => identities.has(edge.sourceId) || identities.has(edge.targetId)))
    return true;
  return [...identities].some((identity) => hasSemanticConsumer(nodes, identity));
}
