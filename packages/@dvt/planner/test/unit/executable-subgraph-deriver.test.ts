import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { PlannerFacade } from '../../src/application/PlannerFacade.js';

type DraftNode = WorkspaceGraphAuthoringDraft['nodes'][number];
type DraftEdge = WorkspaceGraphAuthoringDraft['edges'][number];

function buildNode(id: string, overrides: Partial<DraftNode> = {}): DraftNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    ...overrides,
  };
}

function buildEdge(
  id: string,
  sourceId: string,
  targetId: string,
  overrides: Partial<DraftEdge> = {}
): DraftEdge {
  return {
    id,
    sourceId,
    targetId,
    relation: 'lineage',
    ...overrides,
  };
}

function buildDraft(args: {
  visibleNodeIds: string[];
  nodes?: DraftNode[];
  edges?: DraftEdge[];
}): WorkspaceGraphAuthoringDraft {
  const nodes = args.nodes ?? args.visibleNodeIds.map((nodeId) => buildNode(nodeId));

  return {
    canvas: {
      kind: 'dvt:canvas',
      title: 'Executable subgraph fixture',
    },
    nodeIds: [...args.visibleNodeIds],
    nodePositions: Object.fromEntries(
      args.visibleNodeIds.map((nodeId, index) => [nodeId, { x: index * 100, y: index * 50 }])
    ),
    nodes,
    edges: args.edges ?? [],
  };
}

describe('PlannerFacade deriveExecutableSubgraph', () => {
  it('derives an executable upstream closure without widening to unrelated visible nodes', () => {
    const facade = new PlannerFacade();
    const draft = buildDraft({
      visibleNodeIds: ['a_source', 'b_transform', 'c_sink', 'z_loose'],
      edges: [
        buildEdge('edge_1', 'a_source', 'b_transform'),
        buildEdge('edge_2', 'b_transform', 'c_sink'),
      ],
    });

    const result = facade.deriveExecutableSubgraph({
      draft,
      selection: { mode: 'upstream', nodeIds: ['c_sink'] },
    });

    expect(result).toEqual({
      selection: { mode: 'upstream', nodeIds: ['c_sink'] },
      nodeIds: ['a_source', 'b_transform', 'c_sink'],
      edgeIds: ['edge_1', 'edge_2'],
      executable: true,
      diagnostics: [],
    });
  });

  it('reports dependency_gap when explicit selection omits required upstream dependencies', () => {
    const facade = new PlannerFacade();
    const draft = buildDraft({
      visibleNodeIds: ['a_source', 'b_transform', 'c_sink'],
      edges: [
        buildEdge('edge_1', 'a_source', 'b_transform'),
        buildEdge('edge_2', 'b_transform', 'c_sink'),
      ],
    });

    const result = facade.deriveExecutableSubgraph({
      draft,
      selection: { mode: 'explicit', nodeIds: ['c_sink'] },
    });

    expect(result.executable).toBe(false);
    expect(result.nodeIds).toEqual(['c_sink']);
    expect(result.edgeIds).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'dependency_gap',
        nodeIds: ['b_transform'],
        edgeIds: ['edge_2'],
      }),
    ]);
  });

  it('fails closed when the selected node id is not visible in the draft', () => {
    const facade = new PlannerFacade();
    const draft = buildDraft({
      visibleNodeIds: ['a_source'],
      nodes: [buildNode('a_source'), buildNode('b_hidden')],
    });

    const result = facade.deriveExecutableSubgraph({
      draft,
      selection: { mode: 'explicit', nodeIds: ['b_hidden'] },
    });

    expect(result).toEqual({
      selection: { mode: 'explicit', nodeIds: ['b_hidden'] },
      nodeIds: [],
      edgeIds: [],
      executable: false,
      diagnostics: [
        {
          code: 'selected_node_missing',
          message: 'Selected node ids are not visible in the authoring draft.',
          nodeIds: ['b_hidden'],
        },
      ],
    });
  });

  it('keeps hidden semantic nodes out of traversal and reports dependency gaps instead of widening', () => {
    const facade = new PlannerFacade();
    const draft = buildDraft({
      visibleNodeIds: ['c_sink'],
      nodes: [buildNode('a_source'), buildNode('b_transform'), buildNode('c_sink')],
      edges: [
        buildEdge('edge_1', 'a_source', 'b_transform'),
        buildEdge('edge_2', 'b_transform', 'c_sink'),
      ],
    });

    const result = facade.deriveExecutableSubgraph({
      draft,
      selection: { mode: 'upstream', nodeIds: ['c_sink'] },
    });

    expect(result.executable).toBe(false);
    expect(result.nodeIds).toEqual(['c_sink']);
    expect(result.edgeIds).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'dependency_gap',
        nodeIds: ['b_transform'],
        edgeIds: ['edge_2'],
      }),
    ]);
  });

  it('reports cycle_detected on the selected closure instead of throwing', () => {
    const facade = new PlannerFacade();
    const draft = buildDraft({
      visibleNodeIds: ['a_cycle', 'b_cycle', 'z_loose'],
      edges: [buildEdge('edge_1', 'a_cycle', 'b_cycle'), buildEdge('edge_2', 'b_cycle', 'a_cycle')],
    });

    const result = facade.deriveExecutableSubgraph({
      draft,
      selection: { mode: 'connected_component', nodeIds: ['a_cycle'] },
    });

    expect(result.executable).toBe(false);
    expect(result.nodeIds).toEqual(['a_cycle', 'b_cycle']);
    expect(result.edgeIds).toEqual(['edge_1', 'edge_2']);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'cycle_detected',
        nodeIds: ['a_cycle', 'b_cycle'],
      }),
    ]);
  });

  it('reports dependency_gap for downstream selection when selected dependents need external upstream nodes', () => {
    const facade = new PlannerFacade();
    const draft = buildDraft({
      visibleNodeIds: ['a_seed', 'b_other_parent', 'c_join'],
      edges: [
        buildEdge('edge_1', 'a_seed', 'c_join'),
        buildEdge('edge_2', 'b_other_parent', 'c_join'),
      ],
    });

    const result = facade.deriveExecutableSubgraph({
      draft,
      selection: { mode: 'downstream', nodeIds: ['a_seed'] },
    });

    expect(result.executable).toBe(false);
    expect(result.nodeIds).toEqual(['a_seed', 'c_join']);
    expect(result.edgeIds).toEqual(['edge_1']);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'dependency_gap',
        nodeIds: ['b_other_parent'],
        edgeIds: ['edge_2'],
      }),
    ]);
  });
});
