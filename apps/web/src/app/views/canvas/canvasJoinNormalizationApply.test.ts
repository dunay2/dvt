import { describe, expect, it } from 'vitest';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';

import { applyJoinNormalization } from './canvasJoinNormalizationApply';
import { projectJoinNormalization } from './canvasJoinNormalizationProposal';
import {
  isDvtSubstraitJoinConditionGroup,
  type DvtSubstraitJoinPredicateCondition,
} from './canvasDvtSubstraitJoinCondition';
import type { DvtSubstraitJoinPredicateOperand } from './canvasDvtSubstraitJoinOperand';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';

function capability(name: 'trim' | 'upper'): string {
  const value = resolveDvtSubstraitColumnFunctions({
    dataTypes: ['string'],
    provider: 'postgres',
    resolution: 'complete',
  }).find((entry) => entry.name === name);
  if (value == null) throw new Error(`Missing ${name} capability.`);
  return value.capabilityId;
}

function functionOperand(
  capabilityId: string,
  input: DvtSubstraitJoinPredicateOperand
): DvtSubstraitJoinPredicateOperand {
  return { kind: 'function', capabilityId, input };
}

function leaf(conditions: readonly DvtSubstraitJoinPredicateCondition[], index: number) {
  const condition = conditions[index];
  if (condition == null || isDvtSubstraitJoinConditionGroup(condition)) {
    throw new Error('Expected comparison condition.');
  }
  return condition;
}

describe('JOIN normalization apply', () => {
  it('creates derived outputs on both inputs and rewrites the JOIN in one published revision', async () => {
    const { session } = selectedUnaryScenario();
    const initial = await querySelectedJoin(session, session.rootId, session.revision);
    const left = initial.fields.find((field) => field.inputIndex === 0)!;
    const right = initial.fields.find((field) => field.inputIndex === 1)!;

    await replaceSelectedJoinConditions(session, {
      relationId: initial.relationId,
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

    const selected = await querySelectedJoin(session, initial.relationId, session.revision);
    const projected = projectJoinNormalization(selected);
    if (projected.outcome !== 'available') throw new Error('Expected normalization proposal.');
    const revision = session.revision;
    const aliases = Object.fromEntries(
      projected.proposal.transformations.map((transformation, index) => [
        transformation.transformationKey,
        index === 0 ? 'left_normalized' : 'right_normalized',
      ])
    );

    await applyJoinNormalization(session, { proposal: projected.proposal, aliases });

    expect(session.revision).toBe(revision + 1);
    const normalized = await querySelectedJoin(session, initial.relationId, session.revision);
    expect(
      normalized.inputs.map((input) =>
        input.bindings.some((field) => field.displayName === 'left_normalized')
          ? 'left'
          : input.bindings.some((field) => field.displayName === 'right_normalized')
            ? 'right'
            : 'none'
      )
    ).toEqual(['left', 'right']);
    if (normalized.conditions == null) throw new Error('Expected normalized conditions.');
    const condition = leaf(normalized.conditions, 0);
    expect(condition.left.kind).toBe('field');
    expect(condition.right.kind).toBe('field');
  });

  it('creates one derived output and reuses it across repeated predicate occurrences', async () => {
    const { session } = selectedUnaryScenario();
    const initial = await querySelectedJoin(session, session.rootId, session.revision);
    const left = initial.fields.find((field) => field.inputIndex === 0)!;
    const right = initial.fields.find((field) => field.inputIndex === 1)!;
    const normalizedLeft = functionOperand(capability('upper'), {
      kind: 'field',
      sourceFieldId: left.fieldId,
    });

    await replaceSelectedJoinConditions(session, {
      relationId: initial.relationId,
      expectedRevision: session.revision,
      conditions: [
        {
          left: normalizedLeft,
          right: { kind: 'field', sourceFieldId: right.fieldId },
        },
        {
          left: normalizedLeft,
          right: { kind: 'field', sourceFieldId: right.fieldId },
        },
      ],
    });

    const selected = await querySelectedJoin(session, initial.relationId, session.revision);
    const projected = projectJoinNormalization(selected);
    if (projected.outcome !== 'available') throw new Error('Expected normalization proposal.');
    expect(projected.proposal.transformations).toHaveLength(1);
    expect(projected.proposal.transformations[0]?.occurrences).toHaveLength(2);

    await applyJoinNormalization(session, {
      proposal: projected.proposal,
      aliases: {
        [projected.proposal.transformations[0]!.transformationKey]: 'left_normalized',
      },
    });

    const normalized = await querySelectedJoin(session, initial.relationId, session.revision);
    const leftOutput = normalized.inputs[0]!.bindings.filter(
      (field) => field.displayName === 'left_normalized'
    );
    expect(leftOutput).toHaveLength(1);
    if (normalized.conditions == null) throw new Error('Expected normalized conditions.');
    expect(normalized.conditions.map((condition) => leaf([condition], 0).left.kind)).toEqual([
      'field',
      'field',
    ]);
  });

  it('publishes nothing when an alias collides during the staged refactor', async () => {
    const { session } = selectedUnaryScenario();
    const initial = await querySelectedJoin(session, session.rootId, session.revision);
    const left = initial.fields.find((field) => field.inputIndex === 0)!;
    const right = initial.fields.find((field) => field.inputIndex === 1)!;

    await replaceSelectedJoinConditions(session, {
      relationId: initial.relationId,
      expectedRevision: session.revision,
      conditions: [
        {
          left: functionOperand(capability('upper'), {
            kind: 'field',
            sourceFieldId: left.fieldId,
          }),
          right: { kind: 'field', sourceFieldId: right.fieldId },
        },
      ],
    });

    const selected = await querySelectedJoin(session, initial.relationId, session.revision);
    const projected = projectJoinNormalization(selected);
    if (projected.outcome !== 'available') throw new Error('Expected normalization proposal.');
    const revision = session.revision;
    const existingAlias = selected.inputs[0]!.bindings.find(
      (field) => field.parentFieldId == null
    )!.displayName!;

    await expect(
      applyJoinNormalization(session, {
        proposal: projected.proposal,
        aliases: {
          [projected.proposal.transformations[0]!.transformationKey]: existingAlias,
        },
      })
    ).rejects.toThrow();

    expect(session.revision).toBe(revision);
    const unchanged = await querySelectedJoin(session, initial.relationId, revision);
    expect(
      unchanged.inputs.flatMap((input) =>
        input.bindings.filter((field) => field.displayName === 'left_normalized')
      )
    ).toHaveLength(0);
  });

  it('rejects a stale proposal without publishing a partial refactor', async () => {
    const { session } = selectedUnaryScenario();
    const initial = await querySelectedJoin(session, session.rootId, session.revision);
    const left = initial.fields.find((field) => field.inputIndex === 0)!;
    const right = initial.fields.find((field) => field.inputIndex === 1)!;
    const conditions: readonly DvtSubstraitJoinPredicateCondition[] = [
      {
        left: functionOperand(capability('upper'), {
          kind: 'field',
          sourceFieldId: left.fieldId,
        }),
        right: { kind: 'field', sourceFieldId: right.fieldId },
      },
    ];

    await replaceSelectedJoinConditions(session, {
      relationId: initial.relationId,
      expectedRevision: session.revision,
      conditions,
    });
    const selected = await querySelectedJoin(session, initial.relationId, session.revision);
    const projected = projectJoinNormalization(selected);
    if (projected.outcome !== 'available') throw new Error('Expected normalization proposal.');

    await replaceSelectedJoinConditions(session, {
      relationId: initial.relationId,
      expectedRevision: session.revision,
      conditions,
    });
    const revision = session.revision;

    await expect(
      applyJoinNormalization(session, {
        proposal: projected.proposal,
        aliases: {
          [projected.proposal.transformations[0]!.transformationKey]: 'left_normalized',
        },
      })
    ).rejects.toThrow();

    expect(session.revision).toBe(revision);
  });
});
