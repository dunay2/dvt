import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { describe, expect, it } from 'vitest';
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  addDvtSubstraitJoinPredicateCondition,
  appendDvtSubstraitJoinInput,
  applyDvtSubstraitInnerJoinFieldEdit,
  applyDvtSubstraitInnerJoinGroupedRowNumber,
  applyDvtSubstraitInnerJoinGrouping,
  createDvtSubstraitJoinDraft,
  createDvtSubstraitStringJoinDraft,
  decodeDvtSubstraitJoinDocument,
  encodeDvtSubstraitJoinDocument,
  inspectDvtSubstraitBinaryJoinDraft,
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
  inspectDvtSubstraitInnerJoinGroupingDraft,
  inspectDvtSubstraitJoinDraft,
  removeDvtSubstraitInnerJoinGroupedRowNumber,
  removeDvtSubstraitInnerJoinGrouping,
  removeDvtSubstraitJoinPredicateCondition,
  renameDvtSubstraitInnerJoinCountOutput,
  renameDvtSubstraitInnerJoinGroupedRowNumberOutput,
  resolveDvtSubstraitNInputJoinEntry,
  setDvtSubstraitJoinType,
  updateDvtSubstraitJoinPredicateCondition,
  type DvtSubstraitJoinDraft,
  type DvtSubstraitJoinInput,
  type DvtSubstraitJoinSource,
  type DvtSubstraitNInputJoinProjection,
} from './canvasDvtSubstraitJoinComposition';
import {
  dvtSubstraitJoinConditionKey,
  isDvtSubstraitJoinNullCondition,
  type DvtSubstraitJoinComparisonCondition,
} from './canvasDvtSubstraitJoinCondition';
import {
  dvtSubstraitJoinOperandKey,
  type DvtSubstraitJoinPredicateOperand,
} from './canvasDvtSubstraitJoinOperand';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { resolveDvtSubstraitColumnFunctions } from './canvasDvtSubstraitProjection';

const OPAQUE_RELATION_ID =
  /^dvt_rel_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_FIELD_ID =
  /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function connectedSourceRef(table: string, connectionId = 'warehouse-main'): ConnectedSourceRef {
  return {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId,
      provider: 'postgres',
    },
    sourceObjectId: `public.${table}`,
  };
}

function source(
  nodeId: string,
  schema: string,
  table: string,
  connectionId = 'warehouse-main'
): DvtSubstraitJoinSource {
  return {
    nodeId,
    schema,
    table,
    sourceRef: connectedSourceRef(table, connectionId),
  };
}

function fixture(): DvtSubstraitJoinDraft {
  return createDvtSubstraitJoinDraft({
    left: source('source-customers', 'public', 'customers'),
    right: source('source-orders', 'public', 'orders'),
    targetNodeId: 'transform-customer-orders',
  });
}

function inspectNInput(draft: DvtSubstraitJoinDraft): DvtSubstraitNInputJoinProjection {
  const inspection = inspectDvtSubstraitJoinDraft(draft);
  if (!inspection.ok) throw new Error('Expected inspectable N-input JOIN.');
  return inspection.projection;
}

function outputByName(
  projection: DvtSubstraitNInputJoinProjection,
  name: string
): DvtSubstraitNInputJoinProjection['outputs'][number] {
  const output = projection.outputs.find((candidate) => candidate.name === name);
  if (output == null) throw new Error(`Expected output ${name}.`);
  return output;
}

function inputFieldId(
  projection: DvtSubstraitNInputJoinProjection,
  inputIndex: number,
  name: string
): string {
  const fieldId = projection.inputs[inputIndex]?.fields.find(
    (field) => field.name === name
  )?.fieldId;
  if (fieldId == null) throw new Error(`Expected input ${inputIndex}.${name}.`);
  return fieldId;
}

function firstConditionKey(draft: DvtSubstraitJoinDraft, joinRelationId: string): string {
  const projection = inspectNInput(draft);
  const index = projection.joinRelations.findIndex((join) => join.relationId === joinRelationId);
  const condition = projection.joins[index]!.conditions[0]!;
  return dvtSubstraitJoinConditionKey(condition, (operand) =>
    dvtSubstraitJoinOperandKey(operand, (field) => field.sourceFieldId)
  );
}

function expectOpaqueNewIdentity(draft: DvtSubstraitJoinDraft): void {
  draft.sidecar.relations.forEach((relation) =>
    expect(relation.relationId).toMatch(OPAQUE_RELATION_ID)
  );
  draft.sidecar.fields.forEach((field) => expect(field.fieldId).toMatch(OPAQUE_FIELD_ID));
  expect(new Set(draft.sidecar.relations.map((relation) => relation.relationId)).size).toBe(
    draft.sidecar.relations.length
  );
  expect(new Set(draft.sidecar.fields.map((field) => field.fieldId)).size).toBe(
    draft.sidecar.fields.length
  );
}

function appendShipmentInput(draft: DvtSubstraitJoinDraft): DvtSubstraitJoinDraft {
  const projection = inspectNInput(draft);
  const leftSourceFieldId = outputByName(projection, 'customer_id').source.fieldId;
  return appendDvtSubstraitJoinInput(draft, {
    source: source('source-shipments', 'public', 'shipments'),
    fields: ['shipment_id', 'customer_id'],
    predicate: {
      leftSourceFieldId,
      rightFieldName: 'customer_id',
    },
    selectedFields: ['shipment_id'],
  });
}

function appendPaymentInput(draft: DvtSubstraitJoinDraft): DvtSubstraitJoinDraft {
  const projection = inspectNInput(draft);
  const leftSourceFieldId = outputByName(projection, 'order_id').source.fieldId;
  return appendDvtSubstraitJoinInput(draft, {
    source: source('source-payments', 'public', 'payments'),
    fields: ['payment_id', 'order_id'],
    predicate: {
      leftSourceFieldId,
      rightFieldName: 'order_id',
    },
    selectedFields: ['payment_id'],
  });
}

function canonicalSource(id: string, table: string, fields: readonly string[]): CanonicalNode {
  return {
    id,
    name: table,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'public',
      tableName: table,
      connectedSourceRef: connectedSourceRef(table),
      columns: fields.map((name) => ({ name, type: 'string' })),
    },
  };
}

function legacyBinaryDraft(draft: DvtSubstraitJoinDraft): DvtSubstraitJoinDraft {
  const relationByAnchor = new Map<number, string>([
    [1, 'relation:source-customers'],
    [2, 'relation:source-orders'],
    [3, 'relation:transform-customer-orders:join'],
  ]);
  const relationMap = new Map(
    draft.sidecar.relations.map((relation) => [
      relation.relationId,
      relationByAnchor.get(relation.relAnchor) ?? relation.relationId,
    ])
  );
  const fieldMap = new Map<string, string>();
  for (const field of draft.sidecar.fields) {
    const relation = draft.sidecar.relations.find(
      (candidate) => candidate.relationId === field.relationId
    );
    const name = field.displayName ?? `field_${field.outputOrdinal}`;
    if (relation?.relAnchor === 1) fieldMap.set(field.fieldId, `field:source-customers:${name}`);
    else if (relation?.relAnchor === 2) fieldMap.set(field.fieldId, `field:source-orders:${name}`);
    else fieldMap.set(field.fieldId, `field:transform-customer-orders:${name}`);
  }
  return {
    plan: draft.plan,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.map((relation) => ({
        ...relation,
        relationId: relationMap.get(relation.relationId)!,
      })),
      fields: draft.sidecar.fields.map((field) => ({
        ...field,
        fieldId: fieldMap.get(field.fieldId)!,
        relationId: relationMap.get(field.relationId)!,
        ...(field.sourceFieldId == null
          ? {}
          : { sourceFieldId: fieldMap.get(field.sourceFieldId) ?? field.sourceFieldId }),
      })),
    },
  };
}

describe('DVT Substrait INNER JOIN identity', () => {
  it.each([
    [JoinRel_JoinType.LEFT_SEMI, 0],
    [JoinRel_JoinType.LEFT_ANTI, 0],
    [JoinRel_JoinType.RIGHT_SEMI, 1],
    [JoinRel_JoinType.RIGHT_ANTI, 1],
  ] as const)(
    'round-trips exact retained-side semantics for JOIN type %s',
    async (joinType, retainedInputIndex) => {
      const original = createDvtSubstraitJoinDraft({
        left: source('source-left', 'public', 'customers'),
        right: source('source-right', 'public', 'orders'),
        targetNodeId: 'transform',
        joinType,
      });
      const reloaded = decodeDvtSubstraitJoinDocument(encodeDvtSubstraitJoinDocument(original));
      const projection = inspectNInput(reloaded);

      expect(projection.joinRelations[0]?.joinType).toBe(joinType);
      expect(projection.outputs.length).toBeGreaterThan(0);
      expect(
        projection.outputs.every((output) => output.source.inputIndex === retainedInputIndex)
      ).toBe(true);
      const projected = await projectSubstraitToPostgresSql(reloaded);
      expect(projected.projection.outputs.map((field) => field.name)).toEqual(
        projection.outputs.map((field) => field.name)
      );
    }
  );

  it('chains N=3 only from the prior effective output and rebases a RIGHT ANTI stage', async () => {
    const leftSemi = createDvtSubstraitJoinDraft({
      left: source('source-left', 'public', 'customers'),
      right: source('source-right', 'public', 'orders'),
      targetNodeId: 'transform',
      joinType: JoinRel_JoinType.LEFT_SEMI,
    });
    const beforeAppend = inspectNInput(leftSemi);
    const customerId = outputByName(beforeAppend, 'customer_id').source.fieldId;
    const chained = appendDvtSubstraitJoinInput(leftSemi, {
      source: source('source-shipments', 'public', 'shipments'),
      fields: ['shipment_id', 'customer_id'],
      predicate: { leftSourceFieldId: customerId, rightFieldName: 'customer_id' },
      selectedFields: ['shipment_id', 'customer_id'],
      joinType: JoinRel_JoinType.RIGHT_ANTI,
    });
    const projection = inspectNInput(chained);

    expect(projection.joinRelations.map((stage) => stage.joinType)).toEqual([
      JoinRel_JoinType.LEFT_SEMI,
      JoinRel_JoinType.RIGHT_ANTI,
    ]);
    expect(projection.outputs.map((output) => output.source.inputIndex)).toEqual([2, 2]);
    expect(projection.stageOutputs[1]?.map((field) => field.sourceFieldId)).toEqual(
      projection.inputs[2]?.fields.map((field) => field.fieldId)
    );
    const projected = await projectSubstraitToPostgresSql(chained);
    expect(projected.projection.outputs.map((field) => field.name)).toEqual(
      projection.outputs.map((field) => field.name)
    );
  });

  it('rejects a later predicate that tries to recover a queried-side field', () => {
    const leftSemi = createDvtSubstraitJoinDraft({
      left: source('source-left', 'public', 'customers'),
      right: source('source-right', 'public', 'orders'),
      targetNodeId: 'transform',
      joinType: JoinRel_JoinType.LEFT_SEMI,
    });
    const projection = inspectNInput(leftSemi);
    const queriedFieldId = projection.inputs[1]!.fields[0]!.fieldId;

    const rejected = appendDvtSubstraitJoinInput(leftSemi, {
      source: source('source-shipments', 'public', 'shipments'),
      fields: ['shipment_id', 'customer_id'],
      predicate: { leftSourceFieldId: queriedFieldId, rightFieldName: 'customer_id' },
      selectedFields: ['shipment_id'],
    });

    expect(rejected).toBe(leftSemi);
  });

  it('rejects a type switch that would silently remove selected downstream outputs', () => {
    const original = fixture();
    const projection = inspectNInput(original);
    const switched = setDvtSubstraitJoinType({
      draft: original,
      joinRelationId: projection.joinRelations[0]!.relationId,
      joinType: JoinRel_JoinType.LEFT_SEMI,
    });

    expect(encodeDvtSubstraitJoinDocument(switched)).toEqual(
      encodeDvtSubstraitJoinDocument(original)
    );
  });

  it('changes one JOIN stage to LEFT and restores identical INNER bytes without identity churn', () => {
    const original = createDvtSubstraitJoinDraft({
      left: source('source-left', 'public', 'customers'),
      right: source('source-right', 'public', 'orders'),
      targetNodeId: 'transform',
    });
    const inspection = inspectDvtSubstraitJoinDraft(original);
    if (!inspection.ok) throw new Error('Expected an admitted JOIN.');
    const relationId = inspection.projection.joinRelations[0]!.relationId;
    const originalDocument = encodeDvtSubstraitJoinDocument(original);
    const left = setDvtSubstraitJoinType({
      draft: original,
      joinRelationId: relationId,
      joinType: JoinRel_JoinType.LEFT,
    });
    const leftInspection = inspectDvtSubstraitJoinDraft(left);

    expect(leftInspection.ok).toBe(true);
    if (!leftInspection.ok) return;
    expect(leftInspection.projection.joinRelations[0]).toMatchObject({
      relationId,
      joinType: JoinRel_JoinType.LEFT,
    });
    expect(leftInspection.projection.outputs.map((output) => output.fieldId)).toEqual(
      inspection.projection.outputs.map((output) => output.fieldId)
    );

    const restored = setDvtSubstraitJoinType({
      draft: left,
      joinRelationId: relationId,
      joinType: JoinRel_JoinType.INNER,
    });
    expect(encodeDvtSubstraitJoinDocument(restored).semanticPlan.bytesBase64).toBe(
      originalDocument.semanticPlan.bytesBase64
    );
  });

  it.each([
    {
      name: 'RIGHT(LEFT(A,B),C)',
      stageTypes: [JoinRel_JoinType.LEFT, JoinRel_JoinType.RIGHT],
      nullExtendedInputs: [0, 1],
    },
    {
      name: 'OUTER(INNER(A,B),C)',
      stageTypes: [JoinRel_JoinType.INNER, JoinRel_JoinType.OUTER],
      nullExtendedInputs: [0, 1, 2],
    },
    {
      name: 'LEFT(RIGHT(A,B),C)',
      stageTypes: [JoinRel_JoinType.RIGHT, JoinRel_JoinType.LEFT],
      nullExtendedInputs: [0, 2],
    },
  ] as const)(
    'round-trips $name with exact stage types and cumulative nullability',
    ({ stageTypes, nullExtendedInputs }) => {
      const original = appendShipmentInput(fixture());
      const originalProjection = inspectNInput(original);
      const [firstStage, secondStage] = originalProjection.joinRelations;
      if (firstStage == null || secondStage == null) throw new Error('Expected two JOIN stages.');
      const withFirstType = setDvtSubstraitJoinType({
        draft: original,
        joinRelationId: firstStage.relationId,
        joinType: stageTypes[0],
      });
      const mixed = setDvtSubstraitJoinType({
        draft: withFirstType,
        joinRelationId: secondStage.relationId,
        joinType: stageTypes[1],
      });
      const reloaded = decodeDvtSubstraitJoinDocument(encodeDvtSubstraitJoinDocument(mixed));
      const projection = inspectNInput(reloaded);

      expect(projection.joinRelations.map((stage) => stage.joinType)).toEqual(stageTypes);
      projection.outputs.forEach((output) => {
        const source = projection.inputs[output.source.inputIndex]!.fields.find(
          (field) => field.fieldId === output.source.fieldId
        )!;
        expect(output.nullable).toBe(
          new Set<number>(nullExtendedInputs).has(output.source.inputIndex) ? true : source.nullable
        );
      });
      expect(projection.outputs.map((output) => output.fieldId)).toEqual(
        originalProjection.outputs.map((output) => output.fieldId)
      );
    }
  );
  it.each(['is_null', 'is_not_null'] as const)(
    'round-trips unary %s without a right operand and renders PostgreSQL',
    async (operator) => {
      const draft = fixture();
      const before = inspectNInput(draft);
      const condition = {
        left: { kind: 'field' as const, sourceFieldId: inputFieldId(before, 0, 'name') },
        operator,
      };
      const edited = addDvtSubstraitJoinPredicateCondition({
        draft,
        joinRelationId: before.joinRelations[0]!.relationId,
        condition,
      });
      expect(edited).not.toBe(draft);
      const reloaded = decodeDvtSubstraitJoinDocument(encodeDvtSubstraitJoinDocument(edited));
      expect(inspectNInput(reloaded).joins[0]?.conditions.slice(1)).toEqual([condition]);
      expect(inspectNInput(reloaded).outputs).toEqual(before.outputs);
      await expect(projectSubstraitToPostgresSql(reloaded)).resolves.toMatchObject({
        projection: { outputs: before.outputs.map((field) => ({ name: field.name })) },
      });
      const root = reloaded.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'join') {
        throw new Error('Expected JOIN root.');
      }
      const conjunction = root.value.input.relType.value.expression?.rexType;
      if (conjunction?.case !== 'scalarFunction') throw new Error('Expected conjunction.');
      const argument = conjunction.value.arguments[1]?.argType;
      if (argument?.case !== 'value' || argument.value.rexType.case !== 'scalarFunction') {
        throw new Error('Expected unary scalar predicate.');
      }
      const unary = argument.value.rexType.value;
      expect(unary.arguments).toHaveLength(1);
      unary.arguments.push(unary.arguments[0]!);
      expect(
        inspectDvtSubstraitJoinDraft({
          ...reloaded,
          sidecar: { ...reloaded.sidecar, semanticPlanSha256: '0'.repeat(64) },
        }).ok
      ).toBe(false);
    }
  );

  it('uses the shared first-condition rail for functions, literals, nulls and same-field comparisons', async () => {
    const draft = fixture();
    const before = inspectNInput(draft);
    const joinRelationId = before.joinRelations[0]!.relationId;
    const conditionKey = firstConditionKey(draft, joinRelationId);
    const field = { kind: 'field' as const, sourceFieldId: inputFieldId(before, 0, 'name') };
    const text = {
      kind: 'literal' as const,
      literal: { dataType: 'string' as const, value: 'ES' },
    };
    const functions = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['string'],
      provider: 'postgres',
    });
    const upper = functions.find((fn) => fn.name === 'upper')!;
    const trim = functions.find((fn) => fn.name === 'trim')!;
    const nested = {
      kind: 'function' as const,
      capabilityId: upper.capabilityId,
      input: { kind: 'function' as const, capabilityId: trim.capabilityId, input: field },
    };
    const cases: readonly DvtSubstraitJoinComparisonCondition<DvtSubstraitJoinPredicateOperand>[] =
      [
        { left: field, right: text },
        { left: text, right: field },
        { left: field, right: field },
        { left: nested, right: text },
        { left: nested, operator: 'is_null' },
        { left: field, operator: 'is_not_null' },
      ];
    for (const condition of cases) {
      const edited = updateDvtSubstraitJoinPredicateCondition({
        draft,
        joinRelationId,
        conditionKey,
        condition,
      });
      expect(edited).not.toBe(draft);
      const reloaded = decodeDvtSubstraitJoinDocument(encodeDvtSubstraitJoinDocument(edited));
      const projection = inspectNInput(reloaded);
      expect(projection.joins[0]!.conditions).toEqual([condition]);
      expect(projection.joinRelations).toEqual(before.joinRelations);
      expect(projection.outputs).toEqual(before.outputs);
      expect(
        (await projectSubstraitToPostgresSql(reloaded)).projection.outputs.map(
          (field) => field.name
        )
      ).toEqual(before.outputs.map((field) => field.name));
    }
  });

  it('rejects unavailable first-condition references, malformed unary arity and removal of the last condition', () => {
    const draft = appendShipmentInput(fixture());
    const before = inspectNInput(draft);
    const joinRelationId = before.joinRelations[0]!.relationId;
    const conditionKey = firstConditionKey(draft, joinRelationId);
    for (const sourceFieldId of ['missing', inputFieldId(before, 2, 'shipment_id')]) {
      expect(
        updateDvtSubstraitJoinPredicateCondition({
          draft,
          joinRelationId,
          conditionKey,
          condition: { left: { kind: 'field', sourceFieldId }, operator: 'is_null' },
        })
      ).toBe(draft);
    }
    const field = { kind: 'field' as const, sourceFieldId: inputFieldId(before, 0, 'name') };
    expect(
      updateDvtSubstraitJoinPredicateCondition({
        draft,
        joinRelationId,
        conditionKey,
        condition: { left: field, right: field, operator: 'is_null' } as never,
      })
    ).toBe(draft);
    expect(removeDvtSubstraitJoinPredicateCondition({ draft, joinRelationId, conditionKey })).toBe(
      draft
    );
    const added = addDvtSubstraitJoinPredicateCondition({
      draft,
      joinRelationId,
      condition: { left: field, operator: 'is_not_null' },
    });
    const removed = removeDvtSubstraitJoinPredicateCondition({
      draft: added,
      joinRelationId,
      conditionKey,
    });
    expect(inspectNInput(removed).joins[0]!.conditions).toEqual([
      { left: field, operator: 'is_not_null' },
    ]);
    expect(inspectNInput(removed).joinRelations).toEqual(before.joinRelations);
  });

  it('allocates opaque persisted identities while keeping predicates structural', () => {
    const draft = fixture();
    const projection = inspectNInput(draft);
    const binary = inspectDvtSubstraitBinaryJoinDraft(draft);

    expect(binary.ok).toBe(true);
    expectOpaqueNewIdentity(draft);
    expect(projection.inputs).toHaveLength(2);
    expect(projection.joinRelations).toHaveLength(1);
    expect(projection.joins).toEqual([
      {
        conditions: [
          {
            left: { kind: 'field', sourceFieldId: inputFieldId(projection, 0, 'customer_id') },
            right: { kind: 'field', sourceFieldId: inputFieldId(projection, 1, 'customer_id') },
          },
        ],
      },
    ]);
    expect(projection.outputs.map((output) => output.name)).toEqual([
      'customer_id',
      'name',
      'order_id',
    ]);
    expect(projection.outputs.map((output) => output.source.inputIndex)).toEqual([0, 0, 1]);
  });

  it('keeps the surviving input, result and output identities when a third input is appended', () => {
    const beforeDraft = fixture();
    const before = inspectNInput(beforeDraft);
    const beforeInputRelationIds = before.inputs.map((input) => input.relationId);
    const beforeInputFieldIds = before.inputs.map((input) =>
      input.fields.map((field) => field.fieldId)
    );
    const beforeResultRelationId = before.joinRelations.at(-1)?.relationId;
    const beforeOutputIds = new Map(before.outputs.map((output) => [output.name, output.fieldId]));

    const afterDraft = appendShipmentInput(beforeDraft);
    const after = inspectNInput(afterDraft);

    expect(after.inputs).toHaveLength(3);
    expect(after.inputs.slice(0, 2).map((input) => input.relationId)).toEqual(
      beforeInputRelationIds
    );
    expect(
      after.inputs.slice(0, 2).map((input) => input.fields.map((field) => field.fieldId))
    ).toEqual(beforeInputFieldIds);
    expect(after.joinRelations.at(-1)?.relationId).toBe(beforeResultRelationId);
    for (const [name, fieldId] of beforeOutputIds) {
      expect(outputByName(after, name).fieldId).toBe(fieldId);
    }
    expect(outputByName(after, 'shipment_id').fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(after.inputs[2]?.relationId).toMatch(OPAQUE_RELATION_ID);
    after.inputs[2]?.fields.forEach((field) => expect(field.fieldId).toMatch(OPAQUE_FIELD_ID));
    expect(after.joinRelations[0]?.relationId).toMatch(OPAQUE_RELATION_ID);
    expect(after.joinRelations[0]?.relationId).not.toBe(beforeResultRelationId);
  });

  it('continues preserving existing identity across a fourth input append', () => {
    const threeDraft = appendShipmentInput(fixture());
    const three = inspectNInput(threeDraft);
    const outputIds = new Map(three.outputs.map((output) => [output.name, output.fieldId]));
    const resultRelationId = three.joinRelations.at(-1)?.relationId;

    const fourDraft = appendPaymentInput(threeDraft);
    const four = inspectNInput(fourDraft);

    expect(four.inputs).toHaveLength(4);
    expect(four.joinRelations.at(-1)?.relationId).toBe(resultRelationId);
    for (const [name, fieldId] of outputIds) {
      expect(outputByName(four, name).fieldId).toBe(fieldId);
    }
    expect(outputByName(four, 'payment_id').fieldId).toMatch(OPAQUE_FIELD_ID);
  });

  it('changes both join predicate operands atomically through retained identities', () => {
    const draft = fixture();
    const before = inspectNInput(draft);
    const joinRelationId = before.joinRelations[0]?.relationId;
    if (joinRelationId == null) throw new Error('Expected the join relation identity.');
    const nextLeftFieldId = inputFieldId(before, 0, 'name');
    const nextRightFieldId = inputFieldId(before, 1, 'order_id');

    const edited = updateDvtSubstraitJoinPredicateCondition({
      draft,
      joinRelationId,
      conditionKey: firstConditionKey(draft, joinRelationId),
      condition: {
        left: { kind: 'field', sourceFieldId: nextLeftFieldId },
        right: { kind: 'field', sourceFieldId: nextRightFieldId },
        operator: 'not_equal',
      },
    });
    const after = inspectNInput(edited);

    expect(after.joins).toEqual([
      {
        conditions: [
          {
            left: { kind: 'field', sourceFieldId: nextLeftFieldId },
            right: { kind: 'field', sourceFieldId: nextRightFieldId },
            operator: 'not_equal',
          },
        ],
      },
    ]);
    expect(after.joinRelations[0]?.relationId).toBe(joinRelationId);
    expect(after.inputs.map((input) => input.relationId)).toEqual(
      before.inputs.map((input) => input.relationId)
    );
    expect(after.outputs.map((output) => output.fieldId)).toEqual(
      before.outputs.map((output) => output.fieldId)
    );
  });

  it('allows an atomic type transition and rejects invalid predicate pairs', () => {
    const draft = createDvtSubstraitStringJoinDraft({
      left: {
        source: source('source-left', 'public', 'left_table'),
        fields: ['id', 'amount'],
        fieldTypes: ['string', 'fp64'],
      },
      right: {
        source: source('source-right', 'public', 'right_table'),
        fields: ['id', 'amount'],
        fieldTypes: ['string', 'fp64'],
      },
      leftFieldName: 'id',
      rightFieldName: 'id',
      targetNodeId: 'transform-typed-join',
    });
    const projection = inspectNInput(draft);
    const joinRelationId = projection.joinRelations[0]?.relationId;
    if (joinRelationId == null) throw new Error('Expected the join relation identity.');

    const numeric = updateDvtSubstraitJoinPredicateCondition({
      draft,
      joinRelationId,
      conditionKey: firstConditionKey(draft, joinRelationId),
      condition: {
        left: { kind: 'field', sourceFieldId: inputFieldId(projection, 0, 'amount') },
        right: { kind: 'field', sourceFieldId: inputFieldId(projection, 1, 'amount') },
      },
    });
    expect(inspectNInput(numeric).joins).toEqual([
      {
        conditions: [
          {
            left: { kind: 'field', sourceFieldId: inputFieldId(projection, 0, 'amount') },
            right: { kind: 'field', sourceFieldId: inputFieldId(projection, 1, 'amount') },
          },
        ],
      },
    ]);
    expect(
      updateDvtSubstraitJoinPredicateCondition({
        draft,
        joinRelationId,
        conditionKey: firstConditionKey(draft, joinRelationId),
        condition: {
          left: { kind: 'field', sourceFieldId: inputFieldId(projection, 0, 'amount') },
          right: { kind: 'field', sourceFieldId: inputFieldId(projection, 1, 'id') },
        },
      })
    ).toBe(draft);
    expect(
      updateDvtSubstraitJoinPredicateCondition({
        draft,
        joinRelationId,
        conditionKey: firstConditionKey(draft, joinRelationId),
        condition: {
          left: { kind: 'field', sourceFieldId: inputFieldId(projection, 0, 'id') },
          right: { kind: 'field', sourceFieldId: inputFieldId(projection, 0, 'amount') },
        },
      })
    ).toBe(draft);
  });

  it.each(['gt', 'gte', 'lt', 'lte'] as const)(
    'round-trips the %s comparison on the retained JOIN predicate',
    (operator) => {
      const draft = fixture();
      const before = inspectNInput(draft);
      const joinRelationId = before.joinRelations[0]?.relationId;
      const predicate = before.joins[0]?.conditions[0];
      if (
        joinRelationId == null ||
        predicate == null ||
        predicate.kind === 'group' ||
        isDvtSubstraitJoinNullCondition(predicate)
      ) {
        throw new Error('Expected the join relation and predicate.');
      }

      const edited = updateDvtSubstraitJoinPredicateCondition({
        draft,
        joinRelationId,
        conditionKey: firstConditionKey(draft, joinRelationId),
        condition: {
          left: predicate.left,
          right: predicate.right,
          operator,
        },
      });

      const editedCondition = inspectNInput(edited).joins[0]?.conditions[0];
      expect(editedCondition?.kind !== 'group' && editedCondition?.operator).toBe(operator);
    }
  );

  it('adds a typed literal comparison with an OR connector to the retained predicate', () => {
    const draft = createDvtSubstraitStringJoinDraft({
      left: {
        source: source('source-left', 'public', 'orders'),
        fields: ['id', 'priority'],
        fieldTypes: ['string', 'bool'],
      },
      right: {
        source: source('source-right', 'public', 'clients'),
        fields: ['id', 'active'],
        fieldTypes: ['string', 'bool'],
      },
      leftFieldName: 'id',
      rightFieldName: 'id',
      targetNodeId: 'transform-typed-literal-join',
    });
    const before = inspectNInput(draft);
    const joinRelationId = before.joinRelations[0]?.relationId;
    if (joinRelationId == null) throw new Error('Expected the join relation identity.');
    const activeFieldId = inputFieldId(before, 1, 'active');

    const withLiteral = addDvtSubstraitJoinPredicateCondition({
      draft,
      joinRelationId,
      condition: {
        left: { kind: 'field', sourceFieldId: activeFieldId },
        right: { kind: 'literal', literal: { dataType: 'bool', value: true } },
        operator: 'not_equal',
        combination: 'or',
      },
    });
    const reloaded = decodeDvtSubstraitJoinDocument(encodeDvtSubstraitJoinDocument(withLiteral));
    const after = inspectNInput(reloaded);

    expect(after.joins[0]).toEqual({
      conditions: [
        {
          left: { kind: 'field', sourceFieldId: inputFieldId(before, 0, 'id') },
          right: { kind: 'field', sourceFieldId: inputFieldId(before, 1, 'id') },
        },
        {
          left: { kind: 'field', sourceFieldId: activeFieldId },
          right: { kind: 'literal', literal: { dataType: 'bool', value: true } },
          operator: 'not_equal',
          combination: 'or',
        },
      ],
    });
    expect(after.joinRelations[0]?.relationId).toBe(joinRelationId);
    expect(after.outputs.map((output) => output.fieldId)).toEqual(
      before.outputs.map((output) => output.fieldId)
    );
    expect(
      addDvtSubstraitJoinPredicateCondition({
        draft,
        joinRelationId,
        condition: {
          left: { kind: 'field', sourceFieldId: activeFieldId },
          right: { kind: 'literal', literal: { dataType: 'i64', value: 1n } },
        },
      })
    ).toBe(draft);
  });

  it('round-trips a constant literal comparison in the retained JOIN predicate', () => {
    const draft = fixture();
    const before = inspectNInput(draft);
    const joinRelationId = before.joinRelations[0]?.relationId;
    if (joinRelationId == null) throw new Error('Expected the join relation identity.');

    const edited = addDvtSubstraitJoinPredicateCondition({
      draft,
      joinRelationId,
      condition: {
        left: { kind: 'literal', literal: { dataType: 'i64', value: 1n } },
        right: { kind: 'literal', literal: { dataType: 'i64', value: 1n } },
      },
    });
    const reloaded = decodeDvtSubstraitJoinDocument(encodeDvtSubstraitJoinDocument(edited));

    expect(inspectNInput(reloaded).joins[0]?.conditions.slice(1)).toEqual([
      {
        left: { kind: 'literal', literal: { dataType: 'i64', value: 1n } },
        right: { kind: 'literal', literal: { dataType: 'i64', value: 1n } },
      },
    ]);
  });

  it('round-trips a left literal against N unary functions around a field', () => {
    const draft = createDvtSubstraitStringJoinDraft({
      left: {
        source: source('source-left', 'public', 'orders'),
        fields: ['id'],
      },
      right: {
        source: source('source-right', 'public', 'clients'),
        fields: ['id'],
      },
      leftFieldName: 'id',
      rightFieldName: 'id',
      targetNodeId: 'transform-function-join',
    });
    const before = inspectNInput(draft);
    const joinRelationId = before.joinRelations[0]?.relationId;
    if (joinRelationId == null) throw new Error('Expected the join relation identity.');
    const trim = resolveDvtSubstraitColumnFunctions({
      dataType: 'string',
      provider: 'postgres',
    }).find((capability) => capability.name === 'trim');
    const upper = resolveDvtSubstraitColumnFunctions({
      dataType: 'string',
      provider: 'postgres',
    }).find((capability) => capability.name === 'upper');
    if (trim == null || upper == null) throw new Error('Expected admitted unary functions.');
    const rightField = { kind: 'field' as const, sourceFieldId: inputFieldId(before, 0, 'id') };

    const edited = addDvtSubstraitJoinPredicateCondition({
      draft,
      joinRelationId,
      condition: {
        left: { kind: 'literal', literal: { dataType: 'string', value: 'ORDER-1' } },
        right: {
          kind: 'function',
          capabilityId: upper.capabilityId,
          input: {
            kind: 'function',
            capabilityId: trim.capabilityId,
            input: rightField,
          },
        },
      },
    });
    const after = inspectNInput(
      decodeDvtSubstraitJoinDocument(encodeDvtSubstraitJoinDocument(edited))
    );
    const addedCondition = after.joins[0]?.conditions[1];
    if (addedCondition == null || addedCondition.kind === 'group') {
      throw new Error('Expected one function comparison.');
    }

    expect(addedCondition.left).toEqual({
      kind: 'literal',
      literal: { dataType: 'string', value: 'ORDER-1' },
    });
    expect(addedCondition.right).toEqual({
      kind: 'function',
      capabilityId: upper.capabilityId,
      input: {
        kind: 'function',
        capabilityId: trim.capabilityId,
        input: rightField,
      },
    });
  });

  it('round-trips A AND (B OR C) as a grouped JOIN condition', () => {
    const draft = createDvtSubstraitStringJoinDraft({
      left: {
        source: source('source-left', 'public', 'orders'),
        fields: ['id', 'country'],
      },
      right: {
        source: source('source-right', 'public', 'clients'),
        fields: ['id', 'country', 'active'],
        fieldTypes: ['string', 'string', 'bool'],
      },
      leftFieldName: 'id',
      rightFieldName: 'id',
      targetNodeId: 'transform-grouped-join',
    });
    const before = inspectNInput(draft);
    const joinRelationId = before.joinRelations[0]?.relationId;
    if (joinRelationId == null) throw new Error('Expected the join relation identity.');
    const countryFieldId = inputFieldId(before, 1, 'country');
    const activeFieldId = inputFieldId(before, 1, 'active');
    const withCountry = addDvtSubstraitJoinPredicateCondition({
      draft,
      joinRelationId,
      condition: {
        left: { kind: 'field', sourceFieldId: countryFieldId },
        right: { kind: 'literal', literal: { dataType: 'string', value: 'ES' } },
      },
    });
    const grouped = addDvtSubstraitJoinPredicateCondition({
      draft: withCountry,
      joinRelationId,
      groupWithPrevious: true,
      condition: {
        left: { kind: 'field', sourceFieldId: activeFieldId },
        right: { kind: 'literal', literal: { dataType: 'bool', value: false } },
        combination: 'or',
      },
    });

    const after = inspectNInput(
      decodeDvtSubstraitJoinDocument(encodeDvtSubstraitJoinDocument(grouped))
    );

    expect(after.joins[0]?.conditions.slice(1)).toEqual([
      {
        kind: 'group',
        combination: 'and',
        conditions: [
          {
            left: { kind: 'field', sourceFieldId: countryFieldId },
            right: { kind: 'literal', literal: { dataType: 'string', value: 'ES' } },
          },
          {
            left: { kind: 'field', sourceFieldId: activeFieldId },
            right: { kind: 'literal', literal: { dataType: 'bool', value: false } },
            combination: 'or',
          },
        ],
      },
    ]);
  });

  it('updates and removes one grouped JOIN comparison without changing relation or output identity', () => {
    const draft = createDvtSubstraitStringJoinDraft({
      left: {
        source: source('source-left', 'public', 'orders'),
        fields: ['id', 'country'],
      },
      right: {
        source: source('source-right', 'public', 'clients'),
        fields: ['id', 'country', 'active'],
        fieldTypes: ['string', 'string', 'bool'],
      },
      leftFieldName: 'id',
      rightFieldName: 'id',
      targetNodeId: 'transform-edit-grouped-join',
    });
    const before = inspectNInput(draft);
    const joinRelationId = before.joinRelations[0]?.relationId;
    if (joinRelationId == null) throw new Error('Expected the join relation identity.');
    const countryFieldId = inputFieldId(before, 1, 'country');
    const activeFieldId = inputFieldId(before, 1, 'active');
    const withCountry = addDvtSubstraitJoinPredicateCondition({
      draft,
      joinRelationId,
      condition: {
        left: { kind: 'field', sourceFieldId: countryFieldId },
        right: { kind: 'literal', literal: { dataType: 'string', value: 'ES' } },
      },
    });
    const grouped = addDvtSubstraitJoinPredicateCondition({
      draft: withCountry,
      joinRelationId,
      groupWithPrevious: true,
      condition: {
        left: { kind: 'field', sourceFieldId: activeFieldId },
        right: { kind: 'literal', literal: { dataType: 'bool', value: false } },
        combination: 'or',
      },
    });
    const groupedProjection = inspectNInput(grouped);
    const group = groupedProjection.joins[0]?.conditions[1];
    if (group == null || group.kind !== 'group') throw new Error('Expected grouped conditions.');
    const [country, active] = group.conditions;
    if (country == null || country.kind === 'group' || active == null || active.kind === 'group') {
      throw new Error('Expected two comparison conditions.');
    }
    if (isDvtSubstraitJoinNullCondition(country) || isDvtSubstraitJoinNullCondition(active)) {
      throw new Error('Expected binary comparisons.');
    }
    const conditionKey = (condition: (typeof group.conditions)[number]): string =>
      dvtSubstraitJoinConditionKey(condition, (operand) =>
        dvtSubstraitJoinOperandKey(operand, (field) => field.sourceFieldId)
      );

    const updatedCountry = updateDvtSubstraitJoinPredicateCondition({
      draft: grouped,
      joinRelationId,
      conditionKey: conditionKey(country),
      condition: {
        ...country,
        right: { kind: 'literal', literal: { dataType: 'string', value: 'PT' } },
      },
    });
    const updatedActive = updateDvtSubstraitJoinPredicateCondition({
      draft: updatedCountry,
      joinRelationId,
      conditionKey: conditionKey(active),
      condition: { ...active, combination: 'and' },
    });
    const updatedProjection = inspectNInput(updatedActive);
    const updatedGroup = updatedProjection.joins[0]?.conditions[1];
    if (updatedGroup == null || updatedGroup.kind !== 'group') {
      throw new Error('Expected the group to remain after editing.');
    }
    const updatedActiveCondition = updatedGroup.conditions[1];
    if (updatedActiveCondition == null || updatedActiveCondition.kind === 'group') {
      throw new Error('Expected the updated active condition.');
    }

    const removed = removeDvtSubstraitJoinPredicateCondition({
      draft: updatedActive,
      joinRelationId,
      conditionKey: conditionKey(updatedActiveCondition),
    });
    const after = inspectNInput(
      decodeDvtSubstraitJoinDocument(encodeDvtSubstraitJoinDocument(removed))
    );

    expect(after.joins[0]?.conditions.slice(1)).toEqual([
      {
        left: { kind: 'field', sourceFieldId: countryFieldId },
        right: { kind: 'literal', literal: { dataType: 'string', value: 'PT' } },
      },
    ]);
    expect(after.joinRelations).toEqual(before.joinRelations);
    expect(after.outputs.map((output) => output.fieldId)).toEqual(
      before.outputs.map((output) => output.fieldId)
    );
    expect(
      removeDvtSubstraitJoinPredicateCondition({
        draft: removed,
        joinRelationId,
        conditionKey: 'missing-condition',
      })
    ).toBe(removed);
  });

  it('preserves an N-input output FieldId through rename and reorder', () => {
    const draft = appendShipmentInput(fixture());
    const projection = inspectNInput(draft);
    const shipment = outputByName(projection, 'shipment_id');

    const rejected = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'rename',
      sourceFieldId: shipment.source.fieldId,
      outputName: 'x'.repeat(257),
    });
    expect(rejected).toBe(draft);

    const renamed = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'rename',
      sourceFieldId: shipment.source.fieldId,
      outputName: 'parcel_id',
    });
    const renamedProjection = inspectNInput(renamed);
    expect(outputByName(renamedProjection, 'parcel_id').fieldId).toBe(shipment.fieldId);

    const moved = applyDvtSubstraitInnerJoinFieldEdit(renamed, {
      kind: 'move',
      sourceFieldId: shipment.source.fieldId,
      direction: 'up',
    });
    const movedProjection = inspectNInput(moved);
    expect(outputByName(movedProjection, 'parcel_id').fieldId).toBe(shipment.fieldId);
  });

  it('allocates a fresh FieldId when an output is deleted and recreated', () => {
    const draft = fixture();
    const before = inspectDvtSubstraitBinaryJoinDraft(draft);
    if (!before.ok) throw new Error('Expected binary JOIN.');
    const original = before.projection.outputs.find(
      (output) => output.fieldKey === 'right.order_id'
    );
    if (original == null) throw new Error('Expected order output.');

    const removed = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'set-selected',
      fieldKey: 'right.order_id',
      selected: false,
    });
    const recreated = applyDvtSubstraitInnerJoinFieldEdit(removed, {
      kind: 'set-selected',
      fieldKey: 'right.order_id',
      selected: true,
    });
    const after = inspectDvtSubstraitBinaryJoinDraft(recreated);
    if (!after.ok) throw new Error('Expected recreated binary JOIN.');
    const replacement = after.projection.outputs.find(
      (output) => output.fieldKey === 'right.order_id'
    );

    expect(replacement?.fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(replacement?.fieldId).not.toBe(original.fieldId);
  });

  it('treats collision handling as a display-name concern rather than an identity factory', () => {
    const left: DvtSubstraitJoinInput = {
      source: source('source-left', 'public', 'left_table'),
      fields: ['id', 'value'],
    };
    const right: DvtSubstraitJoinInput = {
      source: source('source-right', 'public', 'right_table'),
      fields: ['id', 'value'],
    };
    const draft = createDvtSubstraitStringJoinDraft({
      left,
      right,
      leftFieldName: 'id',
      rightFieldName: 'id',
      targetNodeId: 'transform-string-join',
    });
    const projection = inspectNInput(draft);

    expect(new Set(projection.outputs.map((output) => output.name)).size).toBe(
      projection.outputs.length
    );
    expect(new Set(projection.outputs.map((output) => output.fieldId)).size).toBe(
      projection.outputs.length
    );
    projection.outputs.forEach((output) => expect(output.fieldId).toMatch(OPAQUE_FIELD_ID));
    expect(projection.outputs.some((output) => output.name.includes('right_table'))).toBe(true);
  });

  it('creates opaque COUNT and rank identities and preserves them through rename', () => {
    const draft = appendShipmentInput(fixture());
    const base = inspectNInput(draft);
    const grain = outputByName(base, 'shipment_id');

    const grouped = applyDvtSubstraitInnerJoinGrouping(draft, {
      groupFieldId: grain.fieldId,
      countOutputName: 'row_count',
    });
    const grouping = inspectDvtSubstraitInnerJoinGroupingDraft(grouped);
    if (!grouping.ok) throw new Error('Expected JOIN grouping.');
    const countId = grouping.projection.measure.fieldId;
    expect(grouping.projection.groupField.fieldId).toBe(grain.fieldId);
    expect(countId).toMatch(OPAQUE_FIELD_ID);
    expect(countId).not.toBe(grain.fieldId);

    const renamedCount = renameDvtSubstraitInnerJoinCountOutput(grouped, 'orders_count');
    const renamedGrouping = inspectDvtSubstraitInnerJoinGroupingDraft(renamedCount);
    expect(renamedGrouping.ok && renamedGrouping.projection.measure.fieldId).toBe(countId);

    const ranked = applyDvtSubstraitInnerJoinGroupedRowNumber(renamedCount, {
      outputName: 'group_rank',
    });
    const window = inspectDvtSubstraitInnerJoinGroupedWindowDraft(ranked);
    if (!window.ok) throw new Error('Expected JOIN grouped window.');
    const rankId = window.projection.result.fieldId;
    expect(window.projection.result.nullable).toBe(false);
    expect(window.projection.outputs.at(-1)?.nullable).toBe(false);
    expect(rankId).toMatch(OPAQUE_FIELD_ID);
    expect(rankId).not.toBe(countId);

    const renamedRank = renameDvtSubstraitInnerJoinGroupedRowNumberOutput(ranked, 'ranked_group');
    const renamedWindow = inspectDvtSubstraitInnerJoinGroupedWindowDraft(renamedRank);
    expect(renamedWindow.ok && renamedWindow.projection.result.fieldId).toBe(rankId);

    expect(
      inspectDvtSubstraitInnerJoinGroupingDraft(removeDvtSubstraitInnerJoinGroupedRowNumber(ranked))
        .ok
    ).toBe(true);
    expect(inspectDvtSubstraitJoinDraft(removeDvtSubstraitInnerJoinGrouping(grouped)).ok).toBe(
      true
    );
  });

  it('does not reserve join-count names as semantic identities', () => {
    const draft = createDvtSubstraitStringJoinDraft({
      left: {
        source: source('source-a', 'public', 'a'),
        fields: ['customer_id', 'join-count'],
      },
      right: {
        source: source('source-b', 'public', 'b'),
        fields: ['customer_id', 'join-count-rank'],
      },
      leftFieldName: 'customer_id',
      rightFieldName: 'customer_id',
      targetNodeId: 'transform-reserved-names',
    });
    const projection = inspectNInput(draft);

    expect(projection.outputs.map((output) => output.name)).toEqual(
      expect.arrayContaining(['join-count', 'join-count-rank'])
    );
    projection.outputs.forEach((output) => expect(output.fieldId).toMatch(OPAQUE_FIELD_ID));
  });

  it('keeps semantic plan determinism separate from fresh sidecar identity allocation', () => {
    const first = encodeDvtSubstraitJoinDocument(fixture());
    const second = encodeDvtSubstraitJoinDocument(fixture());

    expect(first.semanticPlan.sha256).toBe(second.semanticPlan.sha256);
    expect(first.sidecar.relations.map((relation) => relation.relationId)).not.toEqual(
      second.sidecar.relations.map((relation) => relation.relationId)
    );
    expect(first.sidecar.fields.map((field) => field.fieldId)).not.toEqual(
      second.sidecar.fields.map((field) => field.fieldId)
    );
  });

  it('preserves one persisted draft identity across encode and reload', () => {
    const draft = fixture();
    const document = encodeDvtSubstraitJoinDocument(draft);
    const reloaded = decodeDvtSubstraitJoinDocument(document);

    expect(reloaded.sidecar.relations).toEqual(document.sidecar.relations);
    expect(reloaded.sidecar.fields).toEqual(document.sidecar.fields);
    expect(inspectDvtSubstraitBinaryJoinDraft(reloaded).ok).toBe(true);
  });

  it('accepts old-format persisted IDs as opaque values and preserves them through edit/reload', () => {
    const legacy = legacyBinaryDraft(fixture());
    const inspection = inspectDvtSubstraitBinaryJoinDraft(legacy);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    const nameField = inspection.projection.outputs.find(
      (output) => output.fieldKey === 'left.name'
    );
    if (nameField == null) throw new Error('Expected legacy name output.');

    const renamed = applyDvtSubstraitInnerJoinFieldEdit(legacy, {
      kind: 'rename',
      fieldKey: 'left.name',
      outputName: 'customer_name',
    });
    const renamedInspection = inspectDvtSubstraitBinaryJoinDraft(renamed);
    if (!renamedInspection.ok) throw new Error('Expected renamed legacy JOIN.');
    expect(
      renamedInspection.projection.outputs.find((output) => output.fieldKey === 'left.name')
        ?.fieldId
    ).toBe(nameField.fieldId);

    const reloaded = decodeDvtSubstraitJoinDocument(encodeDvtSubstraitJoinDocument(renamed));
    const reloadedInspection = inspectDvtSubstraitBinaryJoinDraft(reloaded);
    if (!reloadedInspection.ok) throw new Error('Expected reloaded legacy JOIN.');
    expect(
      reloadedInspection.projection.outputs.find((output) => output.fieldKey === 'left.name')
        ?.fieldId
    ).toBe(nameField.fieldId);
  });

  it('resolves semantic inputs back to graph sources by sourceRef and field closure', () => {
    const customers = canonicalSource('source-customers', 'customers', ['customer_id', 'name']);
    const orders = canonicalSource('source-orders', 'orders', ['order_id', 'customer_id']);
    const draft = fixture();
    const transform = applyDvtSubstraitSemanticDocument(
      {
        id: 'transform-customer-orders',
        name: 'Customer orders',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        metadata: {},
      },
      encodeDvtSubstraitJoinDocument(draft)
    );
    const edges: CanonicalEdge[] = [
      {
        id: 'customers-to-transform',
        sourceId: customers.id,
        targetId: transform.id,
        relation: 'lineage',
      },
      {
        id: 'orders-to-transform',
        sourceId: orders.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];

    const entry = resolveDvtSubstraitNInputJoinEntry({
      targetNode: transform,
      nodes: [customers, orders, transform],
      edges,
    });

    expect(entry?.inputs.map((input) => input.source.nodeId)).toEqual([customers.id, orders.id]);
    expect(entry?.outputs.map((output) => output.fieldId)).toEqual(
      inspectNInput(draft).outputs.map((output) => output.fieldId)
    );
  });

  it('fails closed on incompatible sources, duplicate identity and stale hash', () => {
    expect(() =>
      createDvtSubstraitJoinDraft({
        left: source('source-customers', 'public', 'customers', 'warehouse-a'),
        right: source('source-orders', 'public', 'orders', 'warehouse-b'),
        targetNodeId: 'transform-customer-orders',
      })
    ).toThrow();

    const draft = fixture();
    const duplicateField = {
      ...draft,
      sidecar: {
        ...draft.sidecar,
        fields: draft.sidecar.fields.map((field, index) =>
          index === 1 ? { ...field, fieldId: draft.sidecar.fields[0]!.fieldId } : field
        ),
      },
    };
    expect(inspectDvtSubstraitJoinDraft(duplicateField).ok).toBe(false);

    const encoded = encodeDvtSubstraitJoinDocument(draft);
    expect(() =>
      decodeDvtSubstraitJoinDocument({
        ...encoded,
        sidecar: { ...encoded.sidecar, semanticPlanSha256: 'f'.repeat(64) },
      })
    ).toThrow();
  });
});
