/** Replacing a composition preserves both transformed operands and the consumer's output contract. */
import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { replaceSelectedComposition } from './canvasReplaceSelectedComposition';

describe('replace exact selected composition', () => {
  it('changes JOIN to CROSS below a consumer without rebuilding either operand', async () => {
    const { session, root } = selectedUnaryScenario();
    for (const relationId of root.inputs)
      await applySelectedRelationSortFetch(session, {
        relationId,
        expectedRevision: session.revision,
        intent: 'insert',
        operation: 'fetch',
        count: 3n,
      });
    await applySelectedRelationSortFetch(session, {
      relationId: root.binding.relationId,
      expectedRevision: session.revision,
      intent: 'insert',
      operation: 'fetch',
      count: 8n,
    });
    const original = session.locate(root.binding.relationId, session.revision);
    const operands = original.inputs.map((id) => session.locate(id, session.revision).relation);
    const before = await session.query(null);
    const document = await replaceSelectedComposition(session, {
      relationId: original.binding.relationId,
      expectedRevision: session.revision,
      operation: 'cross_join',
    });
    const after = session.locate(original.binding.relationId, session.revision);
    expect(after.relation.relType.case).toBe('cross');
    expect(after.inputs).toEqual(original.inputs);
    expect(after.inputs.map((id) => session.locate(id, session.revision).relation)).toEqual(
      operands
    );
    expect((await session.query(null)).fields).toEqual(before.fields);
    expect(deriveSubstraitSchemas(document).schemas.get(session.rootId)).toEqual(before.fields);
  });
  it('does not reinterpret a selected unary operation as the JOIN below it', async () => {
    const { session } = selectedUnaryScenario();
    await applySelectedRelationSortFetch(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'insert',
      operation: 'fetch',
      count: 3n,
    });
    const revision = session.revision;
    await expect(
      replaceSelectedComposition(session, {
        relationId: session.rootId,
        expectedRevision: revision,
        operation: 'cross_join',
      })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
  });
});
