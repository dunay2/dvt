// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import {
  type ReadModelArgs,
  testNode,
  buildReadModelArgs,
  renderReadModel,
  readProjectedNodeData,
} from './useCanvasControllerReadModel.test-support';

describe('Canvas read model sqlAuthority', () => {
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
});
