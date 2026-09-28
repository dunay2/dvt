import { describe, expect, it } from 'vitest';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';

import {
  compatibleDerivedOutputVisualFields,
  derivedOutputVisualFormulaCandidates,
  formatDerivedOutputVisualFormula,
  parseDerivedOutputVisualFormula,
  validateDerivedOutputVisualFormula,
  type DerivedOutputVisualFormula,
} from './canvasDerivedOutputVisualFormula';
import type { DerivedOutputField } from './DerivedOutputOperands';

const fields: readonly DerivedOutputField[] = [
  { fieldId: 'field:first', name: 'first_name', dataType: 'string' },
  { fieldId: 'field:last', name: 'last_name', dataType: 'string' },
  { fieldId: 'field:price', name: 'price', dataType: 'bigint' },
  { fieldId: 'field:quantity', name: 'quantity', dataType: 'bigint' },
];

function capability(name: string, dataTypes: readonly string[]): string {
  const entry = resolveDvtSubstraitColumnFunctions({
    dataTypes,
    provider: 'postgres',
    resolution: 'complete',
  }).find((candidate) => candidate.name === name);
  if (entry == null) throw new Error(`Missing admitted capability ${name}.`);
  return entry.capabilityId;
}

describe('visual derived-output formula draft', () => {
  it('reopens an applied nested formula as a structural draft', () => {
    const expression = parseDerivedOutputVisualFormula({
      formula: "CONCAT(UPPER(first_name), ' ', last_name)",
      fields,
      provider: 'postgres',
    });

    expect(expression.kind).toBe('function');
    const formula = formatDerivedOutputVisualFormula(expression, fields);
    expect(formula).toContain('UPPER(first_name)');
    expect(formula).toContain("' '");
    expect(
      validateDerivedOutputVisualFormula({ expression, fields, provider: 'postgres' })
    ).toMatchObject({ ok: true, dataType: 'string' });
  });

  it('serializes nested admitted arithmetic without a second semantic IR', () => {
    const add = capability('add', ['bigint', 'bigint']);
    const expression: DerivedOutputVisualFormula = {
      kind: 'function',
      capabilityId: add,
      arguments: [
        {
          kind: 'function',
          capabilityId: add,
          arguments: [
            { kind: 'number-literal', value: '1' },
            { kind: 'number-literal', value: '1' },
          ],
        },
        { kind: 'number-literal', value: '3' },
      ],
    };

    expect(formatDerivedOutputVisualFormula(expression, fields)).toBe('((1 + 1) + 3)');
    expect(
      validateDerivedOutputVisualFormula({ expression, fields, provider: 'postgres' })
    ).toEqual({ ok: true, formula: '((1 + 1) + 3)', dataType: 'bigint' });
  });

  it('renders and validates admitted bigint division as a catalog function', () => {
    const divide = capability('divide', ['bigint', 'bigint']);
    const expression: DerivedOutputVisualFormula = {
      kind: 'function',
      capabilityId: divide,
      arguments: [
        { kind: 'field', fieldId: 'field:price' },
        { kind: 'field', fieldId: 'field:quantity' },
      ],
    };

    expect(formatDerivedOutputVisualFormula(expression, fields)).toBe('DIVIDE(price, quantity)');
    expect(
      validateDerivedOutputVisualFormula({ expression, fields, provider: 'postgres' })
    ).toEqual({ ok: true, formula: 'DIVIDE(price, quantity)', dataType: 'bigint' });
    expect(
      resolveDvtSubstraitColumnFunctions({
        dataTypes: ['double precision', 'double precision'],
        provider: 'postgres',
        resolution: 'complete',
      }).some((candidate) => candidate.name === 'divide')
    ).toBe(false);
  });

  it('fails closed when a visual tree combines incompatible types', () => {
    const multiply = capability('multiply', ['bigint', 'bigint']);
    const expression: DerivedOutputVisualFormula = {
      kind: 'function',
      capabilityId: multiply,
      arguments: [
        { kind: 'field', fieldId: 'field:price' },
        { kind: 'field', fieldId: 'field:first' },
      ],
    };

    expect(
      validateDerivedOutputVisualFormula({ expression, fields, provider: 'postgres' })
    ).toEqual({ ok: false });
  });

  it('filters field choices by the selected function and sibling operand types', () => {
    const multiply = capability('multiply', ['bigint', 'bigint']);
    const expression: Extract<DerivedOutputVisualFormula, { kind: 'function' }> = {
      kind: 'function',
      capabilityId: multiply,
      arguments: [
        { kind: 'field', fieldId: 'field:price' },
        { kind: 'field', fieldId: 'field:quantity' },
      ],
    };

    expect(
      compatibleDerivedOutputVisualFields({
        expression,
        argumentIndex: 1,
        fields,
        provider: 'postgres',
      }).map((field) => field.fieldId)
    ).toEqual(['field:price', 'field:quantity']);
  });

  it('returns no field choices when the selected function has no compatible field', () => {
    const multiply = capability('multiply', ['bigint', 'bigint']);
    const textOnlyFields: readonly DerivedOutputField[] = [
      { fieldId: 'field:first', name: 'first_name', dataType: 'string' },
      { fieldId: 'field:last', name: 'last_name', dataType: 'string' },
    ];
    const expression: Extract<DerivedOutputVisualFormula, { kind: 'function' }> = {
      kind: 'function',
      capabilityId: multiply,
      arguments: [
        { kind: 'number-literal', value: '2' },
        { kind: 'number-literal', value: '3' },
      ],
    };

    expect(
      compatibleDerivedOutputVisualFields({
        expression,
        argumentIndex: 1,
        fields: textOnlyFields,
        provider: 'postgres',
      })
    ).toEqual([]);
  });

  it('does not advertise temporal functions that cannot round-trip through formula syntax', () => {
    const timestampFields: readonly DerivedOutputField[] = [
      { fieldId: 'field:created', name: 'created_at', dataType: 'timestamp with time zone' },
    ];

    expect(
      derivedOutputVisualFormulaCandidates(
        { kind: 'field', fieldId: 'field:created' },
        timestampFields,
        'postgres'
      ).map((candidate) => candidate.category)
    ).not.toContain('date-time');
  });
});
