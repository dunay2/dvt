/** Unary edits are local deltas, preserving meaning and identity at every consumer port. */
import { describe, expect, it } from 'vitest';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { deriveSubstraitSchemas, indexSubstraitRelations } from '@dvt/substrait-analysis';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { removeSelectedRelationPassthrough } from './canvasSelectedRelationPassthrough';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';

describe('selected unary lifecycle', () => {
  it.each(
    ['sort', 'fetch'].flatMap((operation) => [0, 1, 'result'].map((port) => ({ operation, port })))
  )(
    '$operation composes on $port, edits in place and removes without identity drift',
    async ({ operation, port }) => {
      const { session, document, root } = selectedUnaryScenario();
      const relationId = port === 'result' ? session.rootId : root.inputs[Number(port)]!;
      const schema = await session.query(relationId);
      const baseline = await session.query(root.binding.relationId);
      const values =
        operation === 'sort'
          ? {
              operation: 'sort' as const,
              keys: schema.bindings
                .slice(0, 2)
                .reverse()
                .map((field) => ({
                  fieldId: field.fieldId,
                  direction: SortField_SortDirection.DESC_NULLS_LAST as const,
                })),
            }
          : { operation: 'fetch' as const, offset: 0n, count: 9_007_199_254_740_993n };
      const inserted = await applySelectedRelationSortFetch(session, {
        ...values,
        intent: 'insert',
        relationId,
        expectedRevision: session.revision,
      });
      const newId = inserted.sidecar.relations.find(
        (binding) =>
          !document.sidecar.relations.some((old) => old.relationId === binding.relationId)
      )!.relationId;
      const selected = session.locate(newId, session.revision);
      expect(selected.inputs).toEqual([relationId]);
      expect((await session.query(root.binding.relationId)).fields).toEqual(baseline.fields);
      const beforeEdit = await session.query(newId);
      const siblingId = port === 'result' ? root.inputs[0]! : root.inputs[1 - Number(port)]!;
      const sibling = session.locate(siblingId, session.revision);
      const siblingFacts = await session.query(siblingId);
      const edited = await applySelectedRelationSortFetch(session, {
        ...values,
        ...(values.operation === 'fetch' ? { count: 0n } : { keys: [...values.keys].reverse() }),
        intent: 'edit',
        relationId: newId,
        expectedRevision: session.revision,
      });
      expect(session.locate(newId, session.revision).fields).toEqual(selected.fields);
      expect((await session.query(newId)).fields).toEqual(beforeEdit.fields);
      expect(session.locate(siblingId, session.revision).relation).toEqual(sibling.relation);
      const workBeforeSibling = session.work;
      expect(await session.query(siblingId)).toEqual({
        ...siblingFacts,
        revision: session.revision,
      });
      expect(session.work).toEqual(workBeforeSibling);
      const current = session.locate(newId, session.revision).relation.relType;
      if (current.case === 'fetch')
        expect(current.value.countExpr?.rexType).toMatchObject({
          value: { literalType: { value: 0n } },
        });
      if (current.case === 'sort' && selected.relation.relType.case === 'sort')
        expect(current.value.sorts.map((key) => key.expr?.rexType)).toEqual(
          [...selected.relation.relType.value.sorts].reverse().map((key) => key.expr?.rexType)
        );
      expect(indexSubstraitRelations(edited).ok).toBe(true);
      const removed = await removeSelectedRelationPassthrough(session, newId, session.revision);
      expect(new Map(removed.sidecar.fields.map((field) => [field.fieldId, field]))).toEqual(
        new Map(document.sidecar.fields.map((field) => [field.fieldId, field]))
      );
      expect(removed.sidecar.relations).toEqual(document.sidecar.relations);
      expect(deriveSubstraitSchemas(removed).schemas.get(root.binding.relationId)).toEqual(
        baseline.fields
      );
    }
  );

  it('rejects stale, foreign or missing targets, duplicate keys and invalid values atomically', async () => {
    const { session, root } = selectedUnaryScenario();
    const left = await session.query(root.inputs[0]!);
    const right = await session.query(root.inputs[1]!);
    const base = {
      intent: 'insert' as const,
      expectedRevision: session.revision,
      relationId: root.inputs[0]!,
    };
    const key = {
      fieldId: left.bindings[0]!.fieldId,
      direction: SortField_SortDirection.ASC_NULLS_FIRST as const,
    };
    const before = await session.query(session.rootId);
    for (const request of [
      { ...base, operation: 'sort' as const, keys: [key, key] },
      {
        ...base,
        operation: 'sort' as const,
        keys: [{ ...key, fieldId: right.bindings[0]!.fieldId }],
      },
      { ...base, operation: 'fetch' as const, count: -1n },
      { ...base, operation: 'fetch' as const, offset: 9_223_372_036_854_775_808n },
      { ...base, operation: 'fetch' as const, relationId: 'missing', count: 1n },
      { ...base, operation: 'fetch' as const, expectedRevision: 99, count: 1n },
      { ...base, operation: 'fetch' as const, intent: 'edit' as const, count: 1n },
      { ...base, operation: 'fetch' as const, count: 1n, signal: AbortSignal.abort() },
    ])
      await expect(applySelectedRelationSortFetch(session, request)).rejects.toThrow();
    expect(session.revision).toBe(base.expectedRevision);
    expect(await session.query(session.rootId)).toEqual(before);
  });
});
