import { describe, expect, it } from 'vitest';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { insertSelectedRelationTransform } from './canvasSelectedRelationTransform';
import { querySelectedJoin } from './canvasSelectedJoin';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';

describe('dataset Transform insertion', () => {
  it.each([0, 1])('preserves the dataset and reconnects JOIN operand %i', async (side) => {
    const { session, root } = selectedUnaryScenario();
    const inputId = root.inputs[side]!;
    const before = await session.query(inputId);
    const joined = await session.query(session.rootId);
    const { document } = await insertSelectedRelationTransform(session, {
      relationId: inputId,
      expectedRevision: session.revision,
    });
    const join = session.locate(session.rootId, session.revision);
    const transformId = join.inputs[side]!;
    const transform = session.locate(transformId, session.revision);
    expect(transform.inputs).toEqual([inputId]);
    expect(transform.relation.relType.case).toBe('project');
    expect((await session.query(transformId)).fields).toEqual(before.fields);
    expect(transform.fields.map((field) => field.sourceFieldId)).toEqual(
      before.bindings.map((field) => field.fieldId)
    );
    expect((await session.query(session.rootId)).fields).toEqual(joined.fields);
    expect(
      (await querySelectedJoin(session, session.rootId, session.revision)).conditions
    ).not.toBeNull();
    expect(document.sidecar.relations).toHaveLength(4);
  });

  it('rejects a stale insertion without mutating the dataset', async () => {
    const { session } = selectedUnaryScenario();
    const revision = session.revision;
    await expect(
      insertSelectedRelationTransform(session, {
        relationId: session.rootId,
        expectedRevision: revision + 1,
      })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
  });

  it('adds a multi-operand field to an inserted passthrough Transform', async () => {
    const { session, root } = selectedUnaryScenario();
    const { relationId } = await insertSelectedRelationTransform(session, {
      relationId: root.inputs[0]!,
      expectedRevision: session.revision,
    });
    const field = (await session.query(relationId)).bindings.find(
      (candidate) => candidate.displayName === 'name'
    )!;
    const fn = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['string', 'string'],
      provider: 'postgres',
      resolution: 'complete',
    }).find((candidate) => candidate.name === 'coalesce')!;
    await applySelectedRelationDerivedOutput(session, {
      relationId,
      expectedRevision: session.revision,
      intent: 'edit',
      alias: 'normalized',
      capabilityIds: [fn.capabilityId],
      operandFieldIds: [field.fieldId, field.fieldId],
    });
    expect((await session.query(relationId)).bindings.at(-1)).toMatchObject({
      displayName: 'normalized',
      sourceFieldId: field.fieldId,
    });
    const project = session.locate(relationId, session.revision).relation.relType;
    if (project.case !== 'project') throw new Error('Expected Transform.');
    const expression = project.value.expressions[0]!.rexType;
    if (expression.case !== 'scalarFunction') throw new Error('Expected scalar.');
    expect(expression.value.arguments).toHaveLength(2);
    expect(expression.value.arguments[0]).toEqual(expression.value.arguments[1]);
  });
});
