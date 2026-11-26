/** Verify terminal publication and the complete executable dependency set in a protected Canvas selection. */
import {
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import type { ProtectedTransformSelection } from './dvtProtectedTransformSelection.js';

type SelectionEdge = WorkspaceGraphAuthoringDraft['edges'][number];
type SelectionNode = WorkspaceGraphAuthoringDraft['nodes'][number];

function requireSinkInput(
  edges: readonly SelectionEdge[],
  sink: SelectionNode,
  transform: SelectionNode
): void {
  const inputs = edges.filter((edge) => edge.targetId === sink.id);
  if (inputs.length !== 1 || inputs[0]!.sourceId !== transform.id)
    throw new Error('Sink requires exactly one edge from its semantic Transform.');
}

function requireTerminal(
  edges: readonly SelectionEdge[],
  transform: SelectionNode,
  sink: SelectionNode | undefined
): void {
  const terminal = sink?.id ?? transform.id;
  const leaks = edges
    .filter(isWorkspaceGraphAuthoringEdgeEffectivelyExecutable)
    .some(
      (edge) =>
        edge.sourceId === terminal || (edge.sourceId === transform.id && edge.targetId !== terminal)
    );
  if (leaks) throw new Error('Selected DVT publication must be terminal in the protected Canvas.');
}

function requireDependencyClosure(selection: ProtectedTransformSelection): void {
  const { draft, edges, sources, transforms, sink } = selection;
  const producers = new Set([...sources, ...transforms].map((node) => node.id));
  const consumers = new Set(transforms.map((node) => node.id));
  if (sink) consumers.add(sink.id);
  const selected = new Set(edges.map((edge) => edge.id));
  const duplicate =
    new Set(edges.map((edge) => JSON.stringify([edge.sourceId, edge.targetId]))).size !==
    edges.length;
  const invalid = edges.some(
    (edge) => !(producers.has(edge.sourceId) && consumers.has(edge.targetId))
  );
  const notLineage = edges.some(
    (edge) =>
      edge.relation !== 'lineage' || !isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(edge)
  );
  const missing = draft.edges
    .filter(isWorkspaceGraphAuthoringEdgeEffectivelyExecutable)
    .some((edge) => consumers.has(edge.targetId) && !selected.has(edge.id));
  if ([duplicate, invalid, notLineage, missing].some(Boolean))
    throw new Error('Selection must contain every effective producer dependency exactly once.');
}

export function requireDvtSelectionEdges(
  selection: ProtectedTransformSelection,
  preview: boolean
): void {
  if (!preview) requireTerminal(selection.draft.edges, selection.transform, selection.sink);
  if (selection.sink) requireSinkInput(selection.edges, selection.sink, selection.transform);
  requireDependencyClosure(selection);
}
