// @vitest-environment jsdom
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
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

describe('Canvas read model lineage', () => {
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
    const graphNodes = await Promise.all(
      [sourceNode, modelNode].map(async (node, index) => {
        const projected = mapCanonicalNodeToCanvasNode({
          canonicalNode: node,
          index,
          showColumns: true,
          presentationTruth: await projectCanvasNodePresentationTruth({
            node,
            nodes: [sourceNode, modelNode],
            edges: [dependency],
          }),
        });
        return { ...projected, data: { ...projected.data, columnDisclosureExpanded: true } };
      })
    );
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
      expect(args.onRemoveColumnMapping).toHaveBeenCalledTimes(1);
      expect(args.graphModel.edges).toEqual([]);

      await act(async () => {
        state?.handleEdgesChange([
          { id: state.edgesWithImpact[0]?.id ?? '', type: 'select', selected: true },
        ]);
      });
      expect(mounted.readState()?.edgesWithImpact[0]?.selected).toBe(true);
      expect(mounted.readState()?.nodesWithImpact).toBe(state?.nodesWithImpact);

      await act(async () => {
        mounted
          .readState()
          ?.handleEdgesChange([{ id: state?.edgesWithImpact[0]?.id ?? '', type: 'remove' }]);
      });
      expect(args.onRemoveColumnMapping).toHaveBeenCalledTimes(2);

      const sourceData = state?.nodesWithImpact[0]?.data as ReadModelNodeData;
      expect(sourceData.onColumnPortActivate).toBe(args.columnActions.onColumnPortActivate);
      expect(sourceData.onColumnDisclosureChange).toBe(args.columnActions.onColumnDisclosureChange);
      const modelData = state?.nodesWithImpact[1]?.data as ReadModelNodeData;
      expect(modelData.columnPortDirections).toEqual(['target', 'source']);
      expect(modelData.onAutomapColumns).toBe(args.columnActions.onAutomapColumns);
    } finally {
      await mounted.cleanup();
    }
  });
});
