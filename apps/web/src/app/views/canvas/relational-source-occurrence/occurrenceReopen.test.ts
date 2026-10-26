import { describe, expect, it } from 'vitest';
import { resolveCanvasRelationalTreeExistingDraft } from '../canvasRelationalTreeExistingDraft';
import { projectCanvasRelationalTree } from '../canvasRelationalTreeProjection';
import { projectCanvasRelationalTreeCatalogue } from '../canvasRelationalTreeCatalogue';
import { occurrenceGraph } from './occurrence.test.fixtures';
import { DvtRelationalAuthoringDraftV1Schema } from '@dvt/contracts';
import { resolveCanvasDvtCompositionInputs } from '../canvasDvtCompositionInputCatalog';
import {
  createPendingSourceOccurrence,
  pendingSourceOccurrencePublishedFieldIds,
} from './pendingSourceOccurrence';
import {
  createCanvasRelationalAuthoringDraft,
  restoreCanvasRelationalAuthoringDraft,
} from '../canvasRelationalAuthoringDraft';

describe('source occurrence reopening', () => {
  it('resolves publication defaults by stable producer field identity after reorder and alias changes', () => {
    const graph = occurrenceGraph();
    const consumer = { ...graph.targetNode, id: 'consumer', metadata: {} };
    const inputs = resolveCanvasDvtCompositionInputs({
      targetNodeId: consumer.id,
      nodes: [...graph.nodes, consumer],
      edges: [...graph.edges, { sourceId: graph.targetNode.id, targetId: consumer.id }],
    });
    const input = inputs[0]!;
    const { initialOutputFieldIds: _defaultSelection, ...occurrence } =
      createPendingSourceOccurrence(input);
    const local = occurrence.read.fields.find((field) => field.parentFieldId == null)!;
    const producerFieldId = occurrence.read.binding.producerRef!.fields.find(
      (binding) => binding.fieldId === local.fieldId
    )!.producerFieldId;
    expect(
      pendingSourceOccurrencePublishedFieldIds(occurrence, {
        ...input,
        fields: [...input.fields]
          .reverse()
          .map((field, index) => ({ ...field, name: `renamed_${index}` })),
        inputBindings: {
          version: 'v1',
          fields: [{ inputId: 'selected-producer-field', producerFieldId }],
        },
      })
    ).toEqual([local.fieldId]);
    expect(occurrence).not.toHaveProperty('initialOutputFieldIds');
  });

  it('reopens saved initial Output intent independently for repeated physical occurrences', () => {
    const graph = occurrenceGraph();
    const inputs = resolveCanvasDvtCompositionInputs({
      ...graph,
      targetNodeId: graph.targetNode.id,
    });
    const left = createPendingSourceOccurrence(inputs[0]!);
    const right = createPendingSourceOccurrence(inputs[0]!);
    const sources = [
      { ...left, initialOutputFieldIds: [left.read.fields[1]!.fieldId] },
      { ...right, initialOutputFieldIds: [] },
    ];
    const saved = createCanvasRelationalAuthoringDraft({
      sources,
      operations: [],
      outputRelationId: null,
      positions: new Map(),
    });
    const decoded = DvtRelationalAuthoringDraftV1Schema.parse(JSON.parse(JSON.stringify(saved)));
    const restored = restoreCanvasRelationalAuthoringDraft(decoded, inputs);
    expect(restored?.sources).toEqual(sources);
    expect(restored?.sources[0]!.read).toEqual(left.read);
    expect(restored?.sources[1]!.read).toEqual(right.read);
    expect(graph.edges[0]).not.toHaveProperty('inputBindings');
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
