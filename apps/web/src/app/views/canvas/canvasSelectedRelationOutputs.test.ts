import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { relationOutputSlots, type RelationOutputSlot } from './canvasRelationOutputSchema';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { createSourceSet } from './canvasSourceSet';
import { source } from './canvasRelationalOperator.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

async function slots(
  session: CanvasRelationAnalysisSession
): Promise<readonly RelationOutputSlot[]> {
  const target = session.locate(session.rootId, session.revision);
  return relationOutputSlots(
    target,
    await Promise.all(target.inputs.map((id) => session.query(id)))
  );
}

describe('canonical relation output editing', () => {
  it('reorders, renames, clears and restores JOIN outputs over transformed operands', async () => {
    const { session, root } = selectedUnaryScenario();
    for (const relationId of root.inputs)
      await applySelectedRelationSortFetch(session, {
        relationId,
        intent: 'insert',
        expectedRevision: session.revision,
        operation: 'fetch',
        count: 20n,
      });
    const original = session.locate(session.rootId, session.revision);
    const available = await slots(session);
    const selection = available.filter((field) => field.output != null).reverse();
    const edited = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: selection.map((field, index) => ({ slot: field.slot, alias: `output_${index}` })),
    });
    const output = await session.query(session.rootId);
    expect(output.bindings.map((field) => field.fieldId)).toEqual(
      selection.map((field) => field.output!.fieldId)
    );
    expect(output.fields.map((field) => field.sourceFieldIds)).toEqual(
      selection.map((field) => field.schema.sourceFieldIds)
    );
    expect(session.locate(session.rootId, session.revision).inputs).toEqual(original.inputs);
    expect(deriveSubstraitSchemas(edited).schemas.get(session.rootId)).toEqual(output.fields);
    await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: [],
    });
    expect((await session.query(session.rootId)).fields).toEqual([]);
    const hidden = await slots(session);
    expect(hidden).toHaveLength(available.length);
    const restored = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: hidden.map((field, index) => ({ slot: field.slot, alias: `field_${index}` })),
    });
    expect((await session.query(session.rootId)).fields).toHaveLength(available.length);
    expect(deriveSubstraitSchemas(restored).schemas.get(session.rootId)).toHaveLength(
      available.length
    );
  });

  it.each([
    'union_all',
    'union_distinct',
    'intersect_all',
    'intersect_distinct',
    'except_all',
    'except_distinct',
  ] as const)(
    'preserves %s semantics and operand lineage while selecting outputs',
    async (operation) => {
      const inputs = ['east', 'west'].map((name) => ({
        ...source(name),
        fields: [
          { name: 'name', type: 'string' as const },
          { name: 'total', type: 'i64' as const },
        ],
      }));
      const session = new CanvasRelationAnalysisSession('set-output');
      session.receive(createSourceSet({ targetNodeId: 'result', inputs, operation }));
      const before = session.locate(session.rootId, session.revision);
      const selected = before.fields.find((field) => field.outputOrdinal === 1)!;
      const next = await changeSelectedRelationOutputs(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        outputs: [{ slot: 1, alias: 'quantity' }],
      });
      const after = session.locate(session.rootId, session.revision);
      expect(after.fields).toEqual([{ ...selected, outputOrdinal: 0, displayName: 'quantity' }]);
      expect(after.inputs).toEqual(before.inputs);
      expect(after.relation.relType.case === 'set' && after.relation.relType.value.op).toBe(
        before.relation.relType.case === 'set' && before.relation.relType.value.op
      );
      expect(deriveSubstraitSchemas(next).schemas.get(session.rootId)?.[0]?.type.kind.case).toBe(
        'i64'
      );
    }
  );

  it('rejects duplicate aliases, unknown slots and output loss required by a consumer', async () => {
    const { session, root } = selectedUnaryScenario();
    const snapshot = await session.query(session.rootId);
    for (const outputs of [
      [{ slot: 999 }],
      [
        { slot: 0, alias: 'same' },
        { slot: 1, alias: 'same' },
      ],
    ])
      await expect(
        changeSelectedRelationOutputs(session, {
          relationId: session.rootId,
          expectedRevision: session.revision,
          outputs,
        })
      ).rejects.toThrow();
    await applySelectedRelationSortFetch(session, {
      relationId: root.inputs[0]!,
      expectedRevision: session.revision,
      intent: 'insert',
      operation: 'fetch',
      count: 5n,
    });
    const before = await session.query(session.rootId);
    const relationId = session.locate(session.rootId, session.revision).inputs[0]!;
    await expect(
      changeSelectedRelationOutputs(session, {
        relationId,
        expectedRevision: session.revision,
        outputs: [],
      })
    ).rejects.toThrow();
    expect(await session.query(session.rootId)).toEqual(before);
    expect(before.fields).toEqual(snapshot.fields);
  });
});
