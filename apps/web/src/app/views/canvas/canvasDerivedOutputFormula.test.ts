import { create } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { describe, expect, it } from 'vitest';
import {
  compileDerivedOutputFormula,
  describeDerivedOutputFormula,
} from './canvasDerivedOutputFormula';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

describe('Transform name and formula syntax adapter', () => {
  const fields = [
    {
      fieldId: 'first',
      name: 'first_name',
      dataType: 'string',
      expression: dvtSubstraitExpression.field(0),
    },
    {
      fieldId: 'last',
      name: 'last_name',
      dataType: 'string',
      expression: dvtSubstraitExpression.field(1),
    },
    {
      fieldId: 'price',
      name: 'price',
      dataType: 'bigint',
      expression: dvtSubstraitExpression.field(2),
    },
    {
      fieldId: 'quantity',
      name: 'quantity',
      dataType: 'bigint',
      expression: dvtSubstraitExpression.field(3),
    },
  ];

  it.each(["''", "'hola'", "'O''Brien'", '42', '2.5', 'true'])(
    'creates a literal without requiring a field: %s',
    (formula) => {
      const result = compileDerivedOutputFormula({
        formula,
        fields: [],
        plan: create(PlanSchema),
        provider: 'postgres',
      });
      expect(result.expression.rexType.case).toBe('literal');
      expect(result.fieldIds).toEqual([]);
    }
  );

  it('combines multiple fields, constants and nested functions in one expression', () => {
    const plan = create(PlanSchema);
    const result = compileDerivedOutputFormula({
      formula: "CONCAT(UPPER(first_name), ' ', last_name)",
      fields,
      plan,
      provider: 'postgres',
    });
    expect(result.dataType).toBe('string');
    expect(result.fieldIds).toEqual(['first', 'last']);
    expect(result.expression.rexType.case).toBe('scalarFunction');
    const formula = describeDerivedOutputFormula(
      plan,
      result.expression,
      fields.map((field) => field.name)
    );
    expect(formula).toContain('UPPER(first_name)');
    expect(formula).toContain("' '");
    const reopened = compileDerivedOutputFormula({
      formula: formula!,
      fields,
      plan: create(PlanSchema),
      provider: 'postgres',
    });
    expect(reopened.dataType).toBe('string');
    expect(reopened.fieldIds).toEqual(result.fieldIds);
  });

  it('compiles multiplication and preserves precedence with constants', () => {
    const result = compileDerivedOutputFormula({
      formula: '(price + 2) * quantity',
      fields,
      plan: create(PlanSchema),
      provider: 'postgres',
    });
    expect(result.dataType).toBe('bigint');
    expect(result.fieldIds).toEqual(['price', 'quantity']);
  });

  it('compiles governed i64 division and preserves multiplicative precedence', () => {
    const plan = create(PlanSchema);
    const result = compileDerivedOutputFormula({
      formula: 'price / quantity + 1',
      fields,
      plan,
      provider: 'postgres',
    });
    expect(result.dataType).toBe('bigint');
    expect(result.fieldIds).toEqual(['price', 'quantity']);
    const rendered = describeDerivedOutputFormula(
      plan,
      result.expression,
      fields.map((field) => field.name)
    );
    expect(rendered).toBe('((price / quantity) + 1)');
    expect(
      compileDerivedOutputFormula({
        formula: rendered!,
        fields,
        plan: create(PlanSchema),
        provider: 'postgres',
      }).fieldIds
    ).toEqual(result.fieldIds);
  });

  it('keeps fp64 divide outside the admitted formula profile', () => {
    expect(() =>
      compileDerivedOutputFormula({
        formula: '2.5 / 1.0',
        fields: [],
        plan: create(PlanSchema),
        provider: 'postgres',
      })
    ).toThrow();
  });

  it.each(['2.0', '1e21', '-0.0', '1e-20'])(
    'preserves floating literals when editing %s',
    (formula) => {
      const plan = create(PlanSchema);
      const first = compileDerivedOutputFormula({
        formula,
        fields: [],
        plan,
        provider: 'postgres',
      });
      const rendered = describeDerivedOutputFormula(plan, first.expression, []);
      const second = compileDerivedOutputFormula({
        formula: rendered!,
        fields: [],
        plan,
        provider: 'postgres',
      });
      expect(second.expression).toEqual(first.expression);
    }
  );

  it.each([
    '',
    'unknown',
    'price * first_name',
    'price * 2.5',
    'UPPER()',
    '1; DROP TABLE x',
    "'unclosed",
    'price +',
    'eval(price)',
    '9223372036854775808',
  ])('rejects incomplete, unsafe or incompatible syntax: %s', (formula) => {
    expect(() =>
      compileDerivedOutputFormula({
        formula,
        fields,
        plan: create(PlanSchema),
        provider: 'postgres',
      })
    ).toThrow();
  });
});
