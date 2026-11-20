// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import {
  testNode,
  buildReadModelArgs,
  renderReadModel,
  readProjectedNodeData,
} from './useCanvasControllerReadModel.test-support';

describe('Canvas read model presentation and permissions', () => {
  it('reverses only zoom-driven column disclosure when leaving maximum zoom', async () => {
    const args = buildReadModelArgs();
    const [node] = args.graphModel.nodes;
    const nodes = [
      { ...node!, data: { ...node!.data, showColumns: true, columnDisclosureExpanded: false } },
      {
        ...node!,
        id: 'already-open',
        data: { ...node!.data, showColumns: true, columnDisclosureExpanded: true },
      },
    ];
    const belowMaximum = { ...args, graphModel: { ...args.graphModel, nodes } };
    const mounted = await renderReadModel(belowMaximum);
    try {
      const readDisclosure = (): unknown[] | undefined =>
        mounted.readState()?.nodesWithImpact.map(({ data }) => data.columnDisclosureExpanded);
      expect(readDisclosure()).toEqual([false, true]);

      await mounted.rerender({ ...belowMaximum, atMaximumZoom: true });
      expect(readDisclosure()).toEqual([true, true]);
      expect(nodes.map(({ data }) => data.columnDisclosureExpanded)).toEqual([false, true]);
      expect(args.columnActions.onColumnDisclosureChange).not.toHaveBeenCalled();

      await mounted.rerender(belowMaximum);
      expect(readDisclosure()).toEqual([false, true]);

      await mounted.rerender({ ...belowMaximum, atMaximumZoom: true });
      const change = readProjectedNodeData(mounted.readState())?.onColumnDisclosureChange;
      expect(typeof change).toBe('function');
      await act(() => {
        (change as (id: string, expanded: boolean) => void)(testNode.id, false);
      });
      expect(readDisclosure()).toEqual([false, true]);
      expect(args.columnActions.onColumnDisclosureChange).toHaveBeenCalledWith(testNode.id, false);
      await mounted.rerender(belowMaximum);
      await mounted.rerender({ ...belowMaximum, atMaximumZoom: true });
      expect(readDisclosure()).toEqual([true, true]);
    } finally {
      await mounted.cleanup();
    }
  });

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
