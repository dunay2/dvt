import { describe, expect, it } from 'vitest';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';

import {
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
});
