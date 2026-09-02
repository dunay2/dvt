/** Owned concern: keep the bounded edge execution gate through Canvas draft transitions. */
import {
  readWorkspaceGraphAuthoringEdgeExecutionGate,
  type WorkspaceGraphAuthoringEdge,
  type WorkspaceGraphAuthoringEdgeExecutionGateCommand,
} from '@dvt/contracts';

import type { CanvasDraftEdge } from './canvasDraftSession.types';

type EdgeIdentity = Pick<CanvasDraftEdge, 'sourceId' | 'targetId'>;

type EdgeExecutionGateCommand = EdgeIdentity & {
  gate: WorkspaceGraphAuthoringEdgeExecutionGateCommand;
};

function signature(edge: EdgeIdentity): string {
  return `${edge.sourceId}::${edge.targetId}`;
}

function fromAuthoringEdge(edge: WorkspaceGraphAuthoringEdge): CanvasDraftEdge {
  return {
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    ...(readWorkspaceGraphAuthoringEdgeExecutionGate(edge) === 'open'
      ? {}
      : { executionGate: 'closed' }),
  };
}

function preserveOnReplacement(
  currentEdges: readonly CanvasDraftEdge[],
  replacementEdges: readonly CanvasDraftEdge[]
): CanvasDraftEdge[] {
  const closedSignatures = new Set(
    currentEdges.filter((edge) => edge.executionGate === 'closed').map(signature)
  );
  return replacementEdges.map((edge) => ({
    ...edge,
    ...(edge.executionGate === 'closed' || closedSignatures.has(signature(edge))
      ? { executionGate: 'closed' as const }
      : {}),
  }));
}

function applyCommand(
  edges: readonly CanvasDraftEdge[],
  command: EdgeExecutionGateCommand
): CanvasDraftEdge[] | null {
  let edgeFound = false;
  const nextEdges = edges.map((edge) => {
    if (signature(edge) !== signature(command)) {
      return edge;
    }
    edgeFound = true;
    return {
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      ...(command.gate === 'closed' ? { executionGate: 'closed' as const } : {}),
    };
  });
  return edgeFound ? nextEdges : null;
}

function mergeRemote(
  localEdge: CanvasDraftEdge,
  baselineEdge: CanvasDraftEdge | undefined,
  remoteEdge: CanvasDraftEdge | undefined
): CanvasDraftEdge {
  const localGateChanged = localEdge.executionGate !== baselineEdge?.executionGate;
  return baselineEdge != null && remoteEdge != null && !localGateChanged ? remoteEdge : localEdge;
}

export const canvasDraftEdgeExecutionGate = {
  fromAuthoringEdge,
  preserveOnReplacement,
  applyCommand,
  mergeRemote,
} as const;
