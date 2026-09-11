import { describe, expect, it } from 'vitest';

import { resolveDvtSubstraitJoinUnaryFunctions } from '../views/canvas/canvasDvtSubstraitJoinOperand';
import { buildSemanticWorkbenchJoinOperand } from '../views/canvas/SemanticWorkbenchJoinOperandEditor';

describe('SemanticWorkbenchJoinOperandEditor', () => {
  it('builds the same recursive operand for a literal and N admitted functions', () => {
    const functions = resolveDvtSubstraitJoinUnaryFunctions({
      dataType: 'string',
      provider: 'postgres',
    });
    const trim = functions.find((candidate) => candidate.name === 'trim');
    const upper = functions.find((candidate) => candidate.name === 'upper');
    if (trim == null || upper == null) throw new Error('Expected admitted string functions.');

    expect(
      buildSemanticWorkbenchJoinOperand({
        dataType: 'string',
        draft: {
          kind: 'literal',
          fieldId: 'unused-while-literal',
          rawValue: ' es ',
          functionIds: [trim.capabilityId, upper.capabilityId],
        },
      })
    ).toEqual({
      kind: 'function',
      capabilityId: upper.capabilityId,
      input: {
        kind: 'function',
        capabilityId: trim.capabilityId,
        input: {
          kind: 'literal',
          literal: { dataType: 'string', value: ' es ' },
        },
      },
    });
  });

  it('fails closed for an invalid typed literal', () => {
    expect(
      buildSemanticWorkbenchJoinOperand({
        dataType: 'bool',
        draft: {
          kind: 'literal',
          fieldId: 'unused-while-literal',
          rawValue: 'yes',
          functionIds: [],
        },
      })
    ).toBeNull();
  });
});
