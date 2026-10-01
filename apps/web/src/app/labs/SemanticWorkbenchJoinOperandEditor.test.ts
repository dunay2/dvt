import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SemanticWorkbenchJoinOperandEditor } from '../views/canvas/SemanticWorkbenchJoinOperandEditor';
import { buildSemanticWorkbenchJoinOperand } from '../views/canvas/join-condition/operandDraft';

describe('SemanticWorkbenchJoinOperandEditor', () => {
  it('keeps VALUE selectable when the other operand is already a literal', () => {
    const props = {
      side: 'derecho' as const,
      operand: {
        kind: 'field' as const,
        fieldId: 'field-order-id',
        rawValue: '',
      },
      dataType: 'i64' as const,
      fields: [
        { fieldId: 'field-order-id', label: 'raw.orders.order_id', dataType: 'i64' as const },
      ],
      onChange: () => undefined,
    };

    const html = renderToStaticMarkup(createElement(SemanticWorkbenchJoinOperandEditor, props));
    expect(html).toContain('<option value="literal">VALUE</option>');
    expect(html).not.toContain('Funciones');
    expect(html).not.toContain('semantic-operand-function-tree');
  });

  it('builds a typed literal without transforming its value', () => {
    expect(
      buildSemanticWorkbenchJoinOperand({
        dataType: 'string',
        draft: {
          kind: 'literal',
          fieldId: 'unused-while-literal',
          rawValue: ' es ',
        },
      })
    ).toEqual({
      kind: 'literal',
      literal: { dataType: 'string', value: ' es ' },
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
        },
      })
    ).toBeNull();
  });
});
