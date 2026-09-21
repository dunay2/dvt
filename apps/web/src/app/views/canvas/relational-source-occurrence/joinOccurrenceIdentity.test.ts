/** Owned concern: stable Read occurrence identities throughout canonical JOIN editing. */
import { describe, expect, it } from 'vitest';
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  appendDvtSubstraitJoinInput,
  applyDvtSubstraitInnerJoinFieldEdit,
  decodeDvtSubstraitJoinDocument,
  encodeDvtSubstraitJoinDocument,
  inspectDvtSubstraitJoinDraft,
  retainDvtSubstraitJoinInputs,
  setDvtSubstraitJoinType,
  type DvtSubstraitJoinDraft,
  type DvtSubstraitNInputJoinProjection,
} from '../canvasDvtSubstraitJoinComposition';
import {
  occurrenceInput as input,
  repeatedOccurrenceDraft as repeated,
} from './occurrence.test.fixtures';

function inspect(draft: DvtSubstraitJoinDraft): DvtSubstraitNInputJoinProjection {
  const result = inspectDvtSubstraitJoinDraft(draft);
  if (!result.ok) throw new Error('Expected an admitted canonical JOIN');
  return result.projection;
}

function append(draft: DvtSubstraitJoinDraft): DvtSubstraitJoinDraft {
  return appendDvtSubstraitJoinInput(draft, {
    ...input,
    predicate: {
      leftSourceFieldId: inspect(draft).inputs[0]!.fields[0]!.fieldId,
      rightFieldName: 'id',
    },
    selectedFields: input.fields,
  });
}

describe('canonical JOIN occurrence identity', () => {
  it('allocates separate identities for the same physical source and survives serialization', () => {
    const draft = repeated();
    const before = inspect(draft);
    expect(before.inputs).toHaveLength(2);
    expect(new Set(before.inputs.map((item) => item.relationId)).size).toBe(2);
    expect(
      new Set(before.inputs.flatMap((item) => item.fields.map((field) => field.fieldId))).size
    ).toBe(4);
    expect(before.inputs.map((item) => item.sourceRef)).toEqual([
      input.source.sourceRef,
      input.source.sourceRef,
    ]);
    expect(inspect(decodeDvtSubstraitJoinDocument(encodeDvtSubstraitJoinDocument(draft)))).toEqual(
      before
    );
  });

  it('preserves both occurrences and their aliases when changing the JOIN type', () => {
    const initial = repeated();
    const before = inspect(initial);
    const draft = {
      ...initial,
      sidecar: {
        ...initial.sidecar,
        relations: initial.sidecar.relations.map((relation) => ({
          ...relation,
          displayName:
            relation.relationId === before.inputs[1]!.relationId
              ? 'Parent place'
              : relation.displayName,
        })),
      },
    };
    const changed = setDvtSubstraitJoinType({
      draft,
      joinRelationId: before.joinRelations[0]!.relationId,
      joinType: JoinRel_JoinType.INNER,
    });
    expect(inspect(changed).inputs).toEqual(before.inputs);
    expect(
      changed.sidecar.relations.find(
        (relation) => relation.relationId === before.inputs[1]!.relationId
      )?.displayName
    ).toBe('Parent place');
    expect(inspect(changed).joinRelations[0]!.joinType).toBe(JoinRel_JoinType.INNER);
  });

  it('keeps first and third identities when removing the independent middle occurrence', () => {
    const draft = append(repeated());
    const before = inspect(draft);
    expect(before.inputs).toHaveLength(3);
    const retained = retainDvtSubstraitJoinInputs(draft, [0, 2]);
    expect(retained).not.toBeNull();
    expect(inspect(retained!).inputs).toEqual([before.inputs[0], before.inputs[2]]);
    expect(inspect(retained!).outputs.map((output) => output.fieldId)).toEqual(
      before.outputs
        .filter((output) => output.source.inputIndex !== 1)
        .map((output) => output.fieldId)
    );
  });

  it('does not impose a four-occurrence limit through output naming collisions', () => {
    let draft = repeated();
    for (let index = 0; index < 4; index += 1) draft = append(draft);
    const result = inspect(draft);
    expect(result.inputs).toHaveLength(6);
    expect(new Set(result.outputs.map((output) => output.name)).size).toBe(12);
    expect(new Set(result.inputs.map((item) => item.relationId)).size).toBe(6);
  });

  it('changes output participation by field identity without touching the other occurrence', () => {
    const draft = repeated();
    const before = inspect(draft);
    const fieldId = before.inputs[0]!.fields[0]!.fieldId;
    const changed = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'set-selected',
      sourceFieldId: fieldId,
      selected: false,
    });
    const after = inspect(changed);
    expect(after.inputs).toEqual(before.inputs);
    expect(after.joins).toEqual(before.joins);
    expect(after.outputs.map((output) => output.source.fieldId)).toEqual(
      before.outputs
        .filter((output) => output.source.fieldId !== fieldId)
        .map((output) => output.source.fieldId)
    );
  });

  it.each([
    { ...input, source: { ...input.source, table: 'other_table' } },
    { ...input, fields: ['id', 'different'] },
    { ...input, fieldTypes: ['string', 'i64'] as const },
    { ...input, fieldNullabilities: [true, true] },
  ])(
    'rejects inconsistent physical provenance without changing the original draft',
    (inconsistent) => {
      const draft = repeated();
      const encoded = encodeDvtSubstraitJoinDocument(draft);
      expect(
        appendDvtSubstraitJoinInput(draft, {
          ...inconsistent,
          predicate: {
            leftSourceFieldId: inspect(draft).inputs[0]!.fields[0]!.fieldId,
            rightFieldName: 'id',
          },
          selectedFields: inconsistent.fields,
        })
      ).toBe(draft);
      expect(encodeDvtSubstraitJoinDocument(draft)).toEqual(encoded);
    }
  );
});
