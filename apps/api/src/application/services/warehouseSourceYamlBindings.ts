/** Owned concern: bind imported relational source objects to persisted dbt source YAML entries. */

import {
  DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR,
  groupSourceObjectsForYaml,
} from './warehouseSourceYamlDescriptor.js';
import { readExistingSourceDocument } from './warehouseSourceYamlDocument.js';
import {
  buildCanonicalSourceName,
  buildCanonicalTableName,
  sourceObjectIdentity,
} from './warehouseSourceYamlIdentity.js';
import type {
  BuildWarehouseSourceYamlBindingsInput,
  ConnectedRelationalSourceObject,
  SourceYamlDocument,
  WarehouseSourceYamlBinding,
} from './warehouseSourceYamlTypes.js';

export function buildWarehouseSourceYamlBindings(
  input: BuildWarehouseSourceYamlBindingsInput
): ReadonlyMap<string, WarehouseSourceYamlBinding> {
  const sourceObjectsByPath = groupSourceObjectsForYaml(
    input.sourceObjects,
    input.groupingStrategy
  );
  const bindings = new Map<string, WarehouseSourceYamlBinding>();

  for (const [path, sourceObjects] of sourceObjectsByPath.entries()) {
    const existingDocument = readExistingSourceDocument(input.existingFiles.get(path));

    for (const sourceObject of sourceObjects) {
      const existingSourceName = findExistingSourceNameForSourceObject(
        existingDocument,
        sourceObject
      );
      const sourceName = existingSourceName ?? buildCanonicalSourceName(sourceObject);
      const existingTableName = findExistingTableNameForSourceObject(
        existingDocument,
        sourceName,
        sourceObject
      );
      bindings.set(sourceObjectIdentity(sourceObject), {
        path,
        sourceName,
        tableName: existingTableName ?? buildCanonicalTableName(sourceObject),
      });
    }
  }

  return bindings;
}

export function findExistingSourceNameForSourceObject(
  document: SourceYamlDocument,
  sourceObject: ConnectedRelationalSourceObject
): string | undefined {
  const database = sourceObject.locator.catalog;
  const schema = sourceObject.locator.schema;
  const canonicalSourceName =
    DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.sourceNameForSourceObject(sourceObject);
  const collisionResistantSourceName = buildCanonicalSourceName(sourceObject);
  const matchingSources = document.sources.filter((source) => {
    return source.database === database && source.schema === schema;
  });
  return matchingSources.find(
    (source) => source.name === canonicalSourceName || source.name === collisionResistantSourceName
  )?.name;
}

export function findExistingTableNameForSourceObject(
  document: SourceYamlDocument,
  sourceName: string,
  sourceObject: ConnectedRelationalSourceObject
): string | undefined {
  const source = document.sources.find((candidate) => candidate.name === sourceName);
  return source?.tables.find(
    (table) => (table.identifier ?? table.name) === sourceObject.locator.name
  )?.name;
}
