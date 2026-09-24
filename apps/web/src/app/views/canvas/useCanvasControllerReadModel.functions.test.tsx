// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import {
  type ReadModelArgs,
  type ReadModelNodeData,
  testNode,
  buildReadModelArgs,
  renderReadModel,
} from './useCanvasControllerReadModel.test-support';

describe('Canvas read model functions', () => {
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
              columns: sourceNode.metadata.columns.map((column) => ({
                ...column,
                type: 'unknown',
              })),
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
        type: string;
        functionMenu?: Readonly<{
          category: string;
          items: readonly Readonly<{ name: string }>[];
        }>;
      }>;

      expect(transformData.onApplyCanvasColumnFunction).toBe(
        args.columnActions.onApplyCanvasColumnFunction
      );
      expect(transformData.resolveCanvasColumnCompositionFunctions).toEqual(expect.any(Function));
      expect(
        (
          transformData.resolveCanvasColumnCompositionFunctions as (args: {
            targetType: string;
            sourceType: string;
          }) => readonly Readonly<{ name: string }>[]
        )({ targetType: 'text', sourceType: 'text' })
      ).toEqual([
        expect.objectContaining({ name: 'coalesce', minimumArgumentCount: 2 }),
        expect.objectContaining({
          name: 'concat',
          minimumArgumentCount: 2,
          maximumArgumentCount: 2,
        }),
      ]);
      expect(transformData.onApplyCanvasStructuredField).toBe(
        args.columnActions.onApplyCanvasStructuredField
      );
      expect(transformData.onAddCanvasCalculatedColumn).toBe(
        args.columnActions.onAddCanvasCalculatedColumn
      );
      expect(
        (
          transformData.expressionInputColumns as ReadonlyArray<{
            id: string;
            name: string;
          }>
        ).map((column) => column.name)
      ).toEqual(['customer', 'amount']);
      expect(columns.find((column) => column.id === 'output:customer')?.type).toBe('text');
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
});
