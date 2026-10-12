import { describe, expect, it } from 'vitest';
import { canvasDraftSession } from './canvasDraftSession';
import {
  setCanvasColumnOutputIncluded,
  reorderCanvasColumnOutput,
} from './canvasColumnOutputAuthoring';
import {
  sourceNode,
  sourceColumns,
  projectedModel,
  outputFixture,
  publishedOutputs,
  projectionDraft,
  emptyModel,
} from './canvasColumnOutputAuthoring.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { relationOutputSlots } from './canvasRelationOutputSchema';

describe('Source output authoring', () => {
  it('protects hidden calculated dependencies without locking unrelated source columns', async () => {
    const source = sourceNode();
    const session = new CanvasRelationAnalysisSession('source-calculated-dependencies');
    session.receive(projectionDraft(source, ['order_id']));
    await applySelectedRelationDerivedOutput(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'edit',
      alias: 'clean',
      formula: 'TRIM("customer")',
    });
    const root = session.locate(session.rootId, session.revision);
    const slots = relationOutputSlots(root, [await session.query(root.inputs[0]!)]);
    const retained = slots.filter((slot) => slot.output != null && slot.name !== 'clean');
    const document = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: retained.map((slot) => ({ slot: slot.slot, alias: slot.name })),
    });
    const model = applyDvtSubstraitSemanticDocument(
      emptyModel(),
      encodeDvtSubstraitSemanticDocument(document)
    );
    const fixture = outputFixture(source, model);
    expect(
      setCanvasColumnOutputIncluded({
        ...fixture,
        targetNodeId: source.id,
        columnId: 'amount',
        output: false,
      }).outcome
    ).toBe('applied');
    expect(
      setCanvasColumnOutputIncluded({
        ...fixture,
        targetNodeId: source.id,
        columnId: 'customer',
        output: false,
      })
    ).toEqual({ outcome: 'rejected', reason: 'source_output_required' });
    expect(fixture.draftSession.localNodeCatalog![source.id]).toBe(source);
    session.dispose();
  });

  it('persists a subset and restores physical order without changing surviving ids', () => {
    const source = sourceNode();
    const fixture = outputFixture(source);
    const excluded = setCanvasColumnOutputIncluded({
      ...fixture,
      targetNodeId: source.id,
      columnId: 'customer',
      output: false,
    });
    expect(excluded.outcome).toBe('applied');
    if (excluded.outcome !== 'applied') throw new Error('Expected exclusion');
    const surviving = publishedOutputs(excluded.draftSession.localNodeCatalog![source.id]!);
    expect(surviving.map((output) => output.name)).toEqual(['order_id', 'amount']);
    const restored = setCanvasColumnOutputIncluded({
      ...fixture,
      draftSession: excluded.draftSession,
      targetNodeId: source.id,
      columnId: 'customer',
      output: true,
    });
    expect(restored.outcome).toBe('applied');
    if (restored.outcome !== 'applied') throw new Error('Expected restoration');
    const outputs = publishedOutputs(restored.draftSession.localNodeCatalog![source.id]!);
    expect(outputs.map((output) => output.name)).toEqual(['order_id', 'customer', 'amount']);
    for (const field of surviving)
      expect(outputs.find((output) => output.name === field.name)?.fieldId).toBe(field.fieldId);
  });

  it('rejects exclusion consumed by a connected explicit Transform without changing Source', () => {
    const source = sourceNode();
    const fixture = outputFixture(source, projectedModel(source, ['customer']));
    const excluded = setCanvasColumnOutputIncluded({
      ...fixture,
      targetNodeId: source.id,
      columnId: 'customer',
      output: false,
    });
    expect(excluded).toEqual({ outcome: 'rejected', reason: 'source_output_required' });
    expect(
      fixture.draftSession.localNodeCatalog![source.id]!.metadata!.transformAuthoring
    ).toBeUndefined();
  });

  it('allows exclusion when the connected Transform does not consume the field', () => {
    const source = sourceNode();
    const fixture = outputFixture(source, projectedModel(source, ['order_id']));
    expect(
      setCanvasColumnOutputIncluded({
        ...fixture,
        targetNodeId: source.id,
        columnId: 'customer',
        output: false,
      }).outcome
    ).toBe('applied');
  });

  it('reorders Source outputs without changing its physical schema', () => {
    const source = sourceNode();
    const reordered = reorderCanvasColumnOutput({
      ...outputFixture(source),
      targetNodeId: source.id,
      columnId: 'amount',
      targetColumnId: 'order_id',
      placement: 'before',
    });
    expect(reordered.outcome).toBe('applied');
    if (reordered.outcome !== 'applied') throw new Error('Expected reorder');
    const node = reordered.draftSession.localNodeCatalog![source.id]!;
    expect(node.metadata!.columns).toEqual(sourceColumns);
    expect(publishedOutputs(node).map((output) => output.name)).toEqual([
      'amount',
      'order_id',
      'customer',
    ]);
  });

  it('keeps the final Source output selected and writes no authority', () => {
    const source = sourceNode('source', [sourceColumns[0]!]);
    const fixture = outputFixture(source);
    expect(
      setCanvasColumnOutputIncluded({
        ...fixture,
        targetNodeId: source.id,
        columnId: 'order_id',
        output: false,
      })
    ).toEqual({ outcome: 'rejected', reason: 'source_output_last_field' });
    expect(source.metadata!.transformAuthoring).toBeUndefined();
  });

  it('reactivates an inactive Source field at the requested position', () => {
    const source = sourceNode();
    const fixture = outputFixture(source);
    const excluded = setCanvasColumnOutputIncluded({
      ...fixture,
      targetNodeId: source.id,
      columnId: 'customer',
      output: false,
    });
    if (excluded.outcome !== 'applied') throw new Error('Expected exclusion');
    const restored = setCanvasColumnOutputIncluded({
      ...fixture,
      draftSession: excluded.draftSession,
      targetNodeId: source.id,
      columnId: 'customer',
      output: true,
      placement: { targetColumnId: 'order_id', placement: 'before' },
    });
    expect(restored.outcome).toBe('applied');
    if (restored.outcome !== 'applied') throw new Error('Expected restoration');
    expect(
      publishedOutputs(restored.draftSession.localNodeCatalog![source.id]!).map(
        (output) => output.name
      )
    ).toEqual(['customer', 'order_id', 'amount']);
  });

  it('does not mistake another producer same-named field for a dependency', () => {
    const source = sourceNode('source-a');
    const other = sourceNode('source-b');
    const fixture = outputFixture(other, projectedModel(other, ['customer']));
    fixture.canonicalNodesById.set(source.id, source);
    fixture.draftSession = canvasDraftSession.workingSet.upsertNode(fixture.draftSession, source);
    expect(
      setCanvasColumnOutputIncluded({
        ...fixture,
        targetNodeId: source.id,
        columnId: 'customer',
        output: false,
      }).outcome
    ).toBe('applied');
  });

  it('allows exclusion after an explicit model edit removes the consumed output', () => {
    const source = sourceNode();
    const fixture = outputFixture(
      source,
      projectedModel(source, ['order_id', 'customer', 'amount'])
    );
    const request = { ...fixture, targetNodeId: source.id, columnId: 'customer', output: false };
    expect(setCanvasColumnOutputIncluded(request)).toEqual({
      outcome: 'rejected',
      reason: 'source_output_required',
    });
    const edited = canvasDraftSession.workingSet.upsertNode(
      fixture.draftSession,
      projectedModel(source, ['order_id', 'amount'])
    );
    expect(setCanvasColumnOutputIncluded({ ...request, draftSession: edited }).outcome).toBe(
      'applied'
    );
  });
});
