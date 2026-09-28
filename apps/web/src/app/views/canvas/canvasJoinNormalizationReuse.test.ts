import { describe, expect, it } from 'vitest';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';

import { applyJoinNormalization } from './canvasJoinNormalizationApply';
import { projectJoinNormalizationWithReuse } from './canvasJoinNormalizationReuse';
import type { DvtSubstraitJoinPredicateOperand } from './canvasDvtSubstraitJoinOperand';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';

function capability(name: 'upper'): string {
  const value = resolveDvtSubstraitColumnFunctions({
    dataTypes: ['string'],
    provider: 'postgres',
    resolution: 'complete',
  }).find((entry) => entry.name === name);
  if (value == null) throw new Error(`Missing ${name} capability.`);
  return value.capabilityId;
}

function upper(fieldId: string): DvtSubstraitJoinPredicateOperand {
  return {
    kind: 'function',
    capabilityId: capability('upper'),
    input: { kind: 'field', sourceFieldId: fieldId },
  };
}

async function scenarioWithReusableLeftOutput() {
  const { session } = selectedUnaryScenario();
  const initial = await querySelectedJoin(session, session.rootId, session.revision);
  const leftInputId = initial.inputs[0]!.relationId;
  const originalLeftField = initial.fields.find((field) => field.inputIndex === 0)!;

  await applySelectedRelationDerivedOutput(session, {
    intent: 'insert',
    relationId: leftInputId,
    expectedRevision: session.revision,
    alias: 'normalized_name',
    capabilityIds: [capability('upper')],
    operandFieldIds: [originalLeftField.fieldId],
  });

  const afterDerive = await querySelectedJoin(session, initial.relationId, session.revision);
  const leftInput = afterDerive.inputs[0]!;
  const passthrough = leftInput.bindings.find(
    (field) =>
      field.parentFieldId == null &&
      field.sourceFieldId === originalLeftField.fieldId
  );
  const reusable = leftInput.bindings.find(
    (field) => field.parentFieldId == null && field.displayName === 'normalized_name'
  );
  const right = afterDerive.fields.find((field) => field.inputIndex === 1);
  if (passthrough == null || reusable == null || right == null) {
    throw new Error('Expected derived-output reuse fixture.');
  }

  await replaceSelectedJoinConditions(session, {
    relationId: initial.relationId,
    expectedRevision: session.revision,
    conditions: [
      {
        left: upper(passthrough.fieldId),
        right: { kind: 'field', sourceFieldId: right.fieldId },
      },
    ],
  });

  return {
    session,
    joinId: initial.relationId,
    reusableFieldId: reusable.fieldId,
    reusableAlias: reusable.displayName!,
  };
}

describe('JOIN normalization exact reuse', () => {
  it('projects reuse only for the exact stable base field and capability chain', async () => {
    const { session, joinId, reusableFieldId } = await scenarioWithReusableLeftOutput();
    const selected = await querySelectedJoin(session, joinId, session.revision);

    const result = await projectJoinNormalizationWithReuse(session, selected);

    expect(result.outcome).toBe('available');
    if (result.outcome !== 'available') throw new Error('Expected normalization proposal.');
    expect(result.proposal.transformations).toHaveLength(1);
    expect(result.proposal.transformations[0]?.reuseFieldId).toBe(reusableFieldId);
  });

  it('rewrites the JOIN to the existing output without creating another derived field', async () => {
    const { session, joinId, reusableFieldId, reusableAlias } =
      await scenarioWithReusableLeftOutput();
    const selected = await querySelectedJoin(session, joinId, session.revision);
    const result = await projectJoinNormalizationWithReuse(session, selected);
    if (result.outcome !== 'available') throw new Error('Expected normalization proposal.');
    const beforeCount = selected.inputs[0]!.bindings.filter(
      (field) => field.parentFieldId == null && field.displayName === reusableAlias
    ).length;
    const revision = session.revision;

    await applyJoinNormalization(session, { proposal: result.proposal });

    expect(session.revision).toBe(revision + 1);
    const normalized = await querySelectedJoin(session, joinId, session.revision);
    expect(
      normalized.inputs[0]!.bindings.filter(
        (field) => field.parentFieldId == null && field.displayName === reusableAlias
      )
    ).toHaveLength(beforeCount);
    if (normalized.conditions == null) throw new Error('Expected normalized predicate.');
    const condition = normalized.conditions[0];
    if (condition == null || condition.kind === 'group' || condition.right == null) {
      throw new Error('Expected binary normalized predicate.');
    }
    expect(condition.left).toEqual({ kind: 'field', sourceFieldId: reusableFieldId });
  });

  it('does not reuse an equivalent function over a different stable base field', async () => {
    const { session } = selectedUnaryScenario();
    const initial = await querySelectedJoin(session, session.rootId, session.revision);
    const leftInputId = initial.inputs[0]!.relationId;
    const leftFields = initial.fields.filter((field) => field.inputIndex === 0);
    if (leftFields.length < 2) return;

    await applySelectedRelationDerivedOutput(session, {
      intent: 'insert',
      relationId: leftInputId,
      expectedRevision: session.revision,
      alias: 'other_normalized',
      capabilityIds: [capability('upper')],
      operandFieldIds: [leftFields[1]!.fieldId],
    });

    const afterDerive = await querySelectedJoin(session, initial.relationId, session.revision);
    const passthrough = afterDerive.inputs[0]!.bindings.find(
      (field) => field.sourceFieldId === leftFields[0]!.fieldId
    );
    const right = afterDerive.fields.find((field) => field.inputIndex === 1);
    if (passthrough == null || right == null) throw new Error('Expected stable input fields.');

    await replaceSelectedJoinConditions(session, {
      relationId: initial.relationId,
      expectedRevision: session.revision,
      conditions: [
        {
          left: upper(passthrough.fieldId),
          right: { kind: 'field', sourceFieldId: right.fieldId },
        },
      ],
    });

    const selected = await querySelectedJoin(session, initial.relationId, session.revision);
    const result = await projectJoinNormalizationWithReuse(session, selected);
    if (result.outcome !== 'available') throw new Error('Expected normalization proposal.');
    expect(result.proposal.transformations[0]?.reuseFieldId).toBeUndefined();
  });
});
