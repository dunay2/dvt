import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { resolveDvtSubstraitJoinUnaryFunctions } from '../views/canvas/canvasDvtSubstraitJoinOperand';
import {
  SemanticWorkbenchJoinOperandEditor,
  buildSemanticWorkbenchJoinOperand,
} from '../views/canvas/SemanticWorkbenchJoinOperandEditor';

describe('SemanticWorkbenchJoinOperandEditor', () => {
  it('keeps VALUE selectable when the other operand is already a literal', () => {
    const props = {
      side: 'derecho' as const,
      operand: {
        kind: 'field' as const,
        fieldId: 'field-order-id',
        rawValue: '',
        functionIds: [],
      },
      dataType: 'i64' as const,
      fields: [
        { fieldId: 'field-order-id', label: 'raw.orders.order_id', dataType: 'i64' as const },
      ],
      functions: [],
      literalDisabled: true,
      onChange: () => undefined,
    };

    expect(
      renderToStaticMarkup(createElement(SemanticWorkbenchJoinOperandEditor, props))
    ).toContain('<option value="literal">VALUE</option>');
  });

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
