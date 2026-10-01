import { describe, expect, it } from 'vitest';
import { createCanvasRelationalAnalysisReader } from './canvasRelationalAnalysisMemo';
import { analyzeCanvasRelations } from './canvasRelationalAnalysis';
import { analysisChain, withdrawChainSource } from './canvasRelationalAnalysisMemo.test-support';

describe('relational analysis dependency closure', () => {
  it('invalidates a three-model consumer when Source publication is withdrawn and restored', () => {
    const graph = analysisChain();
    const before = structuredClone(graph);
    const read = createCanvasRelationalAnalysisReader();
    const initial = read(graph);
    expect(initial.failure).toBeNull();
    const changed = { ...graph, nodes: withdrawChainSource(graph.nodes) };
    const fresh = analyzeCanvasRelations(changed);
    expect(fresh.failure).toBe('input-identity-unavailable');
    expect(fresh.inputs).toHaveLength(0);
    expect(read(changed)).toEqual(fresh);
    expect(read(graph)).toEqual(initial);
    expect(graph).toEqual(before);
  });

  it.each([
    'binding',
    'disconnect',
    'missing',
    'identity',
    'publication',
    'attach',
    'cycle',
  ] as const)(
    'tracks an indirect %s change without changing the consumer or direct producer',
    (change) => {
      const graph = analysisChain();
      const read = createCanvasRelationalAnalysisReader();
      const initial = read(graph);
      const changed = { ...graph, nodes: [...graph.nodes], edges: [...graph.edges] };
      if (change === 'binding')
        changed.edges[0] = {
          ...changed.edges[0]!,
          metadata: { inputBindings: { version: 'v1', fields: [] } },
        };
      if (change === 'disconnect') changed.edges.shift();
      if (change === 'missing') changed.nodes.shift();
      if (change === 'identity')
        changed.nodes[0] = { ...changed.nodes[0]!, kind: 'dvt:transform', role: 'transform' };
      if (change === 'publication') changed.nodes[1] = { ...changed.nodes[1]!, metadata: {} };
      if (change === 'attach')
        changed.edges.push({
          id: 'missing-input',
          sourceId: 'absent',
          targetId: graph.nodes[1]!.id,
          relation: 'lineage',
        });
      if (change === 'cycle')
        changed.edges.push({
          id: 'cycle',
          sourceId: graph.node.id,
          targetId: graph.nodes[1]!.id,
          relation: 'lineage',
        });
      const fresh = analyzeCanvasRelations(changed);
      if (change !== 'cycle') expect(fresh.failure).not.toBeNull();
      expect(read(changed)).not.toBe(initial);
      expect(read(changed)).toEqual(fresh);
      expect(read(graph)).toEqual(initial);
    }
  );

  it('tracks canonical producer references even after all Canvas edges are disconnected', () => {
    const graph = { ...analysisChain(), edges: [] };
    const read = createCanvasRelationalAnalysisReader();
    const initial = read(graph);
    const changed = {
      ...graph,
      nodes: graph.nodes.map((node) =>
        node.id === 'transform-orders'
          ? { ...node, metadata: { sql: 'unsupported authority' } }
          : node
      ),
    };
    const fresh = analyzeCanvasRelations(changed);
    expect(fresh).not.toEqual(initial);
    expect(read(changed)).toEqual(fresh);
    expect(read(graph)).toEqual(initial);
  });

  it('retains analysis across unrelated branches, position/status changes and refreshed wrappers', () => {
    const graph = analysisChain();
    const read = createCanvasRelationalAnalysisReader();
    const initial = read(graph);
    const changed = {
      ...graph,
      node: { ...graph.node, name: 'Consumer display name' },
      nodes: [
        ...graph.nodes.map((node) => ({ ...node, status: 'success' as const })),
        { ...graph.nodes[0]!, id: 'unrelated', metadata: {} },
      ],
      edges: [
        ...graph.edges.map((edge) => ({ ...edge })),
        {
          id: 'unrelated-edge',
          sourceId: 'unrelated',
          targetId: 'other',
          relation: 'lineage' as const,
        },
      ],
    };
    expect(read(changed)).toBe(initial);
    expect(read(graph)).toBe(initial);
  });

  it('refreshes catalogue names and plugin identity actually read by the analysis', () => {
    const graph = analysisChain();
    const read = createCanvasRelationalAnalysisReader();
    const initial = read(graph);
    for (const patch of [{ name: 'Renamed producer' }, { pluginId: 'foreign' }]) {
      const changed = {
        ...graph,
        nodes: graph.nodes.map((node) => (node.id === 'middle' ? { ...node, ...patch } : node)),
      };
      expect(read(changed)).not.toBe(initial);
      expect(read(changed)).toEqual(analyzeCanvasRelations(changed));
    }
  });
});
