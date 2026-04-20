import { vi } from 'vitest';

import type {
  CanvasHarnessMocks,
  CanvasHarnessState,
} from './useCanvasController.test.types';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export function configureCanvasHarnessHookAndProjectionMocks(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks
): void {
  const selectFromStore = (selector?: (value: typeof state.store) => unknown) =>
    typeof selector === 'function' ? selector(state.store) : state.store;

  mocks.useCanvasInteractionStore.mockImplementation(selectFromStore);
  mocks.useExecutionStore.mockImplementation(selectFromStore);
  mocks.useSessionStore.mockImplementation(selectFromStore);
  mocks.useUiLayoutStore.mockImplementation(selectFromStore);
  mocks.useCapabilitiesQuery.mockReturnValue({ data: undefined });
  mocks.resolveCanvasGraphStrategy.mockReturnValue({
    id: 'transformation',
    mapNodeToCanonical: vi.fn(
      (node: { id: string }) => state.canonicalNodes.find((n) => n.id === node.id) ?? null
    ),
    mapEdgeToCanonical: vi.fn(
      (edge: { id: string }) => state.canonicalEdges.find((e) => e.id === edge.id) ?? null
    ),
    parseDropPayload: vi.fn(() => null),
  });
  mocks.buildOverlayContext.mockReturnValue({ overlay: 'ctx' });
  mocks.buildNodeDecorations.mockImplementation(() => state.overlayDecorations);
  mocks.mapCanonicalNodeToCanvasNode.mockImplementation(
    (
      node: CanonicalNode,
      index: number,
      showColumns: boolean,
      _status: unknown,
      persistedPosition?: { x: number; y: number }
    ) => ({
      id: node.id,
      type: 'dbtNode',
      position: persistedPosition ?? { x: index * 100, y: 0 },
      data: { name: node.name, pluginKind: node.kind, showColumns, overlayDecoration: null },
    })
  );
  mocks.mapCanonicalEdgeToCanvasEdge.mockImplementation((edge: CanonicalEdge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
  }));
  mocks.getAllOverlays.mockReturnValue([{ id: 'impact' }]);
  mocks.getRegisteredPluginIds.mockReturnValue(new Set(['dbt', 'monitoring', 'cost']));
  mocks.buildNodesWithImpact.mockImplementation(({ nodes }: { nodes: unknown[] }) => nodes);
  mocks.useCanvasGraphHandlers.mockImplementation(() => state.graphHandlersResult);
  mocks.useCanvasExecutionActions.mockImplementation(() => state.executionActionsResult);
  mocks.useCanvasNavigationActions.mockImplementation(() => state.navigationActionsResult);
}
