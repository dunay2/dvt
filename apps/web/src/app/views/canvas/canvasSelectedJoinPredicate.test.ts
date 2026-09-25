/** Predicate editing consumes exact operand outputs, including transformed inputs on either port. */
import { describe, expect, it } from 'vitest';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { resolveDvtSubstraitJoinUnaryFunctions } from './canvasDvtSubstraitJoinOperand';

describe('selected JOIN predicate', () => {
  it.each([0, 1] as const)(
    'edits both predicate operands after transforming input %s',
    async (port) => {
      const { session, root } = selectedUnaryScenario();
      const source = await session.query(root.inputs[port]!);
      await applySelectedRelationFilter(session, {
        relationId: root.inputs[port]!,
        expectedRevision: session.revision,
        intent: 'insert',
        fieldId: source.bindings[0]!.fieldId,
        capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
        value: 'selected',
      });
      const selected = await querySelectedJoin(session, root.binding.relationId, session.revision);
      const operands = selected.inputs.map(
        (input) => session.locate(input.relationId, session.revision).relation
      );
      const capability = resolveDvtSubstraitJoinUnaryFunctions({
        dataType: 'string',
        provider: 'postgres',
      })[0]!;
      const condition = {
        left: {
          kind: 'function' as const,
          capabilityId: capability.capabilityId,
          input: { kind: 'field' as const, sourceFieldId: selected.fields[0]!.fieldId },
        },
        right: {
          kind: 'function' as const,
          capabilityId: capability.capabilityId,
          input: {
            kind: 'field' as const,
            sourceFieldId: selected.fields.find((field) => field.inputIndex === 1)!.fieldId,
          },
        },
      };
      await replaceSelectedJoinConditions(session, {
        relationId: selected.relationId,
        expectedRevision: selected.revision,
        conditions: [condition],
      });
      const reopened = await querySelectedJoin(session, selected.relationId, session.revision);
      expect(reopened.conditions).toEqual([expect.objectContaining(condition)]);
      expect(
        reopened.inputs.map((input) => session.locate(input.relationId, session.revision).relation)
      ).toEqual(operands);
      expect(reopened.output.fields).toEqual(selected.output.fields);
      expect(reopened.output.bindings).toEqual(selected.output.bindings);
    }
  );

  it('rejects foreign fields, stale revisions and an empty predicate atomically', async () => {
    const { session, root } = selectedUnaryScenario();
    const before = await querySelectedJoin(session, root.binding.relationId, session.revision);
    const request = {
      relationId: before.relationId,
      expectedRevision: before.revision,
      conditions: before.conditions!,
    };
    await expect(
      replaceSelectedJoinConditions(session, { ...request, conditions: [] })
    ).rejects.toThrow();
    await expect(
      replaceSelectedJoinConditions(session, { ...request, expectedRevision: 99 })
    ).rejects.toThrow();
    await expect(
      replaceSelectedJoinConditions(session, {
        ...request,
        conditions: [
          {
            left: { kind: 'field', sourceFieldId: 'foreign' },
            right: { kind: 'literal', literal: { dataType: 'string', value: 'x' } },
          },
        ],
      })
    ).rejects.toThrow();
    expect(await querySelectedJoin(session, before.relationId, session.revision)).toEqual(before);
    expect(session.revision).toBe(before.revision);
  });
});
