/** Owned concern: define dbt source YAML naming and path policy. */
import { createHash } from 'node:crypto';

import type { SourceImportGrouping } from '../ports/warehouseSourceImport.js';

import type {
  ConnectedRelationalSourceObject,
  WarehouseSourceYamlArtifactDescriptor,
} from './warehouseSourceYamlTypes.js';

export const DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR: WarehouseSourceYamlArtifactDescriptor = {
  pluginId: 'dbt',
  artifactKind: 'dbt-source-yaml',
  pathForSourceObject: (sourceObject, groupingStrategy) => {
    return buildWarehouseSourceYamlPathFromPart(
      toStableYamlIdentifierPart(groupingValue(sourceObject, groupingStrategy))
    );
  },
  sourceNameForSourceObject: (sourceObject) =>
    [sourceObject.connectionId, sourceObject.locator.catalog, sourceObject.locator.schema]
      .map(toStableYamlIdentifierPart)
      .join('_'),
  tableNameForSourceObject: (sourceObject) => toStableYamlIdentifierPart(sourceObject.locator.name),
  generatedFreshness: {
    warnAfterCount: 24,
    warnAfterPeriod: 'hour',
    errorAfterCount: 48,
    errorAfterPeriod: 'hour',
  },
  reservedKeys: {
    document: ['sources'],
    source: ['name', 'database', 'schema', 'freshness', 'tables'],
    table: ['name', 'identifier', 'columns'],
    column: ['name', 'data_type', 'tests'],
  },
};

export function buildWarehouseSourceYamlPath(
  sourceObject: ConnectedRelationalSourceObject,
  groupingStrategy: SourceImportGrouping
): string {
  return DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.pathForSourceObject(sourceObject, groupingStrategy);
}

export function groupSourceObjectsForYaml(
  sourceObjects: readonly ConnectedRelationalSourceObject[],
  groupingStrategy: SourceImportGrouping
): ReadonlyMap<string, readonly ConnectedRelationalSourceObject[]> {
  const grouped = new Map<string, ConnectedRelationalSourceObject[]>();
  const rawValuesByStablePart = new Map<string, Set<string>>();

  for (const sourceObject of sourceObjects) {
    const value = groupingValue(sourceObject, groupingStrategy);
    const stablePart = toStableYamlIdentifierPart(value);
    const rawValues = rawValuesByStablePart.get(stablePart) ?? new Set<string>();
    rawValues.add(value.toLowerCase());
    rawValuesByStablePart.set(stablePart, rawValues);
  }

  const collidingStableParts = new Set(
    Array.from(rawValuesByStablePart.entries())
      .filter(([, rawValues]) => rawValues.size > 1)
      .map(([stablePart]) => stablePart)
  );

  for (const sourceObject of sourceObjects) {
    const value = groupingValue(sourceObject, groupingStrategy);
    const stablePart = toStableYamlIdentifierPart(value);
    const path = buildWarehouseSourceYamlPathFromPart(
      collidingStableParts.has(stablePart)
        ? toCollisionResistantYamlIdentifierPart(value)
        : stablePart
    );
    const group = grouped.get(path) ?? [];
    group.push(sourceObject);
    grouped.set(path, group);
  }
  return grouped;
}

export function toStableYamlIdentifierPart(part: string): string {
  const normalized = part
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : 'unnamed';
}

export function toCollisionResistantYamlIdentifierPart(part: string): string {
  const stablePart = toStableYamlIdentifierPart(part);
  const canonicalInput = part.trim();
  const hash = createHash('sha256')
    .update(canonicalInput.length > 0 ? canonicalInput : part)
    .digest('hex')
    .slice(0, 8);
  return `${stablePart}_${hash}`;
}

function groupingValue(
  sourceObject: ConnectedRelationalSourceObject,
  groupingStrategy: SourceImportGrouping
): string {
  return groupingStrategy === 'database'
    ? sourceObject.locator.catalog
    : sourceObject.locator.schema;
}

function buildWarehouseSourceYamlPathFromPart(groupPart: string): string {
  return `models/sources/src_${groupPart}.yml`;
}
