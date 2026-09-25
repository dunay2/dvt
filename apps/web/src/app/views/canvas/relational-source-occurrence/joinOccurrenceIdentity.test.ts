import { describe, expect, it } from 'vitest';
import { CanvasRelationAnalysisSession } from '../canvasRelationAnalysisSession';
import { composeSourceRelation } from '../canvasComposeSourceRelation';
import { prepareRelationRemoval } from '../canvasPrepareRelationRemoval';
import { occurrenceInput, repeatedOccurrenceDraft } from './occurrence.test.fixtures';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from '../canvasDvtSubstraitSemanticDocument';

const input = {
  ...occurrenceInput.source,
  fields: occurrenceInput.fields.map((name, ordinal) => ({
    name,
    dataType: 'bigint',
    joinDataType: occurrenceInput.fieldTypes![ordinal]!,
    nullable: occurrenceInput.fieldNullabilities![ordinal]!,
  })),
};

describe('independent source occurrences', () => {
  it('composes six occurrences, removes an independent middle input and retains identities across persistence', async () => {
    const session = new CanvasRelationAnalysisSession('occurrences');
    session.receive(repeatedOccurrenceDraft());
    const original = session.locate(session.rootId, session.revision);
    const firstOutput = (await session.query(session.rootId)).bindings[0]!.fieldId;
    await composeSourceRelation(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      operation: 'inner_join',
      input,
      predicate: { leftSourceFieldId: firstOutput, rightFieldName: 'id' },
    });
    for (let count = 0; count < 3; count += 1) {
      const field = (await session.query(session.rootId)).bindings[0]!;
      await composeSourceRelation(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        operation: 'inner_join',
        input,
        predicate: { leftSourceFieldId: field.fieldId, rightFieldName: 'id' },
      });
    }
    const occurrences = session.matchingSources(input.sourceRef, session.revision);
    expect(occurrences).toHaveLength(6);
    expect(new Set(occurrences).size).toBe(6);
    const before = await session.query(session.rootId);
    expect(new Set(before.bindings.map((field) => field.displayName)).size).toBe(12);
    const proposal = await prepareRelationRemoval(session, {
      relationId: original.inputs[1]!,
      expectedRevision: session.revision,
    });
    const removed = session.apply(proposal.change);
    expect(session.matchingSources(input.sourceRef, session.revision)).toEqual(
      occurrences.filter((id) => id !== original.inputs[1])
    );
    const remaining = await session.query(session.rootId);
    const survivedIds = new Set(remaining.bindings.map((field) => field.fieldId));
    expect(remaining.bindings).toHaveLength(10);
    expect(
      before.bindings
        .filter((field) => survivedIds.has(field.fieldId))
        .map((field) => field.fieldId)
    ).toEqual(remaining.bindings.map((field) => field.fieldId));
    const reopened = new CanvasRelationAnalysisSession('reopened');
    reopened.receive(
      decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(removed))
    );
    expect((await reopened.query(reopened.rootId)).bindings).toEqual(remaining.bindings);
  });

  it.each(['table', 'fields', 'type', 'nullability'] as const)(
    'rejects inconsistent repeated physical %s atomically',
    async (fault) => {
      const session = new CanvasRelationAnalysisSession('occurrence-rejection');
      session.receive(repeatedOccurrenceDraft());
      const before = await session.query(session.rootId);
      const changed = {
        ...input,
        table: fault === 'table' ? 'other' : input.table,
        fields: input.fields.map((field, ordinal) =>
          ordinal > 0
            ? field
            : {
                ...field,
                name: fault === 'fields' ? 'changed' : field.name,
                joinDataType: fault === 'type' ? ('string' as const) : field.joinDataType,
                nullable: fault === 'nullability' ? !field.nullable : field.nullable,
              }
        ),
      };
      await expect(
        composeSourceRelation(session, {
          relationId: session.rootId,
          expectedRevision: session.revision,
          operation: 'cross_join',
          input: changed,
        })
      ).rejects.toThrow();
      expect(await session.query(session.rootId)).toEqual(before);
      expect(session.matchingSources(input.sourceRef, session.revision)).toHaveLength(2);
    }
  );
});
