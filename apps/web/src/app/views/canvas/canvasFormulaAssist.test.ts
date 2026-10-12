import { describe, expect, it } from 'vitest';
import { formulaSuggestions, projectFormulaFeedback } from './canvasFormulaAssist';

const fields = [
  { fieldId: 'price-id', name: 'price', dataType: 'bigint' },
  { fieldId: 'qty-id', name: 'quantity', dataType: 'bigint' },
  { fieldId: 'name-id', name: 'customer name', dataType: 'string' },
];

describe('assisted formula projection', () => {
  it('keeps input and calculated operand origins separate without losing their identities', () => {
    const suggestions = formulaSuggestions(
      [
        { fieldId: 'input-name', name: 'name', dataType: 'string', origin: 'input' },
        { fieldId: 'derived-name', name: 'normalized', dataType: 'string', origin: 'calculated' },
      ],
      'postgres'
    );
    expect(suggestions.filter((item) => item.kind === 'field')).toMatchObject([
      { fieldId: 'input-name', origin: 'input', label: 'name' },
      { fieldId: 'derived-name', origin: 'calculated', label: 'normalized' },
    ]);
  });
  it('projects type, stable dependencies and the existing canonical expression tree', () => {
    const feedback = projectFormulaFeedback('(price + 2) * quantity', fields, 'postgres');
    expect(feedback.ok).toBe(true);
    if (!feedback.ok) throw new Error(feedback.message);
    expect(feedback.dataType).toBe('bigint');
    expect(feedback.graph.expressionCount).toBe(feedback.graph.nodes.length);
    expect(feedback.dependencies.map((field) => field.fieldId)).toEqual(['price-id', 'qty-id']);
    expect(feedback.graph.nodes.map((node) => node.data.label).join(' ')).toContain('MULTIPLY');
    expect(feedback.graph.nodes.some((node) => node.data.fieldReference != null)).toBe(false);
  });

  it('supports a constant without inventing dependencies and never mistakes a field for a formula', () => {
    const constant = projectFormulaFeedback("''", [], 'postgres');
    expect(constant.ok && constant.dependencies).toEqual([]);
    expect(projectFormulaFeedback('price', fields, 'postgres').ok).toBe(false);
  });

  it('shows NULL as a literal, not an object or a field dependency', () => {
    const feedback = projectFormulaFeedback(
      'COALESCE(UPPER("customer name"), NULL)',
      fields,
      'postgres'
    );
    expect(feedback.ok).toBe(true);
    if (!feedback.ok) throw new Error(feedback.message);
    expect(feedback.dependencies.map((field) => field.name)).toEqual(['customer name']);
    expect(feedback.graph.nodes.some((node) => node.data.label.includes('NULL'))).toBe(true);
    expect(JSON.stringify(feedback.graph)).not.toContain('[object Object]');
    expect(formulaSuggestions(fields, 'postgres').some((item) => item.text === 'NULL')).toBe(true);
  });

  it.each(['price * unknown', 'price +', 'price * "customer name"', '1; select secret'])(
    'reports the compiler failure: %s',
    (formula) => {
      const result = projectFormulaFeedback(formula, fields, 'postgres');
      expect(result.ok).toBe(false);
      expect(!result.ok && result.message.length).toBeGreaterThan(0);
    }
  );

  it('offers quoted field references, admitted functions and constants, never SQL or foreign provider functions', () => {
    const suggestions = formulaSuggestions(fields, 'postgres');
    expect(suggestions.find((item) => item.label === 'customer name')?.text).toBe(
      '"customer name"'
    );
    expect(suggestions.find((item) => item.label === 'CONCAT')?.argumentCount).toBe(2);
    expect(suggestions.some((item) => item.label === 'UPPER')).toBe(true);
    expect(suggestions.some((item) => item.label === 'MULTIPLY')).toBe(true);
    for (const label of [
      'EQUAL',
      'NOT_EQUAL',
      'GT',
      'GTE',
      'LT',
      'LTE',
      'AND',
      'OR',
      'IS_NULL',
      'IS_NOT_NULL',
    ])
      expect(
        suggestions.some((item) => item.label === label),
        label
      ).toBe(true);
    expect(suggestions.some((item) => item.text === "''")).toBe(true);
    expect(suggestions.some((item) => item.label === 'SELECT')).toBe(false);
    expect(formulaSuggestions(fields, 'unknown').some((item) => item.kind === 'function')).toBe(
      false
    );
  });

  it('offers the exact admitted UTC extraction template for a timestamp field', () => {
    const temporal = [
      { fieldId: 'time', name: 'occurred_at', dataType: 'timestamp with time zone' },
    ];
    expect(
      formulaSuggestions(temporal, 'postgres').find((item) => item.label === 'EXTRACT YEAR (UTC)')
    ).toMatchObject({
      argumentCount: 1,
      template: "EXTRACT(YEAR FROM {column} AT TIME ZONE 'UTC')",
    });
  });
});
