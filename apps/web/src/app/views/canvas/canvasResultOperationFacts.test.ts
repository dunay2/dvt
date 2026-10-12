/** Menus use the current result schema, not the physical leaves that originally fed it. */
import { describe, expect, it } from 'vitest';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { source } from './canvasRelationalOperator.test-support';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { resultOperationFacts } from './canvasResultOperationFacts';
import { resolveCanvasRelationalOperationChoices } from './canvasRelationalOperationChoices';

describe('composition menu for transformed results', () => {
  it('admits SET against grouped output and ignores obsolete physical input widths', async () => {
    const { session } = selectedUnaryScenario();
    const before = await session.query(null);
    await applySelectedRelationAggregate(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'insert',
      fieldId: before.bindings[0]!.fieldId,
      alias: 'total',
    });
    const output = await session.query(null);
    const input = {
      ...source('summary'),
      fields: [
        { name: 'key', dataType: 'text', joinDataType: 'string' as const },
        { name: 'rows', dataType: 'bigint', joinDataType: 'i64' as const },
      ],
    };
    const choices = resolveCanvasRelationalOperationChoices(
      resultOperationFacts({
        session,
        revision: session.revision,
        output,
        input,
        editable: true,
      })
    );
    expect(output.fields).toHaveLength(2);
    expect(before.fields).toHaveLength(3);
    expect(
      choices.filter(
        (choice) =>
          choice.operation.includes('union') ||
          choice.operation.includes('intersect') ||
          choice.operation.includes('except')
      )
    ).toHaveLength(6);
    expect(choices.every((choice) => choice.selectable)).toBe(true);
    const incompatible = resolveCanvasRelationalOperationChoices(
      resultOperationFacts({
        session,
        revision: session.revision,
        output,
        input: { ...input, fields: input.fields.slice(0, 1) },
        editable: true,
      })
    );
    expect(incompatible.find((choice) => choice.operation === 'union_all')?.selectable).toBe(false);
    expect(incompatible.find((choice) => choice.operation === 'cross_join')?.selectable).toBe(true);
  });
});
