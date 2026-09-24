/** Owned concern: map repeated canonical occurrences to their single physical dependency. */
import { describe, expect, it } from 'vitest';
import {
  resolveDvtSubstraitNInputJoinEntry,
  setDvtSubstraitJoinConnectionFieldSelected,
} from '../canvasDvtSubstraitJoinComposition';
import { resolveCanvasRelationalTreeExistingJoinDraft } from '../canvasRelationalTreeExistingJoinDraft';
import { projectCanvasRelationalTree } from '../canvasRelationalTreeProjection';
import { projectCanvasRelationalTreeCatalogue } from '../canvasRelationalTreeWorkbenchModel';
import { occurrenceGraph, occurrenceInput } from './occurrence.test.fixtures';

describe('source occurrence reopening', () => {
  it('resolves two typed Reads against one real connected graph source', () => {
    const graph = occurrenceGraph();
    const entry = resolveDvtSubstraitNInputJoinEntry(graph);
    expect(entry?.inputs.map((input) => input.source.nodeId)).toEqual([
      graph.source.id,
      graph.source.id,
    ]);
    expect(entry?.inputs[0]?.fieldTypes).toEqual(['i64', 'i64']);
    expect(entry?.inputs[0]?.fieldNullabilities).toEqual([false, true]);
  });

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
      resolveCanvasRelationalTreeExistingJoinDraft({
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

  it('does not interpret a physical connection checkbox as the first occurrence', () => {
    const graph = occurrenceGraph();
    expect(
      setDvtSubstraitJoinConnectionFieldSelected({
        draft: graph.draft,
        sourceNode: graph.source,
        targetNode: graph.targetNode,
        edge: graph.edges[0]!,
        columnName: 'id',
        selected: false,
      })
    ).toBe(graph.draft);
  });

  it.each([
    'missing connection',
    'duplicate physical source',
    'wrong type',
    'wrong nullability',
    'unused source',
  ])('fails closed for %s without rebinding an occurrence', (failure) => {
    const graph = occurrenceGraph();
    if (failure === 'missing connection') graph.edges = [];
    if (failure === 'duplicate physical source' || failure === 'unused source') {
      graph.nodes.push({
        ...graph.source,
        id: 'extra',
        metadata: {
          ...graph.source.metadata,
          ...(failure === 'unused source'
            ? {
                tableName: 'other',
                connectedSourceRef: {
                  ...occurrenceInput.source.sourceRef,
                  sourceObjectId: 'public.other',
                },
              }
            : {}),
        },
      });
      graph.edges.push({ ...graph.edges[0]!, id: 'extra-model', sourceId: 'extra' });
    }
    if (failure === 'wrong type' || failure === 'wrong nullability')
      graph.nodes[0] = {
        ...graph.source,
        metadata: {
          ...graph.source.metadata,
          columns: [
            {
              name: 'id',
              type: failure === 'wrong type' ? 'string' : 'bigint',
              nullable: failure === 'wrong nullability',
            },
            { name: 'parent_id', type: 'bigint', nullable: true },
          ],
        },
      };
    expect(resolveDvtSubstraitNInputJoinEntry(graph)).toBeNull();
  });
});
