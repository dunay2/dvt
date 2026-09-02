/**
 * Owned concern: define the bounded user execution gate on workspace graph edges.
 *
 * Structural execution permission remains independent in `executionDependency`.
 * Only the exceptional closed state is persisted; unknown values fail closed.
 *
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @version 1.0.0
 */
import type { WorkspaceGraphAuthoringEdge } from './WorkspaceGraphAuthoringDraft.v1.js';

export const WORKSPACE_GRAPH_AUTHORING_EDGE_EXECUTION_GATE = {
  closed: 'closed',
} as const;

export type WorkspaceGraphAuthoringEdgeExecutionGate = 'closed';
export type WorkspaceGraphAuthoringEdgeExecutionGateCommand = 'open' | 'closed';
export type WorkspaceGraphAuthoringEdgeExecutionGateState = 'open' | 'closed' | 'invalid';

type EdgeExecutionMetadataOwner = Pick<WorkspaceGraphAuthoringEdge, 'metadata'>;

export function readWorkspaceGraphAuthoringEdgeExecutionGate(
  edge: EdgeExecutionMetadataOwner
): WorkspaceGraphAuthoringEdgeExecutionGateState {
  if (edge.metadata == null || !Object.hasOwn(edge.metadata, 'executionGate')) {
    return 'open';
  }

  return edge.metadata['executionGate'] === WORKSPACE_GRAPH_AUTHORING_EDGE_EXECUTION_GATE.closed
    ? 'closed'
    : 'invalid';
}

export function isWorkspaceGraphAuthoringEdgeEffectivelyExecutable(
  edge: EdgeExecutionMetadataOwner
): boolean {
  return (
    edge.metadata?.['executionDependency'] !== false &&
    readWorkspaceGraphAuthoringEdgeExecutionGate(edge) === 'open'
  );
}

export function withWorkspaceGraphAuthoringEdgeExecutionGate(
  metadata: Readonly<Record<string, unknown>> | undefined,
  gate: WorkspaceGraphAuthoringEdgeExecutionGateCommand
): Record<string, unknown> | undefined {
  const nextMetadata = { ...(metadata ?? {}) };
  if (gate === 'closed') {
    nextMetadata['executionGate'] = WORKSPACE_GRAPH_AUTHORING_EDGE_EXECUTION_GATE.closed;
  } else {
    delete nextMetadata['executionGate'];
  }

  return Object.keys(nextMetadata).length === 0 ? undefined : nextMetadata;
}
