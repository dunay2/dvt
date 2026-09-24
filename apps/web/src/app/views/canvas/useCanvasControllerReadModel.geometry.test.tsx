// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import {
  type ReadModelArgs,
  type ReadModelNodeData,
  testNode,
  buildReadModelArgs,
  renderReadModel,
} from './useCanvasControllerReadModel.test-support';
import { afterEach } from 'vitest';
import * as validation from './transformationGraphValidation';
import * as lineage from './canvasColumnLineageProjection';
import * as menus from './canvasColumnFunctionMenuProjection';
const semanticProjectionCounters = {
  transformationValidation: vi.spyOn(validation, 'validateTransformationGraph'),
  columnLineage: vi.spyOn(lineage, 'projectCanvasColumnLineage'),
  columnFunctionMenus: vi.spyOn(menus, 'projectCanvasColumnFunctionMenus'),
};
afterEach(() => vi.clearAllMocks());

describe('Canvas read model geometry', () => {
  it('changes only the moved projection during a 30-node geometry frame', async () => {
    const canonicalNodes = Array.from(
      { length: 30 },
      (_, index) =>
        ({
          ...testNode,
          id: 'source-' + index,
          name: 'Source ' + index,
        }) satisfies CanonicalNode
    );
    const graphNodes = canonicalNodes.map((node, index) =>
      mapCanonicalNodeToCanvasNode({
        canonicalNode: node,
        index,
        showColumns: false,
      })
    );
    const base = buildReadModelArgs({ canMutateGraph: true });
    const args: ReadModelArgs = {
      ...base,
      graphModel: {
        nodes: graphNodes,
        edges: [],
        canonicalNodesById: new Map(canonicalNodes.map((node) => [node.id, node])),
        onEdgesChange: vi.fn(),
      },
      visibleScope: {
        canonicalNodes,
        canonicalEdges: [],
      },
      executionScope: {
        selectedNodeIds: [],
        workspaceNodeIds: canonicalNodes.map((node) => node.id),
      },
    };
    const mounted = await renderReadModel(args);

    try {
      const before = mounted.readState()?.nodesWithImpact;
      expect(before).toHaveLength(30);
      expect(semanticProjectionCounters.transformationValidation).toHaveBeenCalledTimes(1);
      expect(semanticProjectionCounters.columnLineage).toHaveBeenCalledTimes(1);
      expect(semanticProjectionCounters.columnFunctionMenus).toHaveBeenCalledTimes(30);
      semanticProjectionCounters.transformationValidation.mockClear();
      semanticProjectionCounters.columnLineage.mockClear();
      semanticProjectionCounters.columnFunctionMenus.mockClear();

      const movedSourceNode = {
        ...graphNodes[0]!,
        position: { x: 640, y: 480 },
        dragging: true,
      };
      await mounted.rerender({
        ...args,
        graphModel: {
          ...args.graphModel,
          nodes: [movedSourceNode, ...graphNodes.slice(1)],
        },
      });

      const after = mounted.readState()?.nodesWithImpact;
      expect(after).toHaveLength(30);
      expect(after?.[0]).not.toBe(before?.[0]);
      expect(after?.[0]?.position).toEqual({ x: 640, y: 480 });
      expect(after?.[0]?.data).toBe(before?.[0]?.data);

      for (let index = 1; index < 30; index += 1) {
        expect(after?.[index]).toBe(before?.[index]);
        expect(after?.[index]?.data).toBe(before?.[index]?.data);
      }

      expect(semanticProjectionCounters.transformationValidation).toHaveBeenCalledTimes(0);
      expect(semanticProjectionCounters.columnLineage).toHaveBeenCalledTimes(0);
      expect(semanticProjectionCounters.columnFunctionMenus).toHaveBeenCalledTimes(0);

      const retainedData = after?.[12]?.data as ReadModelNodeData;
      (retainedData.onInspectNode as (nodeId: string) => void)(canonicalNodes[12]!.id);
      expect(args.cardActions.onInspectNode).toHaveBeenCalledWith(canonicalNodes[12]!.id);
    } finally {
      await mounted.cleanup();
    }
  });

  it('materializes semantic inputs only for mutation and reuses them across geometry changes', async () => {
    const args = buildReadModelArgs({ canMutateGraph: false });
    const values = vi.spyOn(args.graphModel.canonicalNodesById, 'values');
    const mounted = await renderReadModel(args);
    try {
      expect(values).not.toHaveBeenCalled();
      const moved = {
        ...args,
        graphModel: {
          ...args.graphModel,
          nodes: args.graphModel.nodes.map((node) => ({ ...node, position: { x: 120, y: 80 } })),
        },
      };
      await mounted.rerender(moved);
      expect(values).not.toHaveBeenCalled();
      await mounted.rerender({ ...moved, canMutateGraph: true });
      expect(values).toHaveBeenCalledTimes(1);
      await mounted.rerender({ ...args, canMutateGraph: true });
      expect(values).toHaveBeenCalledTimes(1);
    } finally {
      await mounted.cleanup();
      values.mockRestore();
    }
  });
});
