import { describe, expect, it } from 'vitest';
import {
  resolveDvtSubstraitColumnFunctions,
  projectSubstraitToPostgresSql,
} from '@dvt/postgres-projection';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { isDvtSubstraitJoinConditionGroup } from './canvasDvtSubstraitJoinCondition';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';
import { transformExpressionDependencies } from './canvasTransformExpressionReferences';

function capability(name: 'trim' | 'upper'): string {
  const resolved = resolveDvtSubstraitColumnFunctions({
    dataTypes: ['string'],
    provider: 'postgres',
    resolution: 'complete',
  }).find((entry) => entry.name === name);
  if (resolved == null) throw new Error(`Missing ${name} capability.`);
  return resolved.capabilityId;
}

describe('selected relation derived output authoring', () => {
  it.each(['NULL', 'COALESCE(TRIM(first_name), NULL)', 'CAST(NULL AS BIGINT)'])(
    'publishes and renders the authored NULL expression: %s',
    async (formula) => {
      const session = new CanvasRelationAnalysisSession('null-authoring');
      session.receive(connectedNamesProjectionDraft());
      const document = await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'CAMPO_PRUEBA',
        formula,
      });
      const field = document.sidecar.fields.find((entry) => entry.displayName === 'CAMPO_PRUEBA')!;
      expect(field).toBeDefined();
      const projection = await projectSubstraitToPostgresSql(document);
      expect(projection.sql).toContain('NULL');
      expect(projection.projection.outputs.at(-1)).toMatchObject({
        name: 'CAMPO_PRUEBA',
        nullable: true,
      });
      const reopened = new CanvasRelationAnalysisSession('null-reopened');
      reopened.receive(document);
      const schema = await reopened.query(reopened.rootId);
      expect(schema.bindings.at(-1)?.fieldId).toBe(field.fieldId);
      expect(schema.fields.at(-1)?.type.kind.case).toBe(
        formula.includes('BIGINT') ? 'i64' : 'string'
      );
    }
  );
  it.each([
    ['COALESCE(NULL, 10)', 'i64', true],
    ['COALESCE(NULL, 2.5)', 'fp64', true],
    ['COALESCE(NULL, false)', 'bool', true],
    ["first_name IS NULL OR first_name = 'Ada'", 'bool', true],
    ['first_name IS NOT NULL', 'bool', false],
  ] as const)('persists and lowers the typed formula %s', async (formula, type, nullable) => {
    const session = new CanvasRelationAnalysisSession('typed-formula');
    session.receive(connectedNamesProjectionDraft());
    const document = await applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId: session.rootId,
      expectedRevision: session.revision,
      alias: 'typed_result',
      formula,
    });
    const projected = await projectSubstraitToPostgresSql(document);
    expect(projected.projection.outputs.at(-1)).toMatchObject({
      name: 'typed_result',
      dataType: type,
      nullable,
    });
    session.dispose();
  });
  it('creates an empty string and edits its formula without changing FieldId or neighbors', async () => {
    const session = new CanvasRelationAnalysisSession('formula-edit');
    session.receive(connectedNamesProjectionDraft());
    const relationId = session.rootId;
    const request = {
      intent: 'edit' as const,
      relationId,
      expectedRevision: session.revision,
      alias: 'hola',
      formula: "''",
    };
    const created = await applySelectedRelationDerivedOutput(session, request);
    const field = created.sidecar.fields.find(
      (item) => item.relationId === relationId && item.displayName === 'hola'
    )!;
    expect(field).toBeDefined();
    const revised = await applySelectedRelationDerivedOutput(session, {
      ...request,
      expectedRevision: session.revision,
      outputFieldId: field.fieldId,
      formula: "CONCAT(first_name, ' ', last_name)",
    });
    expect(revised.sidecar.fields.find((item) => item.fieldId === field.fieldId)?.displayName).toBe(
      'hola'
    );
    expect(revised.sidecar.fields.map((item) => item.fieldId)).toEqual(
      created.sidecar.fields.map((item) => item.fieldId)
    );
    expect(
      (await session.query(relationId)).bindings.filter((item) => item.parentFieldId == null)
    ).toHaveLength(3);
    const revision = session.revision;
    await expect(
      applySelectedRelationDerivedOutput(session, {
        ...request,
        expectedRevision: revision,
        formula: 'missing * 2',
        alias: 'bad',
      })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
  });

  it('inserts one Transform group over an exact JOIN operand and reconnects its consumer', async () => {
    const { session, root } = selectedUnaryScenario();
    const inputId = root.inputs[0]!;
    const input = await session.query(inputId);
    const sourceFieldId = input.bindings.find(
      (field) => field.parentFieldId == null && field.displayName === 'name'
    )!.fieldId;

    await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: inputId,
      expectedRevision: session.revision,
      alias: 'normalized_name',
      capabilityIds: [capability('upper')] as const,
      operandFieldIds: [sourceFieldId],
    });

    const nextRoot = session.locate(session.rootId, session.revision);
    const projectId = nextRoot.inputs[0]!;
    const project = session.locate(projectId, session.revision);
    expect(project.relation.relType.case).toBe('project');
    const model = readCanvasTransformDependencyModel(project, (id) =>
      session.locate(id, session.revision)
    );
    expect(model.input.binding.relationId).toBe(inputId);
    expect(model.members).toHaveLength(2);
    expect((await session.query(projectId)).bindings.at(-1)?.displayName).toBe('normalized_name');
  });

  it('references an existing calculated FieldId within the same Transform group', async () => {
    const session = new CanvasRelationAnalysisSession('nested-derived-output');
    session.receive(connectedNamesProjectionDraft());
    const projectId = session.rootId;
    const source = await session.query(projectId);
    const sourceFieldId = source.bindings.find(
      (field) => field.parentFieldId == null && field.displayName === 'first_name'
    )!.fieldId;

    const trimmed = await applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId: projectId,
      expectedRevision: session.revision,
      alias: 'trimmed_name',
      capabilityIds: [capability('trim')],
      operandFieldIds: [sourceFieldId],
    });
    const trimmedField = trimmed.sidecar.fields.find(
      (field) => field.relationId === projectId && field.displayName === 'trimmed_name'
    )!;
    const composed = await applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId: projectId,
      expectedRevision: session.revision,
      alias: 'normalized_name',
      capabilityIds: [capability('upper')],
      operandFieldIds: [trimmedField.fieldId],
    });

    expect(
      composed.sidecar.fields.find((field) => field.displayName === 'trimmed_name')?.fieldId
    ).toBe(trimmedField.fieldId);
    const target = session.locate(projectId, session.revision);
    const model = readCanvasTransformDependencyModel(target, (id) =>
      session.locate(id, session.revision)
    );
    const definition = model.definitions.find(
      (entry) => entry.output?.displayName === 'normalized_name'
    )!;
    const expression = definition.expression.rexType;
    expect(expression?.case).toBe('scalarFunction');
    if (expression?.case !== 'scalarFunction') throw new Error('Expected scalar expression.');
    const argument = expression.value.arguments[0]?.argType;
    expect(argument?.case).toBe('value');
    if (argument?.case !== 'value') throw new Error('Expected expression argument.');
    expect(argument.value.rexType.case).toBe('selection');
    expect(transformExpressionDependencies(definition.expression, definition.inputIds)).toEqual([
      model.definitions.find((entry) => entry.output?.fieldId === trimmedField.fieldId)!.id,
    ]);
  });

  it('creates one output for a nested admitted capability chain', async () => {
    const session = new CanvasRelationAnalysisSession('nested-capability-chain');
    session.receive(connectedNamesProjectionDraft());
    const projectId = session.rootId;
    const before = session.locate(projectId, session.revision);
    const source = await session.query(projectId);
    const sourceFieldId = source.bindings.find(
      (field) => field.parentFieldId == null && field.displayName === 'first_name'
    )!.fieldId;

    const document = await applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId: projectId,
      expectedRevision: session.revision,
      alias: 'normalized_name',
      capabilityIds: [capability('trim'), capability('upper')],
      operandFieldIds: [sourceFieldId],
    });

    const target = session.locate(projectId, session.revision);
    const model = readCanvasTransformDependencyModel(target, (id) =>
      session.locate(id, session.revision)
    );
    expect(model.definitions).toHaveLength(1);
    const definition = model.definitions[0]!;
    expect(definition.expression.rexType.case).toBe('scalarFunction');
    expect(transformExpressionDependencies(definition.expression, definition.inputIds)).toEqual([
      (await session.query(before.inputs[0]!)).bindings.find(
        (field) => field.displayName === 'first_name'
      )!.fieldId,
    ]);
    expect(
      document.sidecar.fields.find(
        (field) => field.relationId === projectId && field.displayName === 'normalized_name'
      )?.sourceFieldId
    ).toBe(definition.binding.fieldId);
  });

  it('rejects duplicate aliases and stale revisions without changing the session', async () => {
    const session = new CanvasRelationAnalysisSession('derived-output-negative');
    session.receive(connectedNamesProjectionDraft());
    const schema = await session.query(session.rootId);
    const revision = session.revision;
    const request = {
      intent: 'edit' as const,
      relationId: session.rootId,
      expectedRevision: revision,
      alias: schema.bindings[0]!.displayName!,
      capabilityIds: [capability('upper')] as const,
      operandFieldIds: [schema.bindings[0]!.fieldId] as const,
    };
    await expect(applySelectedRelationDerivedOutput(session, request)).rejects.toThrow();
    await expect(
      applySelectedRelationDerivedOutput(session, { ...request, expectedRevision: revision + 1 })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
  });

  it('compares two derived branches in JOIN, derives after JOIN, and reloads stable identities', async () => {
    const { session, root } = selectedUnaryScenario();
    const joinId = root.binding.relationId;
    const leftId = root.inputs[0]!;
    const left = await session.query(leftId);
    const sourceFieldId = left.bindings.find(
      (field) => field.parentFieldId == null && field.displayName === 'name'
    )!.fieldId;
    const branchDocument = await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: leftId,
      expectedRevision: session.revision,
      alias: 'normalized_name',
      capabilityIds: [capability('upper')],
      operandFieldIds: [sourceFieldId],
    });
    const branchField = branchDocument.sidecar.fields.find(
      (field) => field.displayName === 'normalized_name'
    )!;
    await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: root.inputs[1]!,
      expectedRevision: session.revision,
      alias: 'normalized_key',
      formula: 'UPPER(TRIM(customer_id))',
    });
    const selectedJoin = await querySelectedJoin(session, joinId, session.revision);
    expect(selectedJoin.fields.some((field) => field.fieldId === branchField.fieldId)).toBe(true);

    const rightBinding = selectedJoin.inputs[1]!.bindings.find(
      (field) => field.displayName === 'normalized_key'
    )!;
    const rightField = selectedJoin.fields.find((field) => field.fieldId === rightBinding.fieldId)!;
    await replaceSelectedJoinConditions(session, {
      relationId: joinId,
      expectedRevision: session.revision,
      conditions: [
        {
          left: { kind: 'field', sourceFieldId: branchField.fieldId },
          right: { kind: 'field', sourceFieldId: rightField.fieldId },
        },
      ],
    });
    const joined = await querySelectedJoin(session, joinId, session.revision);
    const slots = relationOutputSlots(joined.target, joined.inputs);
    const branchSlot = slots.find((slot) =>
      slot.fields.some((field) => field.sourceFieldId === branchField.fieldId)
    )!;
    await changeSelectedRelationOutputs(session, {
      relationId: joinId,
      expectedRevision: session.revision,
      outputs: [
        ...slots.flatMap((slot) =>
          slot.output == null ? [] : [{ slot: slot.slot, alias: slot.name }]
        ),
        { slot: branchSlot.slot, alias: branchSlot.name },
      ],
    });
    const joinOutput = await session.query(joinId);
    const reusableField = joinOutput.bindings.find(
      (field) => field.parentFieldId == null && field.sourceFieldId === branchField.fieldId
    )!;
    const finalDocument = await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: joinId,
      expectedRevision: session.revision,
      alias: 'final_name',
      capabilityIds: [capability('trim')],
      operandFieldIds: [reusableField.fieldId],
    });
    const finalField = finalDocument.sidecar.fields.find(
      (field) => field.displayName === 'final_name'
    )!;

    const reopened = new CanvasRelationAnalysisSession('derived-output-reload');
    reopened.receive(finalDocument);
    expect(
      (await reopened.query(reopened.rootId)).bindings.map((field) => field.fieldId)
    ).toContain(finalField.fieldId);
    const condition = (await querySelectedJoin(reopened, joinId, reopened.revision))
      .conditions?.[0];
    if (condition == null || isDvtSubstraitJoinConditionGroup(condition))
      throw new Error('Expected comparison condition.');
    expect(condition.left).toEqual({ kind: 'field', sourceFieldId: branchField.fieldId });
    expect(condition.right).toEqual({ kind: 'field', sourceFieldId: rightField.fieldId });
  });
});
