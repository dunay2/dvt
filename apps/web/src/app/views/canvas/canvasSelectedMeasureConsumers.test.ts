import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationWindow } from './canvasSelectedRelationWindow';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

describe('schema-changing operations before a consumer', () => {
  it.each([0, 1])(
    'rebases JOIN port %i while preserving its output contract and sibling',
    async (port) => {
      const { session, root } = selectedUnaryScenario();
      const baseline = await session.query(session.rootId);
      const operand = await session.query(root.inputs[port]!);
      const sibling = session.locate(root.inputs[1 - port]!, session.revision);
      const next = await applySelectedRelationWindow(session, {
        intent: 'insert',
        relationId: operand.relationId,
        expectedRevision: session.revision,
        fieldId: operand.bindings[0]!.fieldId,
        alias: 'position',
      });
      expect((await session.query(session.rootId)).fields).toEqual(baseline.fields);
      expect(session.locate(sibling.binding.relationId, session.revision).relation).toEqual(
        sibling.relation
      );
      const selected = session.locate(session.rootId, session.revision).relation.relType;
      if (selected.case !== 'join' || selected.value.expression?.rexType.case !== 'scalarFunction')
        throw new Error('Expected JOIN');
      const references = selected.value.expression.rexType.value.arguments.map((argument) =>
        argument.argType.case === 'value'
          ? dvtSubstraitExpression.fieldOrdinal(argument.argType.value)
          : null
      );
      expect(references).toEqual([0, port === 0 ? 4 : 3]);
      expect(deriveSubstraitSchemas(next).schemas.get(session.rootId)).toEqual(baseline.fields);
    }
  );

  it('rejects removal of a field still used by a consumer without publishing the aggregate', async () => {
    const { session, root } = selectedUnaryScenario();
    const before = await session.query(session.rootId);
    const input = await session.query(root.inputs[0]!);
    const revision = session.revision;
    await expect(
      applySelectedRelationAggregate(session, {
        intent: 'insert',
        relationId: input.relationId,
        expectedRevision: revision,
        fieldId: input.bindings[0]!.fieldId,
        alias: 'total',
      })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
    expect(await session.query(session.rootId)).toEqual(before);
  });
});
