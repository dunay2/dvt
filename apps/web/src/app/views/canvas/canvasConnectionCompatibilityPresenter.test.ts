import { describe, expect, it } from 'vitest';

import { getPluginPortMap } from '../../plugins/registry';
import type { CanonicalNode } from '../../types/canonical';
import { buildLargeWorkspaceGraphAuthoringDraft } from '../../services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import { buildCanvasConnectionCompatibilityByNodeId } from './canvasConnectionCompatibilityPresenter';

function node(
  id: string,
  kind: CanonicalNode['kind'],
  role: CanonicalNode['role'],
  pluginId = kind.split(':', 1)[0] ?? 'dvt'
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId,
    kind,
    role,
    status: 'idle',
    tags: [],
  };
}

describe('canvasConnectionCompatibilityPresenter', () => {
  it('keeps compatibility projection bounded on the canonical large graph', () => {
    const draft = buildLargeWorkspaceGraphAuthoringDraft();
    const canonicalNodes = draft.nodes.map((draftNode): CanonicalNode => ({
      ...draftNode,
      kind: `dvt:${draftNode.kind}`,
    }));
    const canonicalNodesById = new Map(
      canonicalNodes.map((candidate) => [candidate.id, candidate])
    );

    const startedAt = performance.now();
    const compatibilityByNodeId = buildCanvasConnectionCompatibilityByNodeId({
      visibleNodeIds: draft.nodeIds,
      visibleEdges: draft.edges,
      canonicalNodesById,
      pluginPortMap: getPluginPortMap(),
    });
    const durationMs = performance.now() - startedAt;

    expect(compatibilityByNodeId.size).toBe(1_000);
    expect(compatibilityByNodeId.get('large-node-00-00')?.source.state).toBe('available');
    expect(compatibilityByNodeId.get('large-node-24-00')?.source.state).toBe('unavailable');
    expect(durationMs).toBeLessThan(10_000);
  }, 15_000);

  it('projects compatible outgoing and incoming node names from the governed edge rail', () => {
    const source = {
      ...node('warehouse-source', 'dvt:source', 'input', 'dvt.warehouse-source'),
      metadata: {
        database: 'postgres',
        schema: 'public',
        table: 'orders',
      },
    };
    const model = node('orders-model', 'dvt:transform', 'transform', 'dbt');
    const sink = node('warehouse-sink', 'dvt:sink', 'output', 'dvt');
    const canonicalNodesById = new Map([
      [source.id, source],
      [model.id, model],
      [sink.id, sink],
    ]);

    const compatibilityByNodeId = buildCanvasConnectionCompatibilityByNodeId({
      visibleNodeIds: [source.id, model.id, sink.id],
      visibleEdges: [],
      canonicalNodesById,
      pluginPortMap: getPluginPortMap(),
    });

    expect(compatibilityByNodeId.get(source.id)?.source).toEqual({
      state: 'available',
      compatibleNodeNames: ['Orders Model'],
    });
    expect(compatibilityByNodeId.get(model.id)?.target).toEqual({
      state: 'available',
      compatibleNodeNames: ['orders'],
    });
    expect(compatibilityByNodeId.get(sink.id)?.source).toEqual({
      state: 'unavailable',
      compatibleNodeNames: [],
    });
  });

  it('marks ports blocked when candidate nodes exist but the current graph rejects every edge', () => {
    const firstModel = node('first-model', 'dvt:transform', 'transform', 'dbt');
    const secondModel = node('second-model', 'dvt:transform', 'transform', 'dbt');
    const canonicalNodesById = new Map([
      [firstModel.id, firstModel],
      [secondModel.id, secondModel],
    ]);

    const compatibilityByNodeId = buildCanvasConnectionCompatibilityByNodeId({
      visibleNodeIds: [firstModel.id, secondModel.id],
      visibleEdges: [{ sourceId: firstModel.id, targetId: secondModel.id }],
      canonicalNodesById,
      pluginPortMap: getPluginPortMap(),
    });

    expect(compatibilityByNodeId.get(firstModel.id)?.source).toEqual({
      state: 'blocked',
      compatibleNodeNames: [],
    });
    expect(compatibilityByNodeId.get(secondModel.id)?.target).toEqual({
      state: 'blocked',
      compatibleNodeNames: [],
    });
  });
});
