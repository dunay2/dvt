import { describe, expect, it } from 'vitest';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import { analyzeCanvasRelations } from './canvasRelationalAnalysis';
import { projectCanvasRelationalComposition } from './canvasRelationalCompositionTruth';
import { projectAnalyzedCanvasRelationalTree } from './canvasRelationalTreeProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  createModelOutputDependencyFixture,
  createIncompatibleRetainedModelFixture,
  selectModelDependencyOutputs,
} from './canvasModelOutputDependency.test-support';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';

describe('shared Canvas relational analysis', () => {
  it('retains a missing producer UUID and exposes a new same-name producer as a separate pending input', async () => {
    const graph = await createModelOutputDependencyFixture();
    const replacement = { ...graph.producer, id: 'new-producer' };
    const args = {
      node: graph.consumer,
      nodes: [...graph.nodes.filter((node) => node.id !== graph.producer.id), replacement],
      edges: graph.edges.map((edge) => ({
        ...edge,
        sourceId: edge.sourceId === graph.producer.id ? replacement.id : edge.sourceId,
        targetId: edge.targetId === graph.producer.id ? replacement.id : edge.targetId,
      })),
    };
    const before = structuredClone(args);
    const analysis = analyzeCanvasRelations(args);
    expect(analysis.failure).toBeNull();
    expect(analysis.semantic?.state).toBe('disconnected');
    expect(analysis.semantic?.document).toEqual(graph.consumerDocument);
    expect(analysis.projectedInputs).toContainEqual(
      expect.objectContaining({ sourceNodeId: graph.producer.id, state: 'missing' })
    );
    expect(analysis.projectedInputs).toContainEqual(
      expect.objectContaining({ sourceNodeId: replacement.id, state: 'pending', relationId: null })
    );
    expect(projectAnalyzedCanvasRelationalTree(analysis).ok).toBe(true);
    expect(
      analysis.semantic?.publication?.get(analysis.semantic.index.rootId)?.rowUnavailable
    ).toBe(true);
    expect(projectCanvasRelationalComposition(analysis)?.state).toBe('incomplete');
    expect(() => resolveCanvasSubstraitGraphBindings(args)).toThrow();
    expect(args).toEqual(before);
  });

  it('retains editor provenance only for a unique exact disconnected physical source', () => {
    const graph = occurrenceGraph();
    const args = { ...graph, node: graph.targetNode, edges: [] };
    expect(
      analyzeCanvasRelations(args).projectedInputs.map((input) => [input.state, input.sourceNodeId])
    ).toEqual([
      ['missing', graph.source.id],
      ['missing', graph.source.id],
    ]);
    const duplicate = { ...graph.source, id: 'ambiguous-source' };
    expect(
      analyzeCanvasRelations({ ...args, nodes: [...graph.nodes, duplicate] }).projectedInputs.map(
        (input) => input.sourceNodeId
      )
    ).toEqual([null, null]);
  });
  it('rejects incompatible retained inputs without refreshing away a required consumer Output', async () => {
    const graph = await createIncompatibleRetainedModelFixture();
    const args = { node: graph.consumer, nodes: graph.nodes, edges: graph.edges };
    const before = structuredClone(args);
    expect(() =>
      resolveCanvasSubstraitGraphBindings({ ...args, node: graph.producer })
    ).not.toThrow();
    const analysis = analyzeCanvasRelations(args);
    expect(analysis.failure).toBe('invalid-semantic-authority');
    expect(analysis.semantic).toBeNull();
    expect(projectAnalyzedCanvasRelationalTree(analysis).ok).toBe(false);
    expect(projectCanvasRelationalComposition(analysis)?.state).toBe('unresolved');
    expect(args).toEqual(before);
  });
  it('inspects the retained consumer tree when its producer removed a required field', async () => {
    const graph = await createModelOutputDependencyFixture();
    const producer = await selectModelDependencyOutputs(graph.producer, ['customer']);
    const analysis = analyzeCanvasRelations({
      node: graph.consumer,
      nodes: graph.nodes.map((node) => (node.id === producer.id ? producer : node)),
      edges: graph.edges,
    });
    expect(analysis.failure).toBeNull();
    expect(analysis.semantic?.document).toEqual(graph.consumerDocument);
    expect(projectAnalyzedCanvasRelationalTree(analysis).ok).toBe(true);
    expect(projectCanvasRelationalComposition(analysis)?.state).toBe('incomplete');
  });
  it('preserves the existing graph-order resolution of a physical dependency', () => {
    const graph = occurrenceGraph();
    const duplicate = { ...graph.source, id: 'another-source-card' };
    const analysis = analyzeCanvasRelations({
      node: graph.targetNode,
      nodes: [graph.source, duplicate, graph.targetNode],
      edges: [...graph.edges, { ...graph.edges[0]!, id: 'another-edge', sourceId: duplicate.id }],
    });
    expect(analysis.projectedInputs.map((input) => input.sourceNodeId)).toEqual([
      graph.source.id,
      graph.source.id,
    ]);
  });

  it('preserves both occurrences of one physical source and never mutates authority', () => {
    const graph = occurrenceGraph();
    const args = { ...graph, node: graph.targetNode };
    const before = structuredClone(args);
    const analysis = analyzeCanvasRelations(args);
    const tree = projectAnalyzedCanvasRelationalTree(analysis);
    expect(analysis.failure).toBeNull();
    expect(analysis.projectedInputs).toHaveLength(2);
    expect(new Set(analysis.projectedInputs.map((input) => input.relationId)).size).toBe(2);
    expect(analysis.inputs).toHaveLength(1);
    expect(projectCanvasRelationalComposition(analysis)).toEqual({
      state: 'canonical',
      connectedInputCount: 1,
      operation: 'left_join',
    });
    expect(tree.ok).toBe(true);
    if (!tree.ok) throw new Error('Expected tree');
    expect(tree.projection.inputs).toBe(analysis.projectedInputs);
    expect(args).toEqual(before);
  });

  it('reports one missing physical dependency without merging its relation occurrences', () => {
    const graph = occurrenceGraph();
    const analysis = analyzeCanvasRelations({ ...graph, node: graph.targetNode, edges: [] });
    expect(analysis.projectedInputs.filter((input) => input.state === 'missing')).toHaveLength(2);
    expect(projectCanvasRelationalComposition(analysis)).toEqual({
      state: 'incomplete',
      connectedInputCount: 0,
      missingInputCount: 1,
      canonicalOperation: 'left_join',
    });
  });

  it('keeps aliases out of structural classification', () => {
    const graph = occurrenceGraph();
    graph.draft.sidecar.relations.forEach((binding, ordinal) => {
      binding.displayName = `Alias ${ordinal}`;
    });
    const node = applyDvtSubstraitSemanticDocument(
      graph.targetNode,
      encodeDvtSubstraitSemanticDocument(graph.draft)
    );
    const analysis = analyzeCanvasRelations({ ...graph, node });
    expect(projectCanvasRelationalComposition(analysis)).toEqual({
      state: 'canonical',
      connectedInputCount: 1,
      operation: 'left_join',
    });
    expect([...analysis.semantic!.index.relations.keys()].sort()).toEqual(
      graph.draft.sidecar.relations.map((binding) => binding.relationId).sort()
    );
  });

  it('rejects a dangling relation binding consistently in both consumers', () => {
    const graph = occurrenceGraph();
    graph.draft.sidecar.relations[0]!.relAnchor = 9999;
    const node = applyDvtSubstraitSemanticDocument(
      graph.targetNode,
      encodeDvtSubstraitSemanticDocument(graph.draft)
    );
    const analysis = analyzeCanvasRelations({ ...graph, node });
    expect(analysis.failure).toBe('invalid-semantic-authority');
    expect(projectAnalyzedCanvasRelationalTree(analysis)).toEqual({
      ok: false,
      failure: { code: 'invalid-semantic-authority' },
    });
    expect(projectCanvasRelationalComposition(analysis)).toEqual({
      state: 'unresolved',
      connectedInputCount: 1,
      reason: 'semantic-authority-invalid',
    });
  });

  it('rejects an unresolved graph edge rather than treating the known inputs as complete', () => {
    const graph = occurrenceGraph();
    const analysis = analyzeCanvasRelations({
      ...graph,
      node: graph.targetNode,
      nodes: [graph.targetNode],
    });
    expect(analysis.failure).toBe('input-identity-unavailable');
    expect(projectCanvasRelationalComposition(analysis)).toEqual({
      state: 'unresolved',
      connectedInputCount: 1,
      reason: 'input-identity-unavailable',
    });
  });
});
