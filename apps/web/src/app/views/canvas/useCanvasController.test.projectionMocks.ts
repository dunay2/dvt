import { vi } from 'vitest';

import { DBT_NODE_KINDS, DVT_AUTHORING_NODE_KINDS } from '../../plugins/nodeTypeCatalog.dbt';
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
    authoringPolicy: {
      toolbarMode: 'transformation',
      enforceTransformationTopology: true,
    },
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
  mocks.getAllCanvasKinds.mockReturnValue([
    {
      kind: 'dbt',
      pluginId: 'dbt',
      label: 'dbt',
      description: 'Model-first canvas for dbt resources and dependencies.',
      createTitle: 'dbt canvas',
      emptyState: {
        title: 'Start dbt canvas',
        editableMessage:
          'Start this dbt canvas by adding a governed source, model, snapshot, exposure, or metric.',
        firstNodeLabel: 'Add first dbt node',
        firstNodeHelper:
          'Choose a governed dbt resource kind to start modeling this workspace lineage graph.',
      },
      nodeKinds: DBT_NODE_KINDS,
    },
    {
      kind: 'transformation',
      pluginId: 'dvt',
      label: 'Transformation',
      description: 'Flow-based transformation canvas for the protected authoring draft.',
      createTitle: 'Transformation canvas',
      emptyState: {
        title: 'Start transformation canvas',
        editableMessage:
          'Start this transformation canvas by adding a governed source, SQL transform, or sink node.',
        firstNodeLabel: 'Add first transformation node',
        firstNodeHelper:
          'Choose a governed transformation node kind to start this protected authoring flow.',
      },
      nodeKinds: DVT_AUTHORING_NODE_KINDS,
    },
  ]);
  mocks.getRegisteredPluginIds.mockReturnValue(new Set(['dbt', 'monitoring', 'cost']));
  mocks.buildNodesWithImpact.mockImplementation(({ nodes }: { nodes: unknown[] }) => nodes);
  mocks.useCanvasGraphHandlers.mockImplementation(() => state.graphHandlersResult);
  mocks.useCanvasExecutionActions.mockImplementation(() => state.executionActionsResult);
  mocks.useCanvasNavigationActions.mockImplementation(() => state.navigationActionsResult);
}
