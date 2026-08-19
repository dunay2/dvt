import { vi } from 'vitest';

import { DVT_AUTHORING_NODE_KINDS } from '../../plugins/dvt/dvtNodeTypeCatalog';
import { DBT_GRAPH_DRAFT_AUTHORING_NODE_KINDS } from '../../plugins/nodeTypeCatalog.dbt';
import type { CanvasHarnessMocks, CanvasHarnessState } from './useCanvasController.test.types';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

function configureZustandLikeStoreMock(
  storeMock: CanvasHarnessMocks['useSessionStore'],
  state: CanvasHarnessState
): void {
  storeMock.mockImplementation((selector?: (value: typeof state.store) => unknown) =>
    typeof selector === 'function' ? selector(state.store) : state.store
  );

  Object.assign(storeMock, {
    getState: vi.fn(() => state.store),
    setState: vi.fn((partialState: unknown) => {
      const nextState =
        typeof partialState === 'function'
          ? (partialState as (currentState: typeof state.store) => Partial<typeof state.store>)(
              state.store
            )
          : partialState;

      if (nextState && typeof nextState === 'object') {
        Object.assign(state.store, nextState);
      }
    }),
    subscribe: vi.fn(() => () => undefined),
  });
}

export function configureCanvasHarnessHookAndProjectionMocks(
  state: CanvasHarnessState,
  mocks: CanvasHarnessMocks
): void {
  const selectFromStore = (selector?: (value: typeof state.store) => unknown) =>
    typeof selector === 'function' ? selector(state.store) : state.store;
  const transformationGraphStrategy = {
    id: 'transformation',
    mapNodeToCanonical: vi.fn(
      (node: { id: string }) => state.canonicalNodes.find((n) => n.id === node.id) ?? null
    ),
    mapEdgeToCanonical: vi.fn(
      (edge: { id: string }) => state.canonicalEdges.find((e) => e.id === edge.id) ?? null
    ),
    parseDropPayload: vi.fn(() => null),
  };
  const dbtGraphStrategy = {
    id: 'dbt',
    mapNodeToCanonical: vi.fn(
      (node: { id: string }) => state.canonicalNodes.find((n) => n.id === node.id) ?? null
    ),
    mapEdgeToCanonical: vi.fn(
      (edge: { id: string }) => state.canonicalEdges.find((e) => e.id === edge.id) ?? null
    ),
    parseDropPayload: vi.fn(() => null),
  };

  mocks.useAuthorizationStore.mockImplementation(selectFromStore);
  mocks.useCanvasInteractionStore.mockImplementation(selectFromStore);
  mocks.useExecutionStore.mockImplementation(selectFromStore);
  configureZustandLikeStoreMock(mocks.useSessionStore, state);
  mocks.useUiLayoutStore.mockImplementation(selectFromStore);
  mocks.useCapabilitiesQuery.mockReturnValue({ data: undefined });
  mocks.resolveCanvasGraphStrategy.mockImplementation((strategyId?: unknown) =>
    strategyId === 'dbt' ? dbtGraphStrategy : transformationGraphStrategy
  );
  mocks.findCanvasGraphStrategy.mockImplementation((strategyId?: unknown) => {
    if (strategyId === 'dbt') {
      return dbtGraphStrategy;
    }
    if (strategyId === 'transformation') {
      return transformationGraphStrategy;
    }
    return null;
  });
  mocks.findCanvasRuntimeRegistration.mockImplementation((strategyId?: unknown) => {
    if (strategyId === 'dbt') {
      return {
        kind: 'dbt',
        graphStrategy: dbtGraphStrategy,
        nodeKinds: DBT_GRAPH_DRAFT_AUTHORING_NODE_KINDS,
        executionStrategy: {
          kind: 'not_executable',
        },
      };
    }
    if (strategyId === 'transformation' || strategyId === undefined) {
      return {
        kind: 'transformation',
        graphStrategy: transformationGraphStrategy,
        nodeKinds: DVT_AUTHORING_NODE_KINDS,
        executionStrategy: {
          kind: 'transformation_preview',
          previewProfile: 'transformation-sql-first-v2',
        },
      };
    }
    return null;
  });
  mocks.buildOverlayContext.mockReturnValue({ overlay: 'ctx' });
  mocks.buildNodeDecorations.mockImplementation(() => state.overlayDecorations);
  mocks.mapCanonicalNodeToCanvasNode.mockImplementation(
    ({
      canonicalNode: node,
      index,
      showColumns,
      persistedPosition,
    }: {
      canonicalNode: CanonicalNode;
      index: number;
      showColumns: boolean;
      persistedPosition?: { x: number; y: number };
    }) => ({
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
  mocks.getPluginPortMap.mockReturnValue(new Map());
  mocks.getAllCanvasKinds.mockReturnValue([
    {
      kind: 'dbt',
      pluginId: 'dbt',
      label: 'dbt',
      description: 'Model-first canvas for dbt resources and dependencies.',
      createTitle: 'dbt canvas',
      emptyState: {
        title: 'Start dbt canvas',
        editableMessage: 'Start this dbt canvas by adding a governed source, model, or test.',
      },
      nodeKinds: DBT_GRAPH_DRAFT_AUTHORING_NODE_KINDS,
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
      },
      nodeKinds: DVT_AUTHORING_NODE_KINDS,
    },
  ]);
  mocks.getRegisteredPluginIds.mockReturnValue(new Set(['dbt', 'monitoring', 'cost']));
  mocks.getSourceImportContributions.mockReturnValue([
    {
      id: 'dbt.source-yaml',
      pluginId: 'dbt',
      sourceType: 'database',
      artifactKind: 'dbt-source-yaml',
      options: [],
    },
  ]);
  mocks.buildCanvasNodeInteractionPresentation.mockImplementation(
    ({ nodes }: { nodes: unknown[] }) => nodes
  );
  mocks.useCanvasGraphHandlers.mockImplementation(() => state.graphHandlersResult);
  mocks.useCanvasExecutionActions.mockImplementation(() => state.executionActionsResult);
  mocks.useCanvasNavigationActions.mockImplementation(() => state.navigationActionsResult);
}
