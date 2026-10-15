// @vitest-environment jsdom
/** Updating a schema suspends commands, not the already displayed field controls. */
import { act, createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import { CanvasPresentationAnalysis } from './canvasPresentationAnalysis';
import { useCanvasNodePresentations } from './useCanvasNodePresentations';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { projectCanvasNodeColumnInteraction } from './canvasNodeColumnInteraction';
import { pendingCanvasNodePresentation } from './canvasNodePresentationBase';
import {
  createModelOutputDependencyFixture,
  selectModelDependencyOutputs,
} from './canvasModelOutputDependency.test-support';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

afterEach(() => vi.restoreAllMocks());
describe('pending field presentation', () => {
  it('allows exact Input recovery targets without publishing unavailable Output ports', async () => {
    const graph = await createModelOutputDependencyFixture();
    const producer = await selectModelDependencyOutputs(graph.producer, ['customer']);
    const nodes = graph.nodes.map((node) => (node.id === producer.id ? producer : node));
    const truth = await projectCanvasNodePresentationTruth({
      node: graph.consumer,
      nodes,
      edges: graph.edges,
    });
    const command = vi.fn();
    const projected = projectCanvasNodeColumnInteraction(
      {
        id: graph.consumer.id,
        position: { x: 0, y: 0 },
        data: {
          presentationTruth: truth,
          onMapCanvasInput: command,
          onColumnPortActivate: command,
          onToggleCanvasColumnOutput: command,
        },
      },
      {
        canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
        columnFunctionEdges: graph.edges,
        readOnlyColumnLineageNodeIds: new Set(),
      }
    );
    expect(projected.data.onMapCanvasInput).toBe(command);
    expect(projected.data.onColumnPortActivate).toBe(command);
    expect(projected.data.columnPortDirections).toEqual(['target']);
    expect(projected.data.onToggleCanvasColumnOutput).toBeUndefined();
    const pending = projectCanvasNodeColumnInteraction(
      {
        ...projected,
        data: {
          ...projected.data,
          presentationTruth: { ...truth, columns: { ...truth.columns, state: 'pending' } },
        },
      },
      {
        canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
        columnFunctionEdges: graph.edges,
        readOnlyColumnLineageNodeIds: new Set(),
      }
    );
    expect(pending.data.onMapCanvasInput).toBeUndefined();
    expect(pending.data.columnPortDirections).toEqual([]);
  });
  it.each(['pending', 'unavailable'] as const)(
    'blocks column commands and ports while fields are %s',
    (state) => {
      const { document, sources } = graphJoin();
      const model = graphModel(document);
      const nodes = [...sources, model];
      const edges = sources.map((source) => ({ sourceId: source.id, targetId: model.id }));
      for (const node of nodes) {
        const initial = pendingCanvasNodePresentation({ node, nodes, edges });
        const command = vi.fn();
        const projected = projectCanvasNodeColumnInteraction(
          {
            id: node.id,
            position: { x: 0, y: 0 },
            data: {
              presentationTruth: { ...initial, columns: { ...initial.columns, state } },
              onColumnPortActivate: command,
              onApplyCanvasStructuredField: command,
              onAddCanvasCalculatedColumn: command,
              onToggleCanvasColumnOutput: command,
              onReorderCanvasColumnOutput: command,
              onAutomapColumns: command,
            },
          },
          {
            canonicalNodesById: new Map(nodes.map((value) => [value.id, value])),
            columnFunctionEdges: edges,
            readOnlyColumnLineageNodeIds: new Set(),
          }
        );
        expect(Object.values(projected.data)).not.toContain(command);
        expect(projected.data.columnPortDirections).toEqual([]);
      }
    }
  );
  it('retains displayed fields until the new schema settles without publishing them as current', async () => {
    const { session, document, sources } = graphJoin();
    const original = graphModel(document);
    let current = original;
    let values!: ReturnType<typeof useCanvasNodePresentations>;
    const edges = sources.map((source) => ({ sourceId: source.id, targetId: original.id }));
    function Probe(): null {
      values = useCanvasNodePresentations({ nodes: [...sources, current], edges });
      return null;
    }
    const mounted = await withTestQueryClient(createElement(Probe));
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    try {
      const previous = values.get(original.id)!;
      expect(previous.columns.state).toBe('ready');
      const query = CanvasPresentationAnalysis.prototype.query;
      vi.spyOn(CanvasPresentationAnalysis.prototype, 'query').mockImplementation(async function (
        this: CanvasPresentationAnalysis,
        node,
        signal
      ) {
        if (node.id === original.id) await pending;
        return query.call(this, node, signal);
      });
      const changed = await changeSelectedRelationOutputs(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        outputs: [{ slot: 0, alias: 'retained' }],
      });
      current = graphModel(changed);
      await mounted.render(createElement(Probe));
      const updating = values.get(original.id)!;
      expect(updating.columns.state).toBe('pending');
      expect(updating.columns.visible).toBe(previous.columns.visible);
      expect(updating.code.kind).not.toBe('canonical');
      await act(async () => {
        finish();
        await pending;
      });
      expect(values.get(original.id)?.columns.state).toBe('ready');
      expect(values.get(original.id)?.columns.declared.map((field) => field.name)).toEqual([
        'retained',
      ]);
    } finally {
      finish();
      await mounted.cleanup();
    }
  });
});
