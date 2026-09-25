// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import {
  buildReadModelArgs,
  renderReadModel,
  readProjectedNodeData,
} from './useCanvasControllerReadModel.test-support';

describe('canonical relation card actions', () => {
  it.each([true, false])(
    'uses analyzed output authority without enabling input remapping (editable=%s)',
    async (editable) => {
      const graph = graphJoin();
      const model = graphModel(graph.document);
      const nodes = [...graph.sources, model];
      const edges = graph.sources.map((source) => ({
        id: source.id,
        sourceId: source.id,
        targetId: model.id,
        relation: 'lineage' as const,
      }));
      const presentationTruth = await projectCanvasNodePresentationTruth({
        node: model,
        nodes,
        edges,
      });
      expect(presentationTruth.columns.state).toBe('ready');
      const mapped = mapCanonicalNodeToCanvasNode({
        canonicalNode: model,
        index: 0,
        showColumns: true,
        presentationTruth,
      });
      const base = buildReadModelArgs({ canMutateGraph: editable });
      const args = {
        ...base,
        graphModel: {
          ...base.graphModel,
          nodes: [mapped],
          canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
        },
        visibleScope: { canonicalNodes: nodes, canonicalEdges: edges },
      };
      const mounted = await renderReadModel(args);
      try {
        const data = readProjectedNodeData(mounted.readState())!;
        expect(data.onToggleCanvasColumnOutput).toBe(
          editable ? args.columnActions.onToggleCanvasColumnOutput : undefined
        );
        expect(data.onReorderCanvasColumnOutput).toBe(
          editable ? args.columnActions.onReorderCanvasColumnOutput : undefined
        );
        expect(data.onColumnPortActivate).toBeUndefined();
        expect(data.onApplyCanvasColumnFunction).toBeUndefined();
        expect(data.onAddCanvasCalculatedColumn).toBeUndefined();
      } finally {
        await mounted.cleanup();
      }
    }
  );
});
