import { describe, expect, it } from 'vitest';

import type { DvtSubstraitJoinPredicateCondition } from '../views/canvas/canvasDvtSubstraitJoinCondition';
import { projectSemanticWorkbenchJoinConditionRows } from '../views/canvas/SemanticWorkbenchJoinConditionEditor';

describe('SemanticWorkbenchJoinConditionEditor', () => {
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
      { kind: 'group-open', depth: 0, label: 'AND (' },
      { kind: 'comparison', depth: 1, label: "raw.client.country = 'ES'" },
      { kind: 'comparison', depth: 1, label: 'OR raw.client.active = false' },
      { kind: 'group-close', depth: 0, label: ')' },
    ]);
    expect(
      rows.flatMap((row) => (row.kind === 'comparison' ? [row.combinationEditable] : []))
    ).toEqual([false, true]);
  });
});
