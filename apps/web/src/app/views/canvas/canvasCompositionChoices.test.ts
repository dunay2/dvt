/** Replacement menus consume the exact operands, including transformed and n-ary results. */
import { describe, expect, it } from 'vitest';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { source } from './canvasRelationalOperator.test-support';
import { createSourceCross } from './canvasSourceCross';
import { createSourceSet } from './canvasSourceSet';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { queryCompositionChoices } from './canvasCompositionChoices';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';

describe('selected composition choices', () => {
  it('uses transformed operand schemas, not the compatible physical leaves', async () => {
    const session = new CanvasRelationAnalysisSession('model');
    session.receive(
      createSourceCross(
        ['left', 'right'].map((name) => ({
          ...source(name),
          label: name,
          fields: source(name).fields.map((field) => ({
            ...field,
            dataType: field.type,
            joinDataType: field.type,
          })),
        }))
      )
    );
    const root = session.locate(session.rootId, session.revision);
    await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: [{ slot: 0 }, { slot: 2 }],
    });
    const choices = (): ReturnType<typeof queryCompositionChoices> =>
      queryCompositionChoices(session, root.binding.relationId, session.revision, false);
    const selectable = (
      items: Awaited<ReturnType<typeof choices>>,
      operation: string
    ): boolean | undefined => items.find((item) => item.operation === operation)?.selectable;
    expect(selectable(await choices(), 'union_all')).toBe(true);
    for (const [port, relationId] of root.inputs.entries()) {
      const schema = await session.query(relationId);
      await applySelectedRelationAggregate(session, {
        relationId,
        expectedRevision: session.revision,
        intent: 'insert',
        fieldId: schema.bindings[0]!.fieldId,
        alias: 'total',
      });
      expect(selectable(await choices(), 'union_all')).toBe(port === 1);
      expect(selectable(await choices(), 'cross_join')).toBe(true);
    }
    session.dispose();
  });

  it('never offers a binary replacement for a three-input SET or a read', async () => {
    const session = new CanvasRelationAnalysisSession('model');
    session.receive(
      createSourceSet({ inputs: ['a', 'b', 'c'].map(source), targetNodeId: 'model' })
    );
    const choices = await queryCompositionChoices(session, session.rootId, session.revision, false);
    expect(
      choices.filter((choice) => choice.selectable).map((choice) => choice.operation)
    ).toHaveLength(6);
    expect(choices.find((choice) => choice.operation === 'cross_join')?.selectable).toBe(false);
    const read = session.locate(session.rootId, session.revision).inputs[0]!;
    expect(await queryCompositionChoices(session, read, session.revision, false)).toEqual([]);
    expect(
      (await queryCompositionChoices(session, session.rootId, session.revision, true)).every(
        (choice) => !choice.selectable
      )
    ).toBe(true);
    session.dispose();
  });
});
