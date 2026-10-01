import { describe, expect, it } from 'vitest';
import { resolveDvtSubstraitJoinUnaryFunctions } from '@dvt/postgres-projection';

import type { DvtSubstraitJoinPredicateCondition } from '../views/canvas/canvasDvtSubstraitJoinCondition';
import { projectSemanticWorkbenchJoinConditionRows } from '../views/canvas/join-condition/conditionRows';
import { editConditionDraft } from '../views/canvas/join-condition/conditionDraft';

describe('SemanticWorkbenchJoinConditionEditor', () => {
  it('does not unwrap an unsupported scalar operand into an editable field draft', () => {
    const capabilityId = resolveDvtSubstraitJoinUnaryFunctions({
      dataType: 'string',
      provider: 'postgres',
    })[0]!.capabilityId;
    const rows = projectSemanticWorkbenchJoinConditionRows({
      conditions: [
        {
          left: {
            kind: 'function',
            capabilityId,
            input: { kind: 'field', sourceFieldId: 'country' },
          },
          right: { kind: 'literal', literal: { dataType: 'string', value: 'ES' } },
        },
      ],
      fieldLabelById: new Map([['country', 'client.country']]),
    });
    const row = rows[0]!;
    if (row.kind !== 'comparison') throw new Error('Expected comparison.');
    expect(
      editConditionDraft(
        [{ fieldId: 'country', label: 'client.country', dataType: 'string', inputIndex: 0 }],
        row
      )
    ).toBeNull();
  });
  it('labels null predicates without a right operand', () => {
    const rows = projectSemanticWorkbenchJoinConditionRows({
      conditions: [
        { left: { kind: 'field', sourceFieldId: 'country' }, operator: 'is_null' },
        {
          left: { kind: 'field', sourceFieldId: 'country' },
          operator: 'is_not_null',
          combination: 'or',
        },
      ],
      fieldLabelById: new Map([['country', 'raw.client.country']]),
    });
    expect(rows.map((row) => row.label)).toEqual([
      'raw.client.country IS NULL',
      'OR raw.client.country IS NOT NULL',
    ]);
  });

  it('projects grouped conditions in deterministic semantic order with explicit parentheses', () => {
    const conditions: readonly DvtSubstraitJoinPredicateCondition[] = [
      {
        kind: 'group',
        combination: 'and',
        conditions: [
          {
            left: { kind: 'field', sourceFieldId: 'client-country' },
            right: { kind: 'literal', literal: { dataType: 'string', value: 'ES' } },
          },
          {
            left: { kind: 'field', sourceFieldId: 'client-active' },
            right: { kind: 'literal', literal: { dataType: 'bool', value: false } },
            combination: 'or',
          },
        ],
      },
    ];

    const rows = projectSemanticWorkbenchJoinConditionRows({
      conditions,
      fieldLabelById: new Map([
        ['client-country', 'raw.client.country'],
        ['client-active', 'raw.client.active'],
      ]),
    });

    expect(rows.map(({ kind, depth, label }) => ({ kind, depth, label }))).toEqual([
      { kind: 'group-open', depth: 0, label: '(' },
      { kind: 'comparison', depth: 1, label: "raw.client.country = 'ES'" },
      { kind: 'comparison', depth: 1, label: 'OR raw.client.active = false' },
      { kind: 'group-close', depth: 0, label: ')' },
    ]);
    expect(
      rows.flatMap((row) => (row.kind === 'comparison' ? [row.combinationEditable] : []))
    ).toEqual([false, true]);
  });
});
