import { createElement } from 'react';

import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import type { CanonicalNode } from '../../types/canonical';
import { buildCanvasAuthoringGraphProjection } from './canvasAuthoringGraphProjection';
import type { CanvasDraftEdge } from './canvasDraftSession';
import { useCanvasViewportGraphModel } from './useCanvasViewportGraphModel';

export type ViewportGraphModelArgs = Parameters<typeof useCanvasViewportGraphModel>[0];
export type ViewportGraphModelState = ReturnType<typeof useCanvasViewportGraphModel>;

export function buildCanonicalNode(
  id: string,
  kind: CanonicalNode['kind'],
  role: CanonicalNode['role']
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: kind.split(':', 1)[0] ?? 'dvt',
    kind,
    role,
    status: 'idle',
    tags: [],
  };
}

export function buildViewportGraphModelArgs(
  input: Readonly<{
    visibleNodeIds: readonly string[];
    visibleEdges: readonly CanvasDraftEdge[];
    draftSemanticGraph: Parameters<
      typeof buildCanvasAuthoringGraphProjection
    >[0]['draftSemanticGraph'];
    localCanonicalNodes?: readonly CanonicalNode[];
    persistedNodePositions?: ViewportGraphModelArgs['persistedNodePositions'];
  }>
): ViewportGraphModelArgs {
  const authoringProjection = buildCanvasAuthoringGraphProjection({
    visibleNodeIds: input.visibleNodeIds,
    visibleEdges: input.visibleEdges,
    draftSemanticGraph: input.draftSemanticGraph,
    localCanonicalNodes: input.localCanonicalNodes ?? [],
  });

  return {
    visibleNodeIds: [...input.visibleNodeIds],
    visibleEdges: [...input.visibleEdges],
    canonicalNodesById: authoringProjection.canonicalNodesById,
    canonicalEdgeIdBySignature: authoringProjection.canonicalEdgeIdBySignature,
    canonicalEdgeBySignature: authoringProjection.canonicalEdgeBySignature,
    columnLevelLineageEnabled: false,
    persistedNodePositions: input.persistedNodePositions ?? {},
  };
}

export async function renderViewportGraphModel(args: ViewportGraphModelArgs): Promise<{
  readState: () => ViewportGraphModelState | undefined;
  rerender: (nextArgs: ViewportGraphModelArgs) => Promise<void>;
  cleanup: () => Promise<void>;
}> {
  let observedState: ViewportGraphModelState | undefined;
  let currentArgs = args;

  function ViewportGraphModelProbe(): null {
    observedState = useCanvasViewportGraphModel(currentArgs);
    return null;
  }

  const mounted = await withTestQueryClient(createElement(ViewportGraphModelProbe));

  return {
    readState: () => observedState,
    rerender: async (nextArgs) => {
      currentArgs = nextArgs;
      await mounted.render(createElement(ViewportGraphModelProbe));
    },
    cleanup: mounted.cleanup,
  };
}
