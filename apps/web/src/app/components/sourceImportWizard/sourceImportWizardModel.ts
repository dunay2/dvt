import { WIZARD_STEPS } from './constants';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import type { TableInfo, WizardStep } from './types';

export function getSelectedCount(tables: TableInfo[]): number {
  return tables.filter((table) => table.selected).length;
}

export function groupTablesBySchema(tables: TableInfo[]): Record<string, TableInfo[]> {
  return tables.reduce<Record<string, TableInfo[]>>((acc, table) => {
    if (!acc[table.schema]) {
      acc[table.schema] = [];
    }
    acc[table.schema]?.push(table);
    return acc;
  }, {});
}

export function buildPreviewGroups(
  tables: TableInfo[],
  groupingStrategy: 'schema' | 'database' | 'custom'
): Map<string, TableInfo[]> {
  const selectedTables = tables.filter((table) => table.selected);
  const groups = new Map<string, TableInfo[]>();
  selectedTables.forEach((table) => {
    const key = groupingStrategy === 'schema' ? table.schema : table.database;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)?.push(table);
  });
  return groups;
}

export function buildSourceImportOptionValues(
  input: Readonly<Record<SourceImportOptionId, boolean>>
): Readonly<Record<SourceImportOptionId, boolean>> {
  return {
    includeColumns: input.includeColumns,
    addTests: input.addTests,
    addFreshness: input.addFreshness,
  };
}

export function applySourceImportOptionDefaults<T extends Record<SourceImportOptionId, boolean>>(
  state: T,
  options: readonly SourceImportOptionContribution[]
): T {
  return options.reduce<T>(
    (nextState, option) => ({
      ...nextState,
      [option.id]: option.defaultEnabled,
    }),
    state
  );
}

export function canProceedForStep(
  step: WizardStep,
  selectedConnection: string | null,
  selectedCount: number
): boolean {
  if (step === 'connection') {
    return !!selectedConnection;
  }
  if (step === 'selection') {
    return selectedCount > 0;
  }
  return true;
}

export function getNextStep(step: WizardStep): WizardStep {
  const index = WIZARD_STEPS.indexOf(step);
  return WIZARD_STEPS[Math.min(index + 1, WIZARD_STEPS.length - 1)] ?? step;
}

export function getPreviousStep(step: WizardStep): WizardStep {
  const index = WIZARD_STEPS.indexOf(step);
  return WIZARD_STEPS[Math.max(index - 1, 0)] ?? step;
}
