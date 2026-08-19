import {
  isRelationalSourceObject,
  resolveSourceObjectColumnConstraintSemantics,
  type SourceObjectLocatorKind,
} from '@dvt/contracts';

import type {
  SelectableRelationalSourceObject,
  SelectableSourceObject,
  SourceImportSchemaIdentity,
} from './types';
import {
  describeSourceObjectMetricEvidence,
  formatSourceObjectMetricByteDetail,
  formatSourceObjectMetricByteSize,
} from '../../services/workspace/sourceObjectMetricEvidencePresentation';

export type SourceImportColumnConstraintMarkerKind = 'primary-key' | 'unique' | 'not-null';

export type SourceImportColumnConstraintMarker = Readonly<{
  kind: SourceImportColumnConstraintMarkerKind;
  shortLabel: 'PK' | 'UQ' | 'NN';
  label: string;
}>;

export type SourceImportColumnViewModel = Readonly<{
  name: string;
  type: string;
  constraintMarkers: readonly SourceImportColumnConstraintMarker[];
}>;

export type SourceImportObjectViewModel = Readonly<{
  index: number;
  identityKey: string;
  locatorKind: SourceObjectLocatorKind;
  kindLabel: string;
  canonicalName: string;
  displayName: string;
  accessibilityLabel: string;
  inspectionAccessibilityLabel: string;
  rowCountLabel: string;
  rowCountDetail: string;
  rowCountTone: 'measured' | 'estimated';
  byteSizeLabel: string;
  byteSizeDetail: string;
  byteSizeTone: 'measured' | 'estimated';
  columnCountLabel: string;
  selected: boolean;
  selectedLabel: string;
  selectable: boolean;
  importabilityLabel: string | null;
  columns: readonly SourceImportColumnViewModel[];
}>;

export type SourceImportCatalogFilterId = 'all' | 'selected' | 'withColumns' | 'importable';

export type SourceImportCatalogFilterViewModel = Readonly<{
  id: SourceImportCatalogFilterId;
  label: string;
  countLabel: string;
  active: boolean;
  disabled: boolean;
  accessibilityLabel: string;
}>;

export type SourceImportSchemaGroupViewModel = Readonly<{
  schema: string;
  canonicalName: string;
  accessibilityLabel: string;
  expandAccessibilityLabel: string;
  collapseAccessibilityLabel: string;
  objectCountLabel: string;
  selected: boolean;
  sourceObjects: readonly SourceImportObjectViewModel[];
}>;

export type SourceImportDatabaseGroupViewModel = Readonly<{
  database: string;
  accessibilityLabel: string;
  schemaCountLabel: string;
  objectCountLabel: string;
  selectedLabel: string | null;
  selected: boolean;
  schemaGroups: readonly SourceImportSchemaGroupViewModel[];
}>;

export type SourceImportLocatorGroupViewModel = Readonly<{
  locatorKind: SourceObjectLocatorKind;
  label: string;
  objectCountLabel: string;
  sourceObjects: readonly SourceImportObjectViewModel[];
}>;

export type SourceImportCatalogViewModel = Readonly<{
  databaseGroups: readonly SourceImportDatabaseGroupViewModel[];
  schemaGroups: readonly SourceImportSchemaGroupViewModel[];
  relationGroup: SourceImportLocatorGroupViewModel | null;
  locatorGroups: readonly SourceImportLocatorGroupViewModel[];
  activeSourceObject: SourceImportObjectViewModel | null;
  selectedSourceObjects: readonly SourceImportObjectViewModel[];
  totalObjectCount: number;
  visibleObjectCount: number;
  selectedObjectCount: number;
  resultCountLabel: string;
  activeFilterId: SourceImportCatalogFilterId;
  filterListLabel: string;
  categoryFilters: readonly SourceImportCatalogFilterViewModel[];
}>;

export type SourceImportCatalogCopy = Readonly<{
  selectSourceObject: string;
  selectSourceDatabase: string;
  selectSourceSchema: string;
  expandSourceSchema: string;
  collapseSourceSchema: string;
  inSourceDatabase: string;
  inspectSourceObjectMetadata: string;
  metadata: string;
  rowSingular: string;
  rowPlural: string;
  estimatedSizePrefix: string;
  columnSingular: string;
  columnPlural: string;
  objectSingular: string;
  objectPlural: string;
  schemaSingular: string;
  schemaPlural: string;
  allSelected: string;
  notNull: string;
  primaryKey: string;
  unique: string;
  available: string;
  showing: string;
  of: string;
  filterAll: string;
  filterSelected: string;
  filterWithColumns: string;
  filterImportable: string;
  filterListLabel: string;
  filterAccessibilityPrefix: string;
  locatorKindLabels: Readonly<Record<SourceObjectLocatorKind, string>>;
  unsupportedImport: string;
}>;

export function buildRelationalSourceObjectName(
  sourceObject: Pick<SelectableRelationalSourceObject, 'locator'>
): string {
  return [
    sourceObject.locator.catalog,
    sourceObject.locator.schema,
    sourceObject.locator.name,
  ].join('.');
}

export function buildSourceObjectDisplayPath(
  sourceObject: Pick<SelectableSourceObject, 'locator'>
): string {
  switch (sourceObject.locator.kind) {
    case 'relation':
      return [
        sourceObject.locator.catalog,
        sourceObject.locator.schema,
        sourceObject.locator.name,
      ].join('.');
    case 'file':
      return sourceObject.locator.path;
    case 'endpoint':
    case 'stream':
      return `${sourceObject.locator.protocol}:${sourceObject.locator.resource}`;
  }
}

export function buildSourceObjectIdentityKey(
  sourceObject: Pick<SelectableSourceObject, 'objectId'>
): string {
  return sourceObject.objectId;
}

export function buildSourceImportSchemaKey(schema: SourceImportSchemaIdentity): string {
  return JSON.stringify([schema.database, schema.schema]);
}

export function isSourceObjectImportable(sourceObject: SelectableSourceObject): boolean {
  return isRelationalSourceObject(sourceObject);
}

function formatNumber(value: number, numberFormatter: Intl.NumberFormat): string {
  return numberFormatter.format(value);
}

export function formatSourceImportRowCount(
  rowCount: number,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): string {
  const suffix = rowCount === 1 ? copy.rowSingular : copy.rowPlural;
  return `${formatNumber(rowCount, numberFormatter)} ${suffix}`;
}

export function formatSourceImportColumnCount(
  columnCount: number,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): string {
  const suffix = columnCount === 1 ? copy.columnSingular : copy.columnPlural;
  return `${formatNumber(columnCount, numberFormatter)} ${suffix}`;
}

export function formatSourceImportSizeEvidence(
  sourceObject: Pick<SelectableSourceObject, 'metricEvidence'>,
  copy: Pick<SourceImportCatalogCopy, 'estimatedSizePrefix'>,
  numberFormatter: Intl.NumberFormat
): string {
  const size = formatSourceObjectMetricByteSize(
    sourceObject.metricEvidence.byteSize.value,
    numberFormatter
  );
  return sourceObject.metricEvidence.byteSize.provenance === 'estimated'
    ? `${copy.estimatedSizePrefix} ${size}`
    : size;
}

export function formatSourceImportObjectCount(
  objectCount: number,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): string {
  const suffix = objectCount === 1 ? copy.objectSingular : copy.objectPlural;
  return `${formatNumber(objectCount, numberFormatter)} ${suffix}`;
}

export function formatSourceImportSchemaCount(
  schemaCount: number,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): string {
  const suffix = schemaCount === 1 ? copy.schemaSingular : copy.schemaPlural;
  return `${formatNumber(schemaCount, numberFormatter)} ${suffix}`;
}

function normalizeCatalogSearchValue(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function sourceObjectMatchesSearch(
  sourceObject: SelectableSourceObject,
  normalizedSearchQuery: string
): boolean {
  if (normalizedSearchQuery.length === 0) {
    return true;
  }

  const searchableValues = [
    sourceObject.objectId,
    sourceObject.displayName,
    ...Object.values(sourceObject.locator),
    ...(sourceObject.columns?.flatMap((column) => [column.name, column.type]) ?? []),
  ];

  return searchableValues.some((value) =>
    normalizeCatalogSearchValue(value).includes(normalizedSearchQuery)
  );
}

function sourceObjectMatchesFilter(
  sourceObject: SelectableSourceObject,
  filterId: SourceImportCatalogFilterId
): boolean {
  switch (filterId) {
    case 'selected':
      return isSourceObjectImportable(sourceObject) && sourceObject.selected;
    case 'withColumns':
      return (sourceObject.columns?.length ?? 0) > 0;
    case 'importable':
      return isSourceObjectImportable(sourceObject);
    case 'all':
      return true;
  }
}

function buildSourceImportCatalogFilters({
  searchableSourceObjects,
  activeFilterId,
  copy,
  numberFormatter,
}: Readonly<{
  searchableSourceObjects: readonly SelectableSourceObject[];
  activeFilterId: SourceImportCatalogFilterId;
  copy: SourceImportCatalogCopy;
  numberFormatter: Intl.NumberFormat;
}>): readonly SourceImportCatalogFilterViewModel[] {
  const filterDefinitions: readonly Readonly<{
    id: SourceImportCatalogFilterId;
    label: string;
  }>[] = [
    { id: 'all', label: copy.filterAll },
    { id: 'selected', label: copy.filterSelected },
    { id: 'withColumns', label: copy.filterWithColumns },
    { id: 'importable', label: copy.filterImportable },
  ];

  return filterDefinitions.map((filter) => {
    const count = searchableSourceObjects.filter((sourceObject) =>
      sourceObjectMatchesFilter(sourceObject, filter.id)
    ).length;
    const countLabel = formatNumber(count, numberFormatter);
    const objectCountLabel = formatSourceImportObjectCount(count, copy, numberFormatter);

    return {
      id: filter.id,
      label: filter.label,
      countLabel,
      active: filter.id === activeFilterId,
      disabled: count === 0,
      accessibilityLabel: `${copy.filterAccessibilityPrefix} ${filter.label}. ${objectCountLabel}.`,
    };
  });
}

export function buildSourceImportObjectViewModel(
  sourceObject: SelectableSourceObject,
  index: number,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): SourceImportObjectViewModel {
  const identityKey = buildSourceObjectIdentityKey(sourceObject);
  const canonicalName = buildSourceObjectDisplayPath(sourceObject);
  const rowCountLabel = formatSourceImportRowCount(
    sourceObject.metricEvidence.rowCount.value,
    copy,
    numberFormatter
  );
  const byteSizeLabel = formatSourceImportSizeEvidence(sourceObject, copy, numberFormatter);
  const columnCountLabel = formatSourceImportColumnCount(
    sourceObject.columns?.length ?? 0,
    copy,
    numberFormatter
  );
  const accessibilityMetrics = [rowCountLabel, byteSizeLabel, columnCountLabel].join('. ');
  const selectable = isSourceObjectImportable(sourceObject);

  return {
    index,
    identityKey,
    locatorKind: sourceObject.locator.kind,
    kindLabel: copy.locatorKindLabels[sourceObject.locator.kind],
    canonicalName,
    displayName: sourceObject.displayName,
    accessibilityLabel: selectable
      ? `${copy.selectSourceObject} ${canonicalName}. ${accessibilityMetrics}.`
      : `${copy.inspectSourceObjectMetadata} ${canonicalName} ${copy.metadata}. ${accessibilityMetrics}. ${copy.unsupportedImport}`,
    inspectionAccessibilityLabel: `${copy.inspectSourceObjectMetadata} ${canonicalName} ${copy.metadata}. ${accessibilityMetrics}.`,
    rowCountLabel,
    rowCountDetail: describeSourceObjectMetricEvidence({
      metric: sourceObject.metricEvidence.rowCount,
      subject: rowCountLabel,
      evidence: sourceObject.metricEvidence,
      locale: numberFormatter.resolvedOptions().locale,
    }),
    rowCountTone: sourceObject.metricEvidence.rowCount.provenance,
    byteSizeLabel,
    byteSizeDetail: describeSourceObjectMetricEvidence({
      metric: sourceObject.metricEvidence.byteSize,
      subject: formatSourceObjectMetricByteDetail(
        sourceObject.metricEvidence.byteSize.value,
        numberFormatter
      ),
      evidence: sourceObject.metricEvidence,
      basis: sourceObject.metricEvidence.byteSize.basis,
      locale: numberFormatter.resolvedOptions().locale,
    }),
    byteSizeTone: sourceObject.metricEvidence.byteSize.provenance,
    columnCountLabel,
    selected: selectable && sourceObject.selected,
    selectedLabel: copy.filterSelected,
    selectable,
    importabilityLabel: selectable ? null : copy.unsupportedImport,
    columns:
      sourceObject.columns?.map((column) => {
        const constraintSemantics = resolveSourceObjectColumnConstraintSemantics(
          sourceObject,
          column.name
        );
        const constraintMarkers: SourceImportColumnConstraintMarker[] = [
          ...(constraintSemantics.primaryKey
            ? [{ kind: 'primary-key' as const, shortLabel: 'PK' as const, label: copy.primaryKey }]
            : constraintSemantics.independentlyUnique
              ? [{ kind: 'unique' as const, shortLabel: 'UQ' as const, label: copy.unique }]
              : []),
          ...(!column.nullable && !constraintSemantics.primaryKey
            ? [{ kind: 'not-null' as const, shortLabel: 'NN' as const, label: copy.notNull }]
            : []),
        ];

        return {
          name: column.name,
          type: column.type,
          constraintMarkers,
        };
      }) ?? [],
  };
}

export function buildSourceImportCatalogViewModel({
  sourceObjects,
  activeSourceObjectKey,
  searchQuery,
  filterId = 'all',
  copy,
  numberFormatter = new Intl.NumberFormat(),
}: Readonly<{
  sourceObjects: readonly SelectableSourceObject[];
  activeSourceObjectKey: string | null;
  searchQuery?: string;
  filterId?: SourceImportCatalogFilterId;
  copy: SourceImportCatalogCopy;
  numberFormatter?: Intl.NumberFormat;
}>): SourceImportCatalogViewModel {
  const normalizedSearchQuery = normalizeCatalogSearchValue(searchQuery);
  const allObjectViewModels = sourceObjects.map((sourceObject, index) =>
    buildSourceImportObjectViewModel(sourceObject, index, copy, numberFormatter)
  );
  const searchableEntries = sourceObjects
    .map((sourceObject, index) => ({ sourceObject, viewModel: allObjectViewModels[index]! }))
    .filter(({ sourceObject }) => sourceObjectMatchesSearch(sourceObject, normalizedSearchQuery));
  const visibleEntries = searchableEntries.filter(({ sourceObject }) =>
    sourceObjectMatchesFilter(sourceObject, filterId)
  );
  const visibleViewModels = visibleEntries.map(({ viewModel }) => viewModel);
  const relationalGroups = new Map<string, Map<string, SourceImportObjectViewModel[]>>();

  visibleEntries.forEach(({ sourceObject, viewModel }) => {
    if (!isRelationalSourceObject(sourceObject)) {
      return;
    }
    const databaseSchemas = relationalGroups.get(sourceObject.locator.catalog) ?? new Map();
    const schemaObjects = databaseSchemas.get(sourceObject.locator.schema) ?? [];
    schemaObjects.push(viewModel);
    databaseSchemas.set(sourceObject.locator.schema, schemaObjects);
    relationalGroups.set(sourceObject.locator.catalog, databaseSchemas);
  });

  const activeSourceObject =
    (activeSourceObjectKey
      ? visibleViewModels.find((sourceObject) => sourceObject.identityKey === activeSourceObjectKey)
      : undefined) ??
    visibleViewModels.find((sourceObject) => sourceObject.selected) ??
    visibleViewModels[0] ??
    null;
  const schemaGroups = Array.from(relationalGroups.entries())
    .flatMap(([database, databaseSchemaGroups]) =>
      Array.from(databaseSchemaGroups.entries()).map(([schema, groupObjects]) => ({
        database,
        schema,
        groupObjects,
      }))
    )
    .sort(
      (left, right) =>
        left.database.localeCompare(right.database) || left.schema.localeCompare(right.schema)
    )
    .map(({ database, schema, groupObjects }) =>
      buildSourceImportSchemaGroup(database, schema, groupObjects, copy, numberFormatter)
    );
  const databaseGroups = Array.from(relationalGroups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([database, databaseSchemaGroups]) => {
      const databaseSchemas = Array.from(databaseSchemaGroups.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([schema, groupObjects]) =>
          buildSourceImportSchemaGroup(database, schema, groupObjects, copy, numberFormatter)
        );
      const databaseObjects = databaseSchemas.flatMap((schemaGroup) => schemaGroup.sourceObjects);

      return {
        database,
        accessibilityLabel: `${copy.selectSourceDatabase} ${database}. ${formatSourceImportSchemaCount(
          databaseSchemas.length,
          copy,
          numberFormatter
        )}. ${formatSourceImportObjectCount(databaseObjects.length, copy, numberFormatter)}.`,
        schemaCountLabel: formatSourceImportSchemaCount(
          databaseSchemas.length,
          copy,
          numberFormatter
        ),
        objectCountLabel: formatSourceImportObjectCount(
          databaseObjects.length,
          copy,
          numberFormatter
        ),
        selected: databaseObjects.length > 0 && databaseObjects.every((object) => object.selected),
        selectedLabel:
          databaseObjects.length > 0 && databaseObjects.every((object) => object.selected)
            ? copy.allSelected
            : null,
        schemaGroups: databaseSchemas,
      };
    });
  const locatorGroups = (['file', 'endpoint', 'stream'] as const)
    .map((locatorKind) => {
      const groupedObjects = visibleEntries
        .filter(({ sourceObject }) => sourceObject.locator.kind === locatorKind)
        .map(({ viewModel }) => viewModel);
      return {
        locatorKind,
        label: copy.locatorKindLabels[locatorKind],
        objectCountLabel: formatSourceImportObjectCount(
          groupedObjects.length,
          copy,
          numberFormatter
        ),
        sourceObjects: groupedObjects,
      };
    })
    .filter((group) => group.sourceObjects.length > 0);
  const relationObjects = visibleEntries
    .filter(({ sourceObject }) => sourceObject.locator.kind === 'relation')
    .map(({ viewModel }) => viewModel);

  return {
    databaseGroups,
    schemaGroups,
    relationGroup:
      relationObjects.length > 0
        ? {
            locatorKind: 'relation',
            label: copy.locatorKindLabels.relation,
            objectCountLabel: formatSourceImportObjectCount(
              relationObjects.length,
              copy,
              numberFormatter
            ),
            sourceObjects: relationObjects,
          }
        : null,
    locatorGroups,
    activeSourceObject,
    selectedSourceObjects: allObjectViewModels.filter((sourceObject) => sourceObject.selected),
    totalObjectCount: allObjectViewModels.length,
    visibleObjectCount: visibleViewModels.length,
    selectedObjectCount: allObjectViewModels.filter((sourceObject) => sourceObject.selected).length,
    resultCountLabel:
      visibleViewModels.length === allObjectViewModels.length
        ? `${formatSourceImportObjectCount(
            allObjectViewModels.length,
            copy,
            numberFormatter
          )} ${copy.available}`
        : `${copy.showing} ${formatNumber(visibleViewModels.length, numberFormatter)} ${copy.of} ${formatNumber(
            allObjectViewModels.length,
            numberFormatter
          )} ${copy.objectPlural}`,
    activeFilterId: filterId,
    filterListLabel: copy.filterListLabel,
    categoryFilters: buildSourceImportCatalogFilters({
      searchableSourceObjects: searchableEntries.map(({ sourceObject }) => sourceObject),
      activeFilterId: filterId,
      copy,
      numberFormatter,
    }),
  };
}

function buildSourceImportSchemaGroup(
  database: string,
  schema: string,
  groupObjects: readonly SourceImportObjectViewModel[],
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): SourceImportSchemaGroupViewModel {
  const objectCountLabel = formatSourceImportObjectCount(
    groupObjects.length,
    copy,
    numberFormatter
  );
  const schemaLocationLabel = `${schema}. ${copy.inSourceDatabase} ${database}. ${objectCountLabel}.`;

  return {
    schema,
    canonicalName: `${database}.${schema}`,
    accessibilityLabel: `${copy.selectSourceSchema} ${schemaLocationLabel}`,
    expandAccessibilityLabel: `${copy.expandSourceSchema} ${schemaLocationLabel}`,
    collapseAccessibilityLabel: `${copy.collapseSourceSchema} ${schemaLocationLabel}`,
    objectCountLabel,
    selected:
      groupObjects.length > 0 && groupObjects.every((sourceObject) => sourceObject.selected),
    sourceObjects: groupObjects,
  };
}
