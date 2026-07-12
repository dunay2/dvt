import { WIZARD_STEPS } from './constants';
import { isRelationalSourceObject } from '@dvt/contracts';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { buildSourceObjectIdentityKey } from './sourceImportCatalogModel';
import type {
  SourceImportDatabaseIdentity,
  SourceImportSchemaIdentity,
  SourceImportSection,
  SelectableRelationalSourceObject,
  SelectableSourceObject,
  WizardStep,
} from './types';

export const SOURCE_IMPORT_SECTIONS: readonly {
  id: SourceImportSection;
  label: 'Connections' | 'Browse' | 'Metadata' | 'Selected';
  step: WizardStep;
}[] = [
  { id: 'connections', label: 'Connections', step: 'connection' },
  { id: 'browse', label: 'Browse', step: 'selection' },
  { id: 'metadata', label: 'Metadata', step: 'options' },
  { id: 'selected', label: 'Selected', step: 'review' },
];

export function getSelectedCount(sourceObjects: SelectableSourceObject[]): number {
  return getSelectedSourceObjects(sourceObjects).length;
}

export function toggleSourceImportSchemaSelection(
  sourceObjects: readonly SelectableSourceObject[],
  schemaIdentity: SourceImportSchemaIdentity
): Readonly<{ sourceObjects: SelectableSourceObject[]; activeSourceObjectKey: string | null }> {
  const schemaSourceObjects = sourceObjects.filter(
    (sourceObject): sourceObject is SelectableRelationalSourceObject =>
      isRelationalSourceObject(sourceObject) &&
      sourceObject.locator.catalog === schemaIdentity.database &&
      sourceObject.locator.schema === schemaIdentity.schema
  );
  const allSelected =
    schemaSourceObjects.length > 0 &&
    schemaSourceObjects.every((sourceObject) => sourceObject.selected);
  const firstSchemaObject = schemaSourceObjects[0];

  return {
    sourceObjects: sourceObjects.map((sourceObject) =>
      isRelationalSourceObject(sourceObject) &&
      sourceObject.locator.catalog === schemaIdentity.database &&
      sourceObject.locator.schema === schemaIdentity.schema
        ? { ...sourceObject, selected: !allSelected }
        : sourceObject
    ),
    activeSourceObjectKey: firstSchemaObject
      ? buildSourceObjectIdentityKey(firstSchemaObject)
      : null,
  };
}

export function toggleSourceImportDatabaseSelection(
  sourceObjects: readonly SelectableSourceObject[],
  databaseIdentity: SourceImportDatabaseIdentity
): Readonly<{ sourceObjects: SelectableSourceObject[]; activeSourceObjectKey: string | null }> {
  const databaseSourceObjects = sourceObjects.filter(
    (sourceObject): sourceObject is SelectableRelationalSourceObject =>
      isRelationalSourceObject(sourceObject) &&
      sourceObject.locator.catalog === databaseIdentity.database
  );
  const allSelected =
    databaseSourceObjects.length > 0 &&
    databaseSourceObjects.every((sourceObject) => sourceObject.selected);
  const firstDatabaseObject = databaseSourceObjects[0];

  return {
    sourceObjects: sourceObjects.map((sourceObject) =>
      isRelationalSourceObject(sourceObject) &&
      sourceObject.locator.catalog === databaseIdentity.database
        ? { ...sourceObject, selected: !allSelected }
        : sourceObject
    ),
    activeSourceObjectKey: firstDatabaseObject
      ? buildSourceObjectIdentityKey(firstDatabaseObject)
      : null,
  };
}

export function buildSourceImportRegistryPath(
  sourceObject: Pick<SelectableRelationalSourceObject, 'locator'>,
  groupingStrategy: string
): string {
  const groupKey = toStableSourceImportIdentifierPart(
    sourceImportGroupingValue(sourceObject, groupingStrategy)
  );
  return `models/sources/src_${groupKey}.yml`;
}

function sourceImportGroupingValue(
  sourceObject: Pick<SelectableRelationalSourceObject, 'locator'>,
  groupingStrategy: string
): string {
  if (groupingStrategy === 'database') {
    return sourceObject.locator.catalog;
  }
  if (groupingStrategy === 'schema') {
    return sourceObject.locator.schema;
  }
  throw new Error(`Unsupported source import grouping strategy: ${groupingStrategy}`);
}

export function toStableSourceImportIdentifierPart(part: string): string {
  const normalized = part
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : 'unnamed';
}

export function getSelectedSourceObjects(
  sourceObjects: readonly SelectableSourceObject[]
): readonly SelectableRelationalSourceObject[] {
  return sourceObjects.filter(
    (sourceObject): sourceObject is SelectableRelationalSourceObject =>
      sourceObject.selected && isRelationalSourceObject(sourceObject)
  );
}

export function resolveActiveSourceObject(
  sourceObjects: readonly SelectableSourceObject[],
  activeSourceObjectKey: string | null
): SelectableSourceObject | null {
  if (activeSourceObjectKey != null) {
    const activeSourceObject = sourceObjects.find(
      (sourceObject) => buildSourceObjectIdentityKey(sourceObject) === activeSourceObjectKey
    );
    if (activeSourceObject) {
      return activeSourceObject;
    }
  }

  return sourceObjects.find((sourceObject) => sourceObject.selected) ?? sourceObjects[0] ?? null;
}

export function resolveSectionForStep(step: WizardStep): SourceImportSection {
  if (step === 'selection') {
    return 'browse';
  }
  if (step === 'grouping' || step === 'options') {
    return 'metadata';
  }
  if (step === 'review' || step === 'result') {
    return 'selected';
  }

  return 'connections';
}

export function resolveStepForSection(section: SourceImportSection): WizardStep {
  return SOURCE_IMPORT_SECTIONS.find((candidate) => candidate.id === section)?.step ?? 'connection';
}

export function canEnterSourceImportSection(
  section: SourceImportSection,
  selectedConnection: string | null,
  selectedCount: number,
  hasActiveSourceObject = selectedCount > 0
): boolean {
  if (section === 'connections') {
    return true;
  }
  if (section === 'browse') {
    return selectedConnection != null;
  }
  if (section === 'metadata') {
    return selectedConnection != null && hasActiveSourceObject;
  }

  return selectedConnection != null && selectedCount > 0;
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
