import { describe, expect, it } from 'vitest';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import { analyzeCanvasRelations } from './canvasRelationalAnalysis';
import { projectCanvasRelationalComposition } from './canvasRelationalCompositionTruth';
import { projectAnalyzedCanvasRelationalTree } from './canvasRelationalTreeProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

describe('shared Canvas relational analysis', () => {
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
