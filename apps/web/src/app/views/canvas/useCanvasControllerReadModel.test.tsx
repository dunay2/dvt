// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import {
  testNode,
  buildReadModelArgs,
  renderReadModel,
  readProjectedNodeData,
} from './useCanvasControllerReadModel.test-support';

describe('Canvas read model presentation and permissions', () => {
  it('keeps execution selection handlers when graph mutation and execution selection are allowed', async () => {
    const args = buildReadModelArgs({
      canMutateGraph: true,
      canSelectExecution: true,
    });
    const mounted = await renderReadModel(args);

    try {
      const nodeData = readProjectedNodeData(mounted.readState());

      expect(nodeData?.onDuplicateNode).toBe(args.cardActions.onDuplicateNode);
      expect(nodeData?.onRemoveNode).toBe(args.cardActions.onRemoveNode);
      expect(nodeData?.onAttachSchemaToNode).toBe(args.cardActions.onAttachSchemaToNode);
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
