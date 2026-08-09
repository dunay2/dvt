/** Owned concern: bind imported relational source objects to persisted dbt source YAML entries. */

import {
  DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR,
  groupSourceObjectsForYaml,
} from './warehouseSourceYamlDescriptor.js';
import { readExistingSourceDocument } from './warehouseSourceYamlDocument.js';
import {
  buildCanonicalSourceName,
  buildCanonicalTableName,
  buildCollisionResistantSourceName,
  buildCollisionResistantTableName,
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
    const sourceNames = new Map<string, string>();

    for (const sourceObject of sourceObjects) {
      const existingSourceName = findExistingSourceNameForSourceObject(
        existingDocument,
        sourceObject
      );
      const canonicalSourceName = buildCanonicalSourceName(sourceObject);
      const sourceName =
        existingSourceName ??
        (hasSourceNameCollision(
          existingDocument,
          input.sourceObjects,
          sourceObject,
          canonicalSourceName
        )
          ? buildCollisionResistantSourceName(sourceObject)
          : canonicalSourceName);
      sourceNames.set(sourceObjectIdentity(sourceObject), sourceName);
    }

    for (const sourceObject of sourceObjects) {
      const sourceName = sourceNames.get(sourceObjectIdentity(sourceObject));
      if (!sourceName) {
        continue;
      }
      const existingTableName = findExistingTableNameForSourceObject(
        existingDocument,
        sourceName,
        sourceObject
      );
      const canonicalTableName = buildCanonicalTableName(sourceObject);
      bindings.set(sourceObjectIdentity(sourceObject), {
        path,
        sourceName,
        tableName:
          existingTableName ??
          (hasTableNameCollision(
            existingDocument,
            sourceObjects,
            sourceNames,
            sourceName,
            sourceObject,
            canonicalTableName
          )
            ? buildCollisionResistantTableName(sourceObject)
            : canonicalTableName),
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
  const collisionResistantSourceName = buildCollisionResistantSourceName(sourceObject);
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

function hasSourceNameCollision(
  document: SourceYamlDocument,
  sourceObjects: readonly ConnectedRelationalSourceObject[],
  sourceObject: ConnectedRelationalSourceObject,
  canonicalSourceName: string
): boolean {
  const collidesWithExisting = document.sources.some(
    (source) =>
      source.name === canonicalSourceName &&
      (source.database !== sourceObject.locator.catalog ||
        source.schema !== sourceObject.locator.schema)
  );
  const physicalIdentity = sourcePhysicalIdentity(sourceObject);
  const collidesInBatch = sourceObjects.some(
    (candidate) =>
      buildCanonicalSourceName(candidate) === canonicalSourceName &&
      sourcePhysicalIdentity(candidate) !== physicalIdentity
  );
  return collidesWithExisting || collidesInBatch;
}

function hasTableNameCollision(
  document: SourceYamlDocument,
  sourceObjects: readonly ConnectedRelationalSourceObject[],
  sourceNames: ReadonlyMap<string, string>,
  sourceName: string,
  sourceObject: ConnectedRelationalSourceObject,
  canonicalTableName: string
): boolean {
  const existingSource = document.sources.find((source) => source.name === sourceName);
  const collidesWithExisting = existingSource?.tables.some(
    (table) =>
      table.name === canonicalTableName &&
      (table.identifier ?? table.name) !== sourceObject.locator.name
  );
  const collidesInBatch = sourceObjects.some(
    (candidate) =>
      sourceNames.get(sourceObjectIdentity(candidate)) === sourceName &&
      buildCanonicalTableName(candidate) === canonicalTableName &&
      candidate.locator.name !== sourceObject.locator.name
  );
  return collidesWithExisting === true || collidesInBatch;
}

function sourcePhysicalIdentity(sourceObject: ConnectedRelationalSourceObject): string {
  return JSON.stringify([
    sourceObject.connectionId,
    sourceObject.locator.catalog,
    sourceObject.locator.schema,
  ]);
}
