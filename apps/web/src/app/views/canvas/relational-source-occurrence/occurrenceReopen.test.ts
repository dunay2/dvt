import { describe, expect, it } from 'vitest';
import { resolveCanvasRelationalTreeExistingDraft } from '../canvasRelationalTreeExistingDraft';
import { projectCanvasRelationalTree } from '../canvasRelationalTreeProjection';
import { projectCanvasRelationalTreeCatalogue } from '../canvasRelationalTreeWorkbenchModel';
import { occurrenceGraph } from './occurrence.test.fixtures';

describe('source occurrence reopening', () => {
  it('retains occurrence order on reopen without duplicating the physical source catalogue', () => {
    const graph = occurrenceGraph();
    const result = projectCanvasRelationalTree({ ...graph, node: graph.targetNode });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected an admitted tree');
    expect(result.projection.inputs.map((input) => input.relationId)).toEqual(
      graph.draft.sidecar.relations
        .filter((relation) => relation.sourceRef != null)
        .map((relation) => relation.relationId)
    );
    expect(
      resolveCanvasRelationalTreeExistingDraft({
        document: graph.draft,
        projection: result.projection,
      })?.inputIds
    ).toEqual([graph.source.id, graph.source.id]);
    const catalogue = projectCanvasRelationalTreeCatalogue({
      ...result.projection,
      nodes: graph.nodes,
    });
    expect(catalogue).toHaveLength(1);
    // A physical catalogue entry must not silently select one of several occurrences.
    expect(catalogue[0]!.treeLocator).toBeNull();
  });
});
