/** Owned concern: keep the bounded edge execution gate through Canvas draft transitions. */
import {
  readWorkspaceGraphAuthoringEdgeExecutionGate,
  readDvtInputBindings,
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
  const inputBindings = readDvtInputBindings(edge);
  return {
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    ...(inputBindings == null ? {} : { inputBindings }),
    ...(readWorkspaceGraphAuthoringEdgeExecutionGate(edge) === 'open'
      ? {}
      : { executionGate: 'closed' }),
  };
}

function preserveOnReplacement(
  currentEdges: readonly CanvasDraftEdge[],
  replacementEdges: readonly CanvasDraftEdge[]
): CanvasDraftEdge[] {
  const currentById = new Map(currentEdges.map((edge) => [signature(edge), edge]));
  return replacementEdges.map((edge) => {
    const current = currentById.get(signature(edge));
    const inputBindings = edge.inputBindings ?? current?.inputBindings;
    return {
      ...edge,
      ...(inputBindings == null ? {} : { inputBindings }),
      ...(edge.executionGate === 'closed' || current?.executionGate === 'closed'
        ? { executionGate: 'closed' as const }
        : {}),
    };
  });
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
      ...(edge.inputBindings == null ? {} : { inputBindings: edge.inputBindings }),
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
  if (baselineEdge == null || remoteEdge == null) return localEdge;
  const executionGate =
    localEdge.executionGate !== baselineEdge.executionGate
      ? localEdge.executionGate
      : remoteEdge.executionGate;
  const inputBindings =
    JSON.stringify(localEdge.inputBindings) !== JSON.stringify(baselineEdge.inputBindings)
      ? localEdge.inputBindings
      : remoteEdge.inputBindings;
  return {
    sourceId: localEdge.sourceId,
    targetId: localEdge.targetId,
    ...(executionGate == null ? {} : { executionGate }),
    ...(inputBindings == null ? {} : { inputBindings }),
  };
}

export const canvasDraftEdgeExecutionGate = {
  fromAuthoringEdge,
  preserveOnReplacement,
  applyCommand,
  mergeRemote,
} as const;
