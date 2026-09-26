import { describe, expect, it } from 'vitest';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import type { DvtSubstraitJoinPredicateOperand } from './canvasDvtSubstraitJoinOperand';
import { projectJoinNormalization } from './canvasJoinNormalizationProposal';

function capability(name: 'trim' | 'upper'): string {
  const value = resolveDvtSubstraitColumnFunctions({
    dataTypes: ['string'],
    provider: 'postgres',
    resolution: 'complete',
  }).find((entry) => entry.name === name);
  if (value == null) throw new Error(`Missing ${name} capability.`);
  return value.capabilityId;
}

const functionOperand = (
  capabilityId: string,
  input: DvtSubstraitJoinPredicateOperand
): DvtSubstraitJoinPredicateOperand => ({ kind: 'function', capabilityId, input });

describe('JOIN normalization proposal', () => {
  it('projects nested transformations on both operands onto their exact input occurrences', async () => {
    const { session } = selectedUnaryScenario();
    const selected = await querySelectedJoin(session, session.rootId, session.revision);
    const left = selected.fields.find((field) => field.inputIndex === 0)!;
    const right = selected.fields.find((field) => field.inputIndex === 1)!;
    await replaceSelectedJoinConditions(session, {
      relationId: selected.relationId,
      expectedRevision: session.revision,
      conditions: [
        {
          left: functionOperand(
            capability('upper'),
            functionOperand(capability('trim'), {
              kind: 'field',
              sourceFieldId: left.fieldId,
            })
          ),
          right: functionOperand(capability('upper'), {
            kind: 'field',
            sourceFieldId: right.fieldId,
          }),
        },
      ],
    });

    const current = await querySelectedJoin(session, selected.relationId, session.revision);
    const result = projectJoinNormalization(current);

    expect(result.outcome).toBe('available');
    if (result.outcome !== 'available') throw new Error('Expected proposal.');
    expect(result.proposal.transformations).toHaveLength(2);
    expect(result.proposal.transformations.map((item) => item.inputRelationId)).toEqual(
      current.inputs.map((input) => input.relationId)
    );
    expect(result.proposal.transformations[0]?.capabilityIds).toEqual([
      capability('trim'),
      capability('upper'),
    ]);
    expect(result.proposal.transformations.flatMap((item) => item.occurrences)).toMatchObject([
      { side: 'left' },
      { side: 'right' },
    ]);
  });

  it('does not offer normalization when the predicate already compares plain fields', async () => {
    const { session } = selectedUnaryScenario();
    const selected = await querySelectedJoin(session, session.rootId, session.revision);

    expect(projectJoinNormalization(selected)).toEqual({
      outcome: 'unavailable',
      reason: 'no_functions',
    });
  });

  it('rejects a function whose terminal operand is not a field', async () => {
    const { session } = selectedUnaryScenario();
    const selected = await querySelectedJoin(session, session.rootId, session.revision);
    const right = selected.fields.find((field) => field.inputIndex === 1)!;
    await replaceSelectedJoinConditions(session, {
      relationId: selected.relationId,
      expectedRevision: session.revision,
      conditions: [
        {
          left: functionOperand(capability('upper'), {
            kind: 'literal',
            literal: { dataType: 'string', value: 'value' },
          }),
          right: { kind: 'field', sourceFieldId: right.fieldId },
        },
      ],
    });
    const current = await querySelectedJoin(session, selected.relationId, session.revision);

    expect(projectJoinNormalization(current)).toEqual({
      outcome: 'unavailable',
      reason: 'non_field_operand',
    });
  });
});
