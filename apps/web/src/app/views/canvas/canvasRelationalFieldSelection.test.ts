import { describe, expect, it } from 'vitest';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import {
  canvasRelationalFieldConsumers,
  selectCanvasRelationalField,
} from './canvasRelationalFieldSelection';
import type { CanvasRelationalFieldReference } from './canvasRelationalTreeDrag';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { removeCanvasRelationalExpression } from './canvasRelationalFieldSelection';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { readTransformFormulaScope } from './canvasTransformFormulaScope';

function scenario(): {
  session: CanvasRelationAnalysisSession;
  document: ReturnType<typeof connectedNamesProjectionDraft>;
  reference: (
    relationId: string,
    fieldId: string,
    selectedOutput?: boolean
  ) => CanvasRelationalFieldReference;
} {
  const session = new CanvasRelationAnalysisSession('selection');
  const document = connectedNamesProjectionDraft();
  session.receive(document);
  const reference = (
    relationId: string,
    fieldId: string,
    selectedOutput = false
  ): CanvasRelationalFieldReference => ({
    rootId: session.rootId,
    revision: session.revision,
    relationId,
    fieldId,
    selectedOutput,
  });
  return { session, reference, document };
}

async function dependentScenario(): Promise<
  ReturnType<typeof scenario> & {
    model: () => ReturnType<typeof readCanvasTransformDependencyModel>;
  }
> {
  const setup = scenario();
  let document = setup.document;
  for (const [alias, formula] of [
    ['clean_name', 'TRIM("first_name")'],
    ['upper_name', 'UPPER("clean_name")'],
  ]) {
    document = await applySelectedRelationDerivedOutput(setup.session, {
      relationId: setup.session.rootId,
      expectedRevision: setup.session.revision,
      intent: 'edit',
      alias: alias!,
      formula: formula!,
    });
  }
  const model = (): ReturnType<typeof readCanvasTransformDependencyModel> =>
    readCanvasTransformDependencyModel(
      setup.session.locate(setup.session.rootId, setup.session.revision),
      (id) => setup.session.locate(id, setup.session.revision)
    );
  return { ...setup, document, model };
}

describe('scoped tree field selection', () => {
  it.each(['public', 'physical'])(
    'rejects deleting a consumed definition through its %s identity atomically',
    async (identity) => {
      const { session, reference, document, model } = await dependentScenario();
      const producer = model().definitions.find(
        (definition) => definition.output?.displayName === 'clean_name'
      )!;
      const revision = session.revision;
      const request =
        identity === 'public'
          ? selectCanvasRelationalField(
              session,
              reference(session.rootId, producer.output!.fieldId, true),
              { kind: 'remove' }
            )
          : removeCanvasRelationalExpression(session, {
              relationId: producer.owner.binding.relationId,
              expectedRevision: revision,
              expressionOrdinal: producer.ordinal,
            });
      await expect(request).rejects.toMatchObject({
        code: 'transform_definition_referenced',
        fields: ['upper_name'],
      });
      expect(session.revision).toBe(revision);
      expect(session.hasDocument(document)).toBe(true);
      session.dispose();
    }
  );

  it.each(['public', 'physical'])(
    'removes a leaf definition through its %s identity and prunes only unused stages',
    async (identity) => {
      const { session, reference, model } = await dependentScenario();
      const before = model();
      const leaf = before.definitions.find(
        (definition) => definition.output?.displayName === 'upper_name'
      )!;
      const keptFields = before.root.fields.filter(
        (field) => field.fieldId !== leaf.output!.fieldId
      );
      const changed =
        identity === 'public'
          ? await selectCanvasRelationalField(
              session,
              reference(session.rootId, leaf.output!.fieldId, true),
              { kind: 'remove' }
            )
          : await removeCanvasRelationalExpression(session, {
              relationId: leaf.owner.binding.relationId,
              expectedRevision: session.revision,
              expressionOrdinal: leaf.ordinal,
            });
      expect(model().definitions.map((definition) => definition.output?.displayName)).toEqual([
        'clean_name',
      ]);
      const after = (await session.query(session.rootId)).bindings;
      expect(after.map((field) => [field.fieldId, field.displayName, field.outputOrdinal])).toEqual(
        keptFields.map((field) => [field.fieldId, field.displayName, field.outputOrdinal])
      );
      expect(changed!.sidecar.relations).toHaveLength(3);
      const reopened = new CanvasRelationAnalysisSession('leaf-reopened');
      reopened.receive(changed!);
      expect((await reopened.query(reopened.rootId)).bindings).toEqual(after);
      reopened.dispose();
      const last = model().definitions[0]!;
      const empty = await selectCanvasRelationalField(
        session,
        reference(session.rootId, last.output!.fieldId, true),
        { kind: 'remove' }
      );
      expect(model().definitions).toEqual([]);
      expect(empty!.sidecar.relations).toHaveLength(2);
      expect(
        empty!.sidecar.relations.some((binding) => binding.authoringOwnerRelationId != null)
      ).toBe(false);
      session.dispose();
    }
  );

  it('hides a consumed output without deleting its definition or consumer', async () => {
    const { session, model } = await dependentScenario();
    const before = model();
    const producer = before.definitions.find(
      (definition) => definition.output?.displayName === 'clean_name'
    )!;
    const target = session.locate(session.rootId, session.revision);
    const inputs = await Promise.all(target.inputs.map((id) => session.query(id)));
    const outputs = relationOutputSlots(target, inputs)
      .filter((slot) => slot.output != null && slot.output.fieldId !== producer.output!.fieldId)
      .sort((left, right) => left.output!.outputOrdinal - right.output!.outputOrdinal)
      .map((slot) => ({ slot: slot.slot, alias: slot.name }));
    const hidden = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs,
    });
    const after = model();
    expect(after.definitions.map((definition) => definition.id)).toEqual(
      before.definitions.map((definition) => definition.id)
    );
    expect(
      after.definitions.find((definition) => definition.id === producer.id)?.output
    ).toBeUndefined();
    expect(
      (await session.query(session.rootId)).bindings.map((field) => field.displayName)
    ).toEqual(['first_name', 'last_name', 'upper_name']);
    expect(
      (await readTransformFormulaScope(session, after)).fields.some(
        (field) => field.name === 'clean_name'
      )
    ).toBe(true);
    expect((await projectSubstraitToPostgresSql(hidden)).sql).toMatch(/\b(?:trim|btrim)\s*\(/i);
    session.dispose();
  });

  it('treats a drop within the same Output as a no-op and rejects an aborted gesture', async () => {
    const { session, reference } = scenario();
    const field = (await session.query(session.rootId)).bindings[0]!;
    const ref = reference(session.rootId, field.fieldId, true);
    expect(
      await selectCanvasRelationalField(session, ref, { kind: 'add', relationId: session.rootId })
    ).toBeNull();
    const cancellation = new AbortController();
    cancellation.abort();
    await expect(
      selectCanvasRelationalField(session, ref, { kind: 'remove' }, cancellation.signal)
    ).rejects.toThrow();
    expect(session.revision).toBe(ref.revision);
  });
  it.each(['plain', 'grouped-base', 'grouped-calculated-input'])(
    'removes one field and adds only the dragged input, retaining neighbors and ignoring repeats (%s)',
    async (shape) => {
      const { session, reference } = scenario();
      if (shape !== 'plain')
        await applySelectedRelationDerivedOutput(session, {
          intent: 'edit',
          relationId: session.rootId,
          expectedRevision: session.revision,
          alias: 'clean_name',
          formula: 'TRIM("first_name")',
        });
      if (shape === 'grouped-calculated-input')
        await applySelectedRelationDerivedOutput(session, {
          intent: 'insert',
          relationId: session.rootId,
          expectedRevision: session.revision,
          alias: 'lower_name',
          formula: 'LOWER("last_name")',
        });
      const rootId = session.rootId;
      const fieldName = shape === 'grouped-calculated-input' ? 'clean_name' : 'last_name';
      const original = await session.query(rootId);
      const removed = original.bindings.find((field) => field.displayName === fieldName)!;
      await selectCanvasRelationalField(session, reference(rootId, removed.fieldId, true), {
        kind: 'remove',
      });
      const retained = original.bindings.filter((field) => field !== removed);
      expect((await session.query(rootId)).bindings.map((f) => f.fieldId)).toEqual(
        retained.map((field) => field.fieldId)
      );
      const sourceId = readCanvasTransformDependencyModel(
        session.locate(rootId, session.revision),
        (id) => session.locate(id, session.revision)
      ).input.binding.relationId;
      const input = (await session.query(sourceId)).bindings.find(
        (field) => field.displayName === fieldName
      )!;
      const result = await selectCanvasRelationalField(
        session,
        reference(sourceId, input.fieldId),
        {
          kind: 'add',
          relationId: rootId,
        }
      );
      expect(result).not.toBeNull();
      const after = (await session.query(rootId)).bindings;
      expect(after.map((f) => f.displayName)).toEqual([
        ...retained.map((field) => field.displayName),
        fieldName,
      ]);
      expect(after.slice(0, -1).map((field) => field.fieldId)).toEqual(
        retained.map((field) => field.fieldId)
      );
      const revision = session.revision;
      expect(
        await selectCanvasRelationalField(session, reference(sourceId, input.fieldId), {
          kind: 'add',
          relationId: rootId,
        })
      ).toBeNull();
      expect(session.revision).toBe(revision);
      const reopened = new CanvasRelationAnalysisSession('reopened');
      reopened.receive(result!);
      expect((await reopened.query(rootId)).bindings).toEqual(after);
    }
  );

  it.each([
    "CONCAT(UPPER(first_name), ' hola')",
    'UPPER(TRIM(first_name))',
    '2 * 3 + 1',
    "''",
    'NULL',
    'CAST(NULL AS BIGINT)',
    'COALESCE(first_name, NULL)',
  ])(
    'removes the complete expression %s without breaking inputs, validation or SQL projection',
    async (formula) => {
      const { session, reference } = scenario();
      await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'greeting',
        formula,
      });
      const field = (await session.query(session.rootId)).bindings.find(
        (f) => f.displayName === 'greeting'
      )!;
      const next = await selectCanvasRelationalField(
        session,
        reference(session.rootId, field.fieldId, true),
        { kind: 'remove' }
      );
      expect((await session.query(session.rootId)).bindings.map((f) => f.displayName)).toEqual([
        'first_name',
        'last_name',
      ]);
      const sql = await projectSubstraitToPostgresSql(next!);
      expect(sql.projection.outputs.map((f) => f.name)).toEqual(['first_name', 'last_name']);
      const relation = session.locate(session.rootId, session.revision).relation;
      expect(relation.relType.case === 'project' && relation.relType.value.expressions).toEqual([]);
    }
  );

  it.each([
    'foreign-root',
    'stale',
    'missing-field',
    'input-removal',
    'physical-output',
    'unavailable',
  ])('rejects %s without changing the document', async (failure) => {
    const { session, reference, document } = scenario();
    const rootId = session.rootId;
    const inputId = session.locate(rootId, session.revision).inputs[0]!;
    const source = (await session.query(inputId)).bindings[0]!;
    const output = (await session.query(rootId)).bindings[0]!;
    const ref = { ...reference(rootId, output.fieldId, true) };
    if (failure === 'foreign-root') ref.rootId = 'other';
    if (failure === 'stale') ref.revision -= 1;
    if (failure === 'missing-field') ref.fieldId = 'missing';
    if (failure === 'input-removal') ref.selectedOutput = false;
    if (failure === 'physical-output') Object.assign(ref, reference(inputId, source.fieldId, true));
    if (failure === 'unavailable') session.receive(document, new Set([source.fieldId]));
    const revision = session.revision;
    const before = await session.query(rootId);
    await expect(selectCanvasRelationalField(session, ref, { kind: 'remove' })).rejects.toThrow();
    expect(session.revision).toBe(revision);
    expect(await session.query(rootId)).toEqual(before);
  });

  it('rejects an unrelated branch and removal required by JOIN without changing it', async () => {
    const { session, root } = selectedUnaryScenario();
    const inputName = (await session.query(root.inputs[0]!)).bindings[0]!.displayName!;
    const document = await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: root.inputs[0]!,
      expectedRevision: session.revision,
      alias: 'derived',
      formula: `UPPER("${inputName}")`,
    });
    const target = session.locate(session.rootId, session.revision).inputs[0]!;
    const field = (await session.query(target)).bindings[0]!;
    const ref = {
      rootId: session.rootId,
      revision: session.revision,
      relationId: target,
      fieldId: field.fieldId,
      selectedOutput: true,
    };
    const before = await session.query(session.rootId);
    expect(canvasRelationalFieldConsumers(session, ref)).toContain(
      session.locate(session.rootId, session.revision).binding.displayName ?? 'join'
    );
    await expect(selectCanvasRelationalField(session, ref, { kind: 'remove' })).rejects.toThrow();
    await expect(
      selectCanvasRelationalField(session, ref, { kind: 'add', relationId: root.inputs[1]! })
    ).rejects.toThrow();
    const reopened = new CanvasRelationAnalysisSession('proof');
    reopened.receive(document);
    expect(await session.query(session.rootId)).toEqual(before);
    expect((await reopened.query(reopened.rootId)).fields).toEqual(before.fields);
  });

  it('rejects complete expression removal when a JOIN consumes the derived output', async () => {
    const { session, root } = selectedUnaryScenario();
    const derivedDocument = await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: root.inputs[0]!,
      expectedRevision: session.revision,
      alias: 'trimmed_name',
      formula: 'TRIM(name)',
    });
    const join = await querySelectedJoin(session, session.rootId, session.revision);
    const derived = derivedDocument.sidecar.fields.find(
      (field) => field.displayName === 'trimmed_name'
    )!;
    const right = join.fields.find((field) => field.inputIndex === 1)!;
    await replaceSelectedJoinConditions(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      conditions: [
        {
          left: { kind: 'field', sourceFieldId: derived.fieldId },
          right: { kind: 'field', sourceFieldId: right.fieldId },
        },
      ],
    });
    const revision = session.revision;
    const before = await session.query(session.rootId);
    const expressionId = session.locate(session.rootId, revision).inputs[0]!;
    await expect(
      removeCanvasRelationalExpression(session, {
        relationId: expressionId,
        expectedRevision: revision,
        expressionOrdinal: 0,
      })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
    expect(await session.query(session.rootId)).toEqual(before);
  });
});
