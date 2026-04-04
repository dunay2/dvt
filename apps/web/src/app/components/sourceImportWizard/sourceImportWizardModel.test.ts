import { describe, expect, it } from 'vitest';

import type { TableInfo } from './types';
import {
  buildPreviewGroups,
  canProceedForStep,
  getNextStep,
  getPreviousStep,
  getSelectedCount,
  groupTablesBySchema,
} from './sourceImportWizardModel';

function buildTable(overrides?: Partial<TableInfo>): TableInfo {
  return {
    database: 'RAW',
    schema: 'ERP',
    table: 'ORDERS',
    selected: false,
    ...overrides,
  };
}

describe('sourceImportWizardModel', () => {
  it('counts selected tables', () => {
    const tables = [buildTable({ selected: true }), buildTable({ table: 'CUSTOMERS' })];
    expect(getSelectedCount(tables)).toBe(1);
  });

  it('groups tables by schema', () => {
    const grouped = groupTablesBySchema([
      buildTable({ schema: 'ERP' }),
      buildTable({ schema: 'MART', table: 'fct_sales' }),
    ]);
    expect(Object.keys(grouped)).toEqual(['ERP', 'MART']);
  });

  it('builds preview groups from selected tables', () => {
    const groups = buildPreviewGroups(
      [
        buildTable({ selected: true, schema: 'ERP', table: 'ORDERS' }),
        buildTable({ selected: true, schema: 'ERP', table: 'CUSTOMERS' }),
        buildTable({ selected: false, schema: 'MART', table: 'fct_sales' }),
      ],
      'schema'
    );
    expect(groups.size).toBe(1);
    expect(groups.get('ERP')?.length).toBe(2);
  });

  it('applies canProceed gating rules by step', () => {
    expect(canProceedForStep('connection', null, 0)).toBe(false);
    expect(canProceedForStep('connection', 'conn-1', 0)).toBe(true);
    expect(canProceedForStep('selection', 'conn-1', 0)).toBe(false);
    expect(canProceedForStep('selection', 'conn-1', 1)).toBe(true);
  });

  it('navigates wizard steps in both directions', () => {
    expect(getNextStep('sourceType')).toBe('connection');
    expect(getPreviousStep('connection')).toBe('sourceType');
  });
});
