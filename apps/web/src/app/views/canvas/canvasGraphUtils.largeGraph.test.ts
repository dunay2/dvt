import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';
import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { buildLargeWorkspaceGraphAuthoringDraft } from '../../services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import { getLayoutedElements } from './canvasGraphUtils';

const LARGE_GRAPH_NODE_COUNT = 1_000;
const LARGE_GRAPH_EDGE_COUNT = 1_920;
const LARGE_GRAPH_GRID_SIZE = 24;
const LARGE_GRAPH_LAYOUT_CPU_BUDGET_MS = 30_000;
const LARGE_GRAPH_LAYOUT_TEST_TIMEOUT_MS = 60_000;

function projectDraftToFlowGraph(): { nodes: Node[]; edges: Edge[] } {
  const draft = buildLargeWorkspaceGraphAuthoringDraft();

  return {
    nodes: draft.nodes.map((node) => ({
      id: node.id,
      position: draft.nodePositions[node.id] ?? { x: 0, y: 0 },
      data: {
        name: node.name,
        pluginId: node.pluginId,
        kind: node.kind,
        role: node.role,
      },
    })),
    edges: draft.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
    })),
  };
}

describe('large Canvas graph regression fixture', () => {
  it('builds one deterministic contract-valid layered DAG', () => {
    const draft = buildLargeWorkspaceGraphAuthoringDraft();

    expect(() => WorkspaceGraphAuthoringDraftSchema.parse(draft)).not.toThrow();
    expect(draft.nodes).toHaveLength(LARGE_GRAPH_NODE_COUNT);
    expect(new Set(draft.nodeIds).size).toBe(LARGE_GRAPH_NODE_COUNT);
    expect(draft.edges).toHaveLength(LARGE_GRAPH_EDGE_COUNT);
    expect(buildLargeWorkspaceGraphAuthoringDraft()).toEqual(draft);
  });

  it(
    'keeps explicit layout structurally complete within its separate budget',
    () => {
      const graph = projectDraftToFlowGraph();
      const inputSnapshot = structuredClone(graph);
      getLayoutedElements(graph.nodes.slice(0, 40), [], {
        gridSize: LARGE_GRAPH_GRID_SIZE,
        snapToGrid: true,
      });

      const startedCpuUsage = process.cpuUsage();
      const layouted = getLayoutedElements(graph.nodes, graph.edges, {
        gridSize: LARGE_GRAPH_GRID_SIZE,
        snapToGrid: true,
      });
      const elapsedCpuUsage = process.cpuUsage(startedCpuUsage);
      const cpuDurationMs = (elapsedCpuUsage.user + elapsedCpuUsage.system) / 1_000;

      expect(layouted.nodes).toHaveLength(LARGE_GRAPH_NODE_COUNT);
      expect(new Set(layouted.nodes.map((node) => node.id)).size).toBe(LARGE_GRAPH_NODE_COUNT);
      expect(layouted.edges).toHaveLength(LARGE_GRAPH_EDGE_COUNT);
      expect(layouted.edges).toEqual(graph.edges);
      const positionsByNodeId = new Map(
        layouted.nodes.map((node) => [node.id, node.position] as const)
      );
      expect(
        layouted.edges.every((edge) => {
          const sourcePosition = positionsByNodeId.get(edge.source);
          const targetPosition = positionsByNodeId.get(edge.target);
          return (
            sourcePosition !== undefined &&
            targetPosition !== undefined &&
            sourcePosition.x < targetPosition.x
          );
        })
      ).toBe(true);
      expect(
        layouted.nodes.every((node) =>
          [node.position.x, node.position.y].every(
            (coordinate) => Number.isFinite(coordinate) && coordinate % LARGE_GRAPH_GRID_SIZE === 0
          )
        )
      ).toBe(true);
      expect(graph).toEqual(inputSnapshot);
      expect(cpuDurationMs).toBeLessThan(LARGE_GRAPH_LAYOUT_CPU_BUDGET_MS);
    },
    LARGE_GRAPH_LAYOUT_TEST_TIMEOUT_MS
  );
});
