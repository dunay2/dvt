import { create } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { describe, expect, it } from 'vitest';
import {
  compileDerivedOutputFormula,
  describeDerivedOutputFormula,
  validateDerivedOutputFormula,
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

  it.each([
    ['COALESCE(price, NULL, 0)', 'bigint'],
    ['COALESCE(NULL, 2.5)', 'double precision'],
    ['COALESCE(NULL, false)', 'boolean'],
    ["CONCAT_WS('-', first_name, NULL, last_name)", 'string'],
    ['price * quantity >= 10 AND first_name IS NOT NULL', 'boolean'],
    ["first_name = 'Ada' OR quantity <> 0 AND price <= 50", 'boolean'],
    ['IS_NULL(NULL)', 'boolean'],
    ['AND(GT(price, 2), IS_NOT_NULL(first_name))', 'boolean'],
  ])('compiles admitted typed SQL and round trips it: %s', (formula, dataType) => {
    const plan = create(PlanSchema);
    const result = compileDerivedOutputFormula({
      formula: formula!,
      fields,
      plan,
      provider: 'postgres',
    });
    expect(result.dataType).toBe(dataType);
    const reopened = compileDerivedOutputFormula({
      formula: describeDerivedOutputFormula(
        plan,
        result.expression,
        fields.map((field) => field.name)
      )!,
      fields,
      plan: create(PlanSchema),
      provider: 'postgres',
    });
    expect(reopened.dataType).toBe(dataType);
    expect(reopened.fieldIds).toEqual(result.fieldIds);
  });

  it('round trips the admitted UTC extraction without losing enum or timezone arguments', () => {
    const temporalFields = [
      {
        fieldId: 'time',
        name: 'occurred_at',
        dataType: 'timestamp with time zone',
        expression: dvtSubstraitExpression.field(0),
      },
    ];
    const plan = create(PlanSchema);
    const formula = "EXTRACT(YEAR FROM occurred_at AT TIME ZONE 'UTC')";
    const result = compileDerivedOutputFormula({
      formula,
      fields: temporalFields,
      plan,
      provider: 'postgres',
    });
    expect(result.dataType).toBe('bigint');
    expect(describeDerivedOutputFormula(plan, result.expression, ['occurred_at'])).toBe(formula);
  });

  it.each([
    'COALESCE(price, 2.5)',
    'AND(price, true)',
    'price = first_name',
    'price IS TRUE',
    'price < quantity < 2',
    "EXTRACT(MONTH FROM price AT TIME ZONE 'UTC')",
  ])('rejects incompatible or unadmitted SQL without widening types: %s', (formula) => {
    expect(validateDerivedOutputFormula({ formula, fields, provider: 'postgres' })).toBe(false);
  });

  it.each([
    ['NULL', 'string'],
    ['null', 'string'],
    ['COALESCE(UPPER("first_name"), NULL)', 'string'],
    ['COALESCE(NULL, NULL)', 'string'],
    ['TRIM(NULL)', 'string'],
    ['price * NULL', 'bigint'],
    ['NULL + 2.5', 'double precision'],
    ['CAST(NULL AS BIGINT)', 'bigint'],
    ['CAST(NULL AS DOUBLE PRECISION)', 'double precision'],
    ['CAST(NULL AS BOOLEAN)', 'boolean'],
  ])('binds and round trips typed NULL: %s', (formula, dataType) => {
    const plan = create(PlanSchema);
    const result = compileDerivedOutputFormula({
      formula: formula!,
      fields,
      plan,
      provider: 'postgres',
    });
    expect(result.dataType).toBe(dataType);
    const text = describeDerivedOutputFormula(
      plan,
      result.expression,
      fields.map((field) => field.name)
    );
    expect(text).not.toBeNull();
    const reopened = compileDerivedOutputFormula({
      formula: text!,
      fields,
      plan: create(PlanSchema),
      provider: 'postgres',
    });
    expect(reopened.dataType).toBe(result.dataType);
    expect(reopened.fieldIds).toEqual(result.fieldIds);
    if (result.expression.rexType.case === 'literal')
      expect(result.expression.rexType.value.literalType.case).toBe('null');
  });

  it.each([
    'CAST(NULL AS UUID)',
    'CAST(1 AS TEXT)',
    'UPPER(CAST(NULL AS BIGINT))',
    'UPPER(NULL, NULL)',
    'missing(NULL)',
  ])('does not widen function or cast admission for %s', (formula) => {
    expect(validateDerivedOutputFormula({ formula, fields, provider: 'postgres' })).toBe(false);
  });

  it('distinguishes a quoted null field, null text and empty text from NULL', () => {
    const args = {
      fields: [{ ...fields[0]!, name: 'null' }],
      plan: create(PlanSchema),
      provider: 'postgres',
    };
    expect(compileDerivedOutputFormula({ ...args, formula: '"null"' }).fieldIds).toEqual(['first']);
    expect(describeDerivedOutputFormula(args.plan, fields[0]!.expression, ['null'])).toBe('"null"');
    for (const formula of ["'null'", "''"])
      expect(compileDerivedOutputFormula({ ...args, formula }).expression.rexType).toMatchObject({
        case: 'literal',
        value: { literalType: { case: 'string' } },
      });
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

  it.each([
    ["''", true],
    ["'hola'", true],
    ['(price + price) * quantity', true],
    ['price / quantity', true],
    ['UPPER(first_name)', true],
    ['first_name', false],
    ['"first_name"', false],
    ['price * first_name', false],
    ['UPPER(missing)', false],
    ['', false],
    ['1e999', false],
  ])('validates the one formula syntax and distinguishes passthrough: %s', (formula, expected) => {
    expect(validateDerivedOutputFormula({ formula, fields, provider: 'postgres' })).toBe(expected);
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
