/** Composition consumes a typed relation output, not a catalogued left-tree shape. */
import { describe, expect, it } from 'vitest';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { source } from './canvasRelationalOperator.test-support';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { composeSourceRelation } from './canvasComposeSourceRelation';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { createSourceDocument } from './canvasSourceDocument';

describe('compose source occurrence with a transformed result', () => {
  it('retains unbound catalogue fields without guessing types or losing physical identity', () => {
    const input = {
      ...source('orders'),
      fields: [
        { name: 'id', dataType: 'integer', joinDataType: null },
        { name: 'amount', dataType: 'numeric', joinDataType: null },
        { name: 'label', dataType: 'text', joinDataType: 'string' as const },
      ],
    };
    const { read } = createPendingSourceOccurrence(input);
    const schemas = deriveSubstraitSchemas(createSourceDocument([read], read));
    expect(
      schemas.schemas.get(read.binding.relationId)?.map((field) => field.type.kind.case)
    ).toEqual(['unbound', 'unbound', 'string']);
    expect(read.binding.sourceRef).toEqual(input.sourceRef);
    expect(read.fields.map((field) => field.displayName)).toEqual(
      input.fields.map((field) => field.name)
    );
    expect(new Set(read.fields.map((field) => field.fieldId)).size).toBe(input.fields.length);
  });
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
  it('consumes a pending Read once, retaining its field identity and leaving its draft unchanged', async () => {
    const { session } = selectedUnaryScenario();
    const input = {
      ...source('other'),
      fields: [{ name: 'value', dataType: 'string', joinDataType: 'string' as const }],
    };
    const { read } = createPendingSourceOccurrence(input);
    const before = structuredClone(read);
    const request = {
      relationId: session.rootId,
      expectedRevision: session.revision,
      input,
      occurrence: read,
      operation: 'cross_join' as const,
    };
    const document = await composeSourceRelation(session, request);
    const connected = deriveSubstraitSchemas(document).index.relations.get(
      read.binding.relationId
    )!;
    expect(connected.fields.map((field) => field.fieldId)).toEqual(
      read.fields.map((field) => field.fieldId)
    );
    expect(connected.binding.displayName).toBe(read.binding.displayName);
    expect(connected.consumers).toHaveLength(1);
    expect(read).toEqual(before);
    const revision = session.revision;
    await expect(composeSourceRelation(session, request)).rejects.toThrow();
    await expect(
      composeSourceRelation(session, {
        ...request,
        relationId: session.rootId,
        expectedRevision: revision,
      })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
  });
});
