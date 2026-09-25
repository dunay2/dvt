/** Composition consumes a typed relation output, not a catalogued left-tree shape. */
import { describe, expect, it } from 'vitest';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { source } from './canvasRelationalOperator.test-support';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { composeSourceRelation } from './canvasComposeSourceRelation';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

describe('compose source occurrence with a transformed result', () => {
  it.each(['inner_join', 'cross_join', 'union_all', 'except_all'] as const)(
    'composes %s without rebuilding its operand',
    async (operation) => {
      const { session } = selectedUnaryScenario();
      await applySelectedRelationSortFetch(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'insert',
        operation: 'fetch',
        count: 5n,
      });
      const target = session.locate(session.rootId, session.revision);
      const before = await session.query(session.rootId);
      const input = {
        ...source('other'),
        fields: before.fields.map((field, ordinal) => ({
          name: `value_${ordinal}`,
          dataType: 'string',
          joinDataType: 'string' as const,
        })),
      };
      const document = await composeSourceRelation(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        input,
        operation,
        predicate: {
          leftSourceFieldId: before.bindings[0]!.fieldId,
          rightFieldName: input.fields[0]!.name,
        },
      });
      const composed = session.locate(session.rootId, session.revision);
      expect(composed.inputs[0]).toBe(target.binding.relationId);
      expect(session.locate(target.binding.relationId, session.revision).relation).toEqual(
        target.relation
      );
      expect(composed.relation.relType.case).toBe(
        operation === 'inner_join' ? 'join' : operation === 'cross_join' ? 'cross' : 'set'
      );
      const output = await session.query(session.rootId);
      expect(output.fields).toHaveLength(
        operation.endsWith('join') ? before.fields.length * 2 : before.fields.length
      );
      expect(deriveSubstraitSchemas(document).schemas.get(session.rootId)).toEqual(output.fields);
      expect(new Set(output.bindings.map((field) => field.fieldId)).size).toBe(
        output.bindings.length
      );
    }
  );

  it('rejects a different connection and incompatible SET inputs without accepting a revision', async () => {
    const { session } = selectedUnaryScenario();
    const before = await session.query(session.rootId);
    const input = {
      ...source('other'),
      fields: [{ name: 'x', dataType: 'string', joinDataType: 'string' as const }],
    };
    const request = {
      relationId: session.rootId,
      expectedRevision: session.revision,
      input,
      operation: 'union_all' as const,
    };
    await expect(composeSourceRelation(session, request)).rejects.toThrow();
    await expect(
      composeSourceRelation(session, {
        ...request,
        operation: 'cross_join',
        input: {
          ...input,
          sourceRef: {
            ...input.sourceRef,
            connectionRef: { ...input.sourceRef.connectionRef, connectionId: 'other' },
          },
        },
      })
    ).rejects.toThrow();
    expect(await session.query(session.rootId)).toEqual(before);
    expect(session.revision).toBe(before.revision);
  });
});
