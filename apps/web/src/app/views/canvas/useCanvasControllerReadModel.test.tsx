// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { useCanvasControllerReadModel } from './useCanvasControllerReadModel';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';

type ReadModelArgs = Parameters<typeof useCanvasControllerReadModel>[0];
type ReadModelState = ReturnType<typeof useCanvasControllerReadModel>;
type ReadModelNodeData = {
  columns?: unknown;
  onDuplicateNode?: unknown;
  onRemoveNode?: unknown;
  onAttachSchemaToNode?: unknown;
  onToggleNodeSelection?: unknown;
  selectedForExecution?: unknown;
  showColumns?: unknown;
  activeColumnHandleId?: unknown;
  onColumnPortActivate?: unknown;
  onApplyCanvasColumnFunction?: unknown;
  onApplyCanvasStructuredField?: unknown;
  onAddCanvasCalculatedColumn?: unknown;
  onToggleCanvasColumnOutput?: unknown;
  onReorderCanvasColumnOutput?: unknown;
  onColumnDisclosureChange?: unknown;
  onAutomapColumns?: unknown;
  columnPortDirections?: unknown;
};

const testNode = {
  id: 'source-orders',
  name: 'Orders Source',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
} satisfies CanonicalNode;

let previousActEnvironment: boolean | undefined;

beforeEach(() => {
  const globalObject = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
  globalObject.IS_REACT_ACT_ENVIRONMENT = true;
});

function buildReadModelArgs(
  overrides?: Partial<Pick<ReadModelArgs, 'canMutateGraph' | 'canSelectExecution'>>
): ReadModelArgs {
  const graphNode = mapCanonicalNodeToCanvasNode({
    canonicalNode: testNode,
    index: 0,
    showColumns: false,
  });

  return {
    graphModel: {
      nodes: [graphNode],
      edges: [],
      canonicalNodesById: new Map([[testNode.id, testNode]]),
      onEdgesChange: vi.fn(),
    },
    visibleScope: {
      canonicalNodes: [testNode],
      canonicalEdges: [],
    },
    executionScope: {
      selectedNodeIds: [],
      workspaceNodeIds: [testNode.id],
    },
    uiScope: {
      selectedNodeIds: [],
      inspectorNodeId: null,
    },
    overlayModel: {
      activeRunId: null,
      overlayDecorations: new Map(),
      runStatusByNodeId: new Map(),
    },
    graphHandlers: {
      handleInspectNode: vi.fn(),
      handleDuplicateNode: vi.fn(),
      handleRemoveNode: vi.fn(),
      handleToggleNodeSelection: vi.fn(),
      handleAttachSchemaToNode: vi.fn(),
      activeColumnHandleId: null,
      handleColumnPortActivate: vi.fn(),
      handleApplyCanvasColumnFunction: vi.fn(),
      handleApplyCanvasStructuredField: vi.fn(),
      handleAddCanvasCalculatedColumn: vi.fn(),
      handleToggleCanvasColumnOutput: vi.fn(),
      handleReorderCanvasColumnOutput: vi.fn(),
      handleColumnDisclosureChange: vi.fn(),
      handleAutomapCanvasColumns: vi.fn(),
      handleRemoveColumnMapping: vi.fn(),
      resolveCanvasAlgebraicCompositionOperations: vi.fn(() => []),
      handleComposeCanvasNodes: vi.fn(),
    },
    onToggleExecutionSelection: vi.fn(),
    canMutateGraph: false,
    canSelectExecution: true,
    columnLevelLineageEnabled: false,
    ...overrides,
  };
}

async function renderReadModel(args: ReadModelArgs): Promise<{
  readState: () => ReadModelState | undefined;
  rerender: (nextArgs: ReadModelArgs) => Promise<void>;
  cleanup: () => Promise<void>;
}> {
  let observedState: ReadModelState | undefined;
  let currentArgs = args;

  function ReadModelProbe(): null {
    observedState = useCanvasControllerReadModel(currentArgs);
    return null;
  }

  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);

  await act(async () => {
    root.render(createElement(ReadModelProbe));
  });

  return {
    readState: () => observedState,
    rerender: async (nextArgs) => {
      currentArgs = nextArgs;
      await act(async () => {
        root.render(createElement(ReadModelProbe));
      });
    },
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function readProjectedNodeData(state: ReadModelState | undefined): ReadModelNodeData | undefined {
  return state?.nodesWithImpact[0]?.data as ReadModelNodeData | undefined;
}

afterEach(() => {
  const globalObject = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  if (previousActEnvironment === undefined) {
    Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
  } else {
    globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  }
  vi.clearAllMocks();
});

describe('useCanvasControllerReadModel', () => {
  it('keeps execution selection handlers when graph mutation and execution selection are allowed', async () => {
    const args = buildReadModelArgs({
      canMutateGraph: true,
      canSelectExecution: true,
    });
    const mounted = await renderReadModel(args);

    try {
      const nodeData = readProjectedNodeData(mounted.readState());

      expect(nodeData?.onDuplicateNode).toBe(args.graphHandlers.handleDuplicateNode);
      expect(nodeData?.onRemoveNode).toBe(args.graphHandlers.handleRemoveNode);
      expect(nodeData?.onAttachSchemaToNode).toBe(args.graphHandlers.handleAttachSchemaToNode);
      expect(nodeData?.onToggleNodeSelection).toBe(args.onToggleExecutionSelection);
    } finally {
      await mounted.cleanup();
    }
  });

  it('projects semantic health into the focusable React Flow node label', async () => {
    const args = buildReadModelArgs();
    const mounted = await renderReadModel(args);

    try {
      expect(mounted.readState()?.nodesWithImpact[0]?.ariaLabel).toBe(
        'Orders Source, Source, Ready'
      );

      await mounted.rerender({
        ...args,
        overlayModel: {
          ...args.overlayModel,
          runStatusByNodeId: new Map([[testNode.id, 'failed']]),
        },
      });

      expect(mounted.readState()?.nodesWithImpact[0]?.ariaLabel).toBe(
        'Orders Source, Source, Failed'
      );
    } finally {
      await mounted.cleanup();
    }
  });

  it('derives visible column lineage and attaches interactions without changing graph edges', async () => {
    const sourceRef = {
      schemaVersion: 'connected-source-ref.v1' as const,
      connectionRef: {
        schemaVersion: 'connection-ref.v1' as const,
        connectionId: 'warehouse-main',
        provider: 'postgres' as const,
      },
      sourceObjectId: 'raw.orders',
    };
    const sourceNode = {
      ...testNode,
      metadata: {
        schema: 'raw',
        tableName: 'orders',
        connectedSourceRef: sourceRef,
        columns: [{ name: 'order_id', type: 'integer' }],
      },
    } satisfies CanonicalNode;
    const modelNode = applyDvtSubstraitSemanticDocument(
      {
        ...testNode,
        id: 'model-orders',
        name: 'Orders Model',
        kind: 'dvt:transform',
        role: 'transform',
      },
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: {
            nodeId: sourceNode.id,
            schema: 'raw',
            table: 'orders',
            sourceRef,
            fields: [{ name: 'order_id', dataType: 'integer' }],
          },
          targetNodeId: 'model-orders',
          outputs: [{ fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' }],
        })
      )
    );
    const dependency = {
      id: 'source-to-model',
      sourceId: sourceNode.id,
      targetId: modelNode.id,
      relation: 'lineage' as const,
    };
    const base = buildReadModelArgs({ canMutateGraph: true });
    const graphNodes = [sourceNode, modelNode].map((node, index) => ({
      ...mapCanonicalNodeToCanvasNode({ canonicalNode: node, index, showColumns: true }),
      data: {
        ...mapCanonicalNodeToCanvasNode({ canonicalNode: node, index, showColumns: true }).data,
        columnDisclosureExpanded: true,
      },
    }));
    const args: ReadModelArgs = {
      ...base,
      graphModel: {
        nodes: graphNodes,
        edges: [],
        canonicalNodesById: new Map([sourceNode, modelNode].map((node) => [node.id, node])),
        onEdgesChange: vi.fn(),
      },
      visibleScope: {
        canonicalNodes: [sourceNode, modelNode],
        canonicalEdges: [dependency],
      },
      executionScope: {
        selectedNodeIds: [],
        workspaceNodeIds: [sourceNode.id, modelNode.id],
      },
    };
    const mounted = await renderReadModel(args);

    try {
      const state = mounted.readState();
      expect(state?.edgesWithImpact).toHaveLength(1);
      expect(state?.edgesWithImpact[0]).toMatchObject({
        type: 'columnLineage',
        source: sourceNode.id,
        target: modelNode.id,
        ariaLabel: 'order_id → order_id',
        data: { kind: 'column-lineage', removable: true },
      });
      const onRemove = state?.edgesWithImpact[0]?.data?.onRemove;
      expect(typeof onRemove).toBe('function');
      (onRemove as () => void)();
      expect(args.graphHandlers.handleRemoveColumnMapping).toHaveBeenCalledTimes(1);
      expect(args.graphModel.edges).toEqual([]);

      await act(async () => {
        state?.handleEdgesChange([
          { id: state.edgesWithImpact[0]?.id ?? '', type: 'select', selected: true },
        ]);
      });
      expect(mounted.readState()?.edgesWithImpact[0]?.selected).toBe(true);

      await act(async () => {
        mounted
          .readState()
          ?.handleEdgesChange([{ id: state?.edgesWithImpact[0]?.id ?? '', type: 'remove' }]);
      });
      expect(args.graphHandlers.handleRemoveColumnMapping).toHaveBeenCalledTimes(2);

      const sourceData = state?.nodesWithImpact[0]?.data as ReadModelNodeData;
      expect(sourceData.onColumnPortActivate).toBe(args.graphHandlers.handleColumnPortActivate);
      expect(sourceData.onColumnDisclosureChange).toBe(
        args.graphHandlers.handleColumnDisclosureChange
      );
      const modelData = state?.nodesWithImpact[1]?.data as ReadModelNodeData;
      expect(modelData.columnPortDirections).toEqual(['target', 'source']);
      expect(modelData.onAutomapColumns).toBe(args.graphHandlers.handleAutomapCanvasColumns);
    } finally {
      await mounted.cleanup();
    }
  });

  it('projects admitted Substrait function menus from connected column truth', async () => {
    const sourceNode = {
      ...testNode,
      pluginId: 'dvt.warehouse-source',
      metadata: {
        schema: 'raw',
        tableName: 'orders',
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-main',
            provider: 'postgres',
          },
          sourceObjectId: 'raw.orders',
        } as const,
        columns: [
          { name: 'customer', type: 'text' },
          { name: 'amount', type: 'numeric' },
        ],
      },
    } satisfies CanonicalNode;
    const projection = createDvtSubstraitProjectionDraft({
      source: {
        nodeId: sourceNode.id,
        schema: 'raw',
        table: 'orders',
        sourceRef: sourceNode.metadata.connectedSourceRef,
        fields: sourceNode.metadata.columns.map((column) => ({
          name: column.name,
          dataType: column.type,
        })),
      },
      targetNodeId: 'transform-orders',
      outputs: sourceNode.metadata.columns.map((column) => ({
        fieldId: `output:${column.name}`,
        name: column.name,
        sourceFieldName: column.name,
      })),
    });
    const transformNode = applyDvtSubstraitSemanticDocument(
      {
        ...testNode,
        id: 'transform-orders',
        name: 'Transform orders',
        kind: 'dvt:transform',
        role: 'transform',
      },
      encodeDvtSubstraitProjectionDocument(projection)
    );
    const dependency = {
      id: 'source-to-transform',
      sourceId: sourceNode.id,
      targetId: transformNode.id,
      relation: 'lineage' as const,
    };
    const base = buildReadModelArgs({ canMutateGraph: true });
    const graphNodes = [sourceNode, transformNode].map((node, index) => {
      const mapped = mapCanonicalNodeToCanvasNode({
        canonicalNode: node,
        index,
        showColumns: true,
      });
      return node.id === transformNode.id
        ? {
            ...mapped,
            data: {
              ...mapped.data,
              columns: sourceNode.metadata.columns,
              columnDisclosureExpanded: true,
            },
          }
        : mapped;
    });
    const args: ReadModelArgs = {
      ...base,
      graphModel: {
        nodes: graphNodes,
        edges: [
          {
            id: dependency.id,
            source: dependency.sourceId,
            target: dependency.targetId,
          },
        ],
        canonicalNodesById: new Map([sourceNode, transformNode].map((node) => [node.id, node])),
        onEdgesChange: vi.fn(),
      },
      visibleScope: {
        canonicalNodes: [sourceNode, transformNode],
        canonicalEdges: [],
      },
      executionScope: {
        selectedNodeIds: [],
        workspaceNodeIds: [sourceNode.id, transformNode.id],
      },
      columnLevelLineageEnabled: true,
    };
    const mounted = await renderReadModel(args);

    try {
      const transformData = mounted.readState()?.nodesWithImpact[1]?.data as ReadModelNodeData;
      const columns = transformData.columns as ReadonlyArray<{
        id: string;
        functionMenu?: Readonly<{
          category: string;
          items: readonly Readonly<{ name: string }>[];
        }>;
      }>;

      expect(transformData.onApplyCanvasColumnFunction).toBe(
        args.graphHandlers.handleApplyCanvasColumnFunction
      );
      expect(transformData.onApplyCanvasStructuredField).toBe(
        args.graphHandlers.handleApplyCanvasStructuredField
      );
      expect(transformData.onAddCanvasCalculatedColumn).toBe(
        args.graphHandlers.handleAddCanvasCalculatedColumn
      );
      expect(columns.find((column) => column.id === 'output:customer')?.functionMenu).toEqual({
        category: 'text',
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'trim' }),
          expect.objectContaining({ name: 'upper' }),
        ]),
      });
      expect(columns.find((column) => column.id === 'output:amount')?.functionMenu).toBeUndefined();
    } finally {
      await mounted.cleanup();
    }
  });

  it('keeps only round-trippable DBT output edits and withholds transform gestures', async () => {
    const columns = [{ name: 'order_id', type: 'text' }];
    const sourceNode = {
      ...testNode,
      pluginId: 'dvt.warehouse-source',
      metadata: {
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'local-postgres-proof',
            provider: 'postgres',
          },
          sourceObjectId: 'relation/dvt/public/orders',
        },
        sourceName: 'local_postgres_proof_dvt_public',
        schema: 'public',
        tableName: 'orders',
        columns,
      },
    } satisfies CanonicalNode;
    const modelNode = {
      ...testNode,
      id: 'dbt-model-orders',
      name: 'Orders Model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      metadata: {
        authority: 'dbt-project-files',
        dbt: { packageName: 'analytics' },
        typeLabel: 'Model',
      },
    } satisfies CanonicalNode;
    const dependency = {
      id: 'source-to-dbt-model',
      sourceId: sourceNode.id,
      targetId: modelNode.id,
      relation: 'lineage' as const,
    };
    const base = buildReadModelArgs({ canMutateGraph: true });
    const graphNodes = [sourceNode, modelNode].map((node, index) => {
      const mapped = mapCanonicalNodeToCanvasNode({
        canonicalNode: node,
        index,
        showColumns: true,
      });
      return {
        ...mapped,
        data: {
          ...mapped.data,
          columns,
          columnDisclosureExpanded: true,
        },
      };
    });
    const args: ReadModelArgs = {
      ...base,
      graphModel: {
        nodes: graphNodes,
        edges: [],
        canonicalNodesById: new Map([sourceNode, modelNode].map((node) => [node.id, node])),
        onEdgesChange: vi.fn(),
      },
      visibleScope: {
        canonicalNodes: [sourceNode, modelNode],
        canonicalEdges: [dependency],
      },
      executionScope: {
        selectedNodeIds: [],
        workspaceNodeIds: [sourceNode.id, modelNode.id],
      },
    };
    const mounted = await renderReadModel(args);

    try {
      const state = mounted.readState();
      const sourceData = state?.nodesWithImpact[0]?.data as ReadModelNodeData;
      expect(sourceData.onAddCanvasCalculatedColumn).toBeUndefined();
      expect(
        (sourceData.columns as ReadonlyArray<{ functionMenu?: unknown }>)[0]?.functionMenu
      ).toBeUndefined();
      expect(sourceData.onReorderCanvasColumnOutput).toBeUndefined();
      expect(state?.edgesWithImpact).toEqual([]);
      expect((state?.nodesWithImpact[1]?.data as ReadModelNodeData).columnPortDirections).toEqual([
        'target',
        'source',
      ]);
      expect(
        (state?.nodesWithImpact[1]?.data as ReadModelNodeData).onToggleCanvasColumnOutput
      ).toEqual(expect.any(Function));
      expect(
        (state?.nodesWithImpact[1]?.data as ReadModelNodeData).onReorderCanvasColumnOutput
      ).toEqual(args.graphHandlers.handleReorderCanvasColumnOutput);
      const modelData = state?.nodesWithImpact[1]?.data as ReadModelNodeData;
      expect(modelData.onApplyCanvasColumnFunction).toBeUndefined();
      expect(
        (modelData.columns as ReadonlyArray<{ functionMenu?: unknown }>)[0]?.functionMenu
      ).toBeUndefined();

      const staleModelNode = {
        ...modelNode,
        metadata: {
          ...modelNode.metadata,
          dbt: {
            projectionColumns: [{ name: 'retired_order_id', output: true }],
          },
        },
      } satisfies CanonicalNode;
      const staleGraphNodes = [sourceNode, staleModelNode].map((node, index) => ({
        ...mapCanonicalNodeToCanvasNode({ canonicalNode: node, index, showColumns: true }),
        data: {
          ...graphNodes[index]!.data,
          columns,
          columnDisclosureExpanded: true,
        },
      }));

      await mounted.rerender({
        ...args,
        graphModel: {
          ...args.graphModel,
          nodes: staleGraphNodes,
          canonicalNodesById: new Map([sourceNode, staleModelNode].map((node) => [node.id, node])),
        },
        visibleScope: {
          canonicalNodes: [sourceNode, staleModelNode],
          canonicalEdges: [dependency],
        },
      });

      expect(mounted.readState()?.edgesWithImpact).toEqual([]);
      expect(
        (mounted.readState()?.nodesWithImpact[1]?.data as ReadModelNodeData)
          .onToggleCanvasColumnOutput
      ).toEqual(expect.any(Function));
    } finally {
      await mounted.cleanup();
    }
  });

  it('does not offer column mapping controls for a transform with nonblank SQL authority', async () => {
    const sqlTransform = {
      ...testNode,
      id: 'sql-transform-orders',
      name: 'Orders SQL',
      kind: 'dvt:transform',
      role: 'transform',
      metadata: {
        sql: 'select order_id from public.orders',
        columns: [{ name: 'order_id', type: 'integer' }],
      },
    } satisfies CanonicalNode;
    const graphNode = mapCanonicalNodeToCanvasNode({
      canonicalNode: sqlTransform,
      index: 0,
      showColumns: true,
    });
    const base = buildReadModelArgs({ canMutateGraph: true });
    const args: ReadModelArgs = {
      ...base,
      graphModel: {
        nodes: [graphNode],
        edges: [],
        canonicalNodesById: new Map([[sqlTransform.id, sqlTransform]]),
        onEdgesChange: vi.fn(),
      },
      visibleScope: {
        canonicalNodes: [sqlTransform],
        canonicalEdges: [],
      },
      executionScope: {
        selectedNodeIds: [],
        workspaceNodeIds: [sqlTransform.id],
      },
      columnLevelLineageEnabled: true,
    };
    const mounted = await renderReadModel(args);

    try {
      const nodeData = readProjectedNodeData(mounted.readState());

      expect(nodeData?.columns).toEqual([
        expect.objectContaining({ name: 'order_id', type: 'integer' }),
      ]);
      expect(nodeData?.columnPortDirections).toEqual([]);
      expect(nodeData?.onAutomapColumns).toBeUndefined();
    } finally {
      await mounted.cleanup();
    }
  });

  it('preserves recorded column visibility through impact decoration when lineage overlay is off', async () => {
    const columns = [
      { name: 'order_id', type: 'integer' },
      { name: 'customer_id', type: 'text' },
    ];
    const sourceNode = {
      ...testNode,
      metadata: { columns },
    } satisfies CanonicalNode;
    const graphNode = mapCanonicalNodeToCanvasNode({
      canonicalNode: sourceNode,
      index: 0,
      showColumns: false,
    });
    const args = {
      ...buildReadModelArgs(),
      graphModel: {
        nodes: [graphNode],
        edges: [],
        canonicalNodesById: new Map([[sourceNode.id, sourceNode]]),
        onEdgesChange: vi.fn(),
      },
      visibleScope: {
        canonicalNodes: [sourceNode],
        canonicalEdges: [],
      },
      columnLevelLineageEnabled: false,
    };
    const mounted = await renderReadModel(args);

    try {
      const nodeData = readProjectedNodeData(mounted.readState());

      expect(nodeData?.columns).toMatchObject(columns);
      expect(nodeData?.columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'order_id',
            sourceHandleId: 'column:source:source-orders:order_id',
          }),
        ])
      );
      expect(nodeData?.showColumns).toBe(true);
    } finally {
      await mounted.cleanup();
    }
  });

  it('keeps execution selection handlers when graph mutation is blocked but planning is allowed', async () => {
    const args = buildReadModelArgs({
      canMutateGraph: false,
      canSelectExecution: true,
    });
    const mounted = await renderReadModel(args);

    try {
      const nodeData = readProjectedNodeData(mounted.readState());

      expect(nodeData?.onDuplicateNode).toBeUndefined();
      expect(nodeData?.onRemoveNode).toBeUndefined();
      expect(nodeData?.onAttachSchemaToNode).toBeUndefined();
      expect(nodeData?.onToggleNodeSelection).toBe(args.onToggleExecutionSelection);
    } finally {
      await mounted.cleanup();
    }
  });

  it('removes execution selection handlers when planning and running are blocked', async () => {
    const args = buildReadModelArgs({
      canMutateGraph: true,
      canSelectExecution: false,
    });
    const mounted = await renderReadModel(args);

    try {
      const nodeData = readProjectedNodeData(mounted.readState());

      expect(nodeData?.onToggleNodeSelection).toBeUndefined();
    } finally {
      await mounted.cleanup();
    }
  });
});
