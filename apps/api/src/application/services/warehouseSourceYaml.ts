/** Owned concern: expose dbt source YAML artifact operations for warehouse source import. */

import { buildWarehouseSourceYamlBindings } from './warehouseSourceYamlBindings.js';
import {
  DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR,
  groupSourceObjectsForYaml,
} from './warehouseSourceYamlDescriptor.js';
import { readExistingSourceDocument } from './warehouseSourceYamlDocument.js';
import { sourceObjectIdentity } from './warehouseSourceYamlIdentity.js';
import { upsertSourceTable } from './warehouseSourceYamlMerge.js';
import { serializeSourceDocument } from './warehouseSourceYamlSerializer.js';
import type {
  BuildWarehouseSourceYamlUpdatesInput,
  WarehouseSourceYamlUpdate,
} from './warehouseSourceYamlTypes.js';

export {
  buildWarehouseSourceYamlBindings,
  findExistingSourceNameForSourceObject,
  findExistingTableNameForSourceObject,
} from './warehouseSourceYamlBindings.js';
export {
  DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR,
  buildWarehouseSourceYamlPath,
  groupSourceObjectsForYaml,
  toCollisionResistantYamlIdentifierPart,
  toStableYamlIdentifierPart,
} from './warehouseSourceYamlDescriptor.js';
export {
  isRecord,
  readExistingColumns,
  readExistingSourceDocument,
  readYamlMetadata,
} from './warehouseSourceYamlDocument.js';
export {
  buildCanonicalSourceName,
  buildCanonicalTableName,
  buildCollisionResistantSourceName,
  buildCollisionResistantTableName,
  sourceObjectIdentity,
} from './warehouseSourceYamlIdentity.js';
export {
  buildColumns,
  mergeColumns,
  mergeYamlArrays,
  upsertSourceTable,
} from './warehouseSourceYamlMerge.js';
export {
  appendYamlEntry,
  appendYamlMetadata,
  isGeneratedFreshness,
  serializeSourceDocument,
} from './warehouseSourceYamlSerializer.js';
export type {
  BuildWarehouseSourceYamlBindingsInput,
  BuildWarehouseSourceYamlUpdatesInput,
  ConnectedRelationalSourceObject,
  GeneratedSourceYamlFreshness,
  SourceYamlColumn,
  SourceYamlDocument,
  SourceYamlFreshness,
  SourceYamlMetadata,
  SourceYamlSource,
  SourceYamlTable,
  WarehouseSourceYamlArtifactDescriptor,
  WarehouseSourceYamlBinding,
  WarehouseSourceYamlUpdate,
} from './warehouseSourceYamlTypes.js';
export { InvalidWarehouseSourceYamlError } from './warehouseSourceYamlTypes.js';

export function buildWarehouseSourceYamlUpdates(
  input: BuildWarehouseSourceYamlUpdatesInput
): readonly WarehouseSourceYamlUpdate[] {
  const sourceObjectsByPath = groupSourceObjectsForYaml(
    input.sourceObjects,
    input.groupingStrategy
  );
  const bindings = buildWarehouseSourceYamlBindings(input);
  return Array.from(sourceObjectsByPath.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, sourceObjects]) => {
      const existingDocument = readExistingSourceDocument(input.existingFiles.get(path));

      const nextDocument = sourceObjects.reduce(
        (document, sourceObject) =>
          upsertSourceTable(document, sourceObject, {
            includeColumns: input.includeColumns,
            addTests: input.addTests,
            addFreshness: input.addFreshness,
            sourceName:
              bindings.get(sourceObjectIdentity(sourceObject))?.sourceName ??
              DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.sourceNameForSourceObject(sourceObject),
            tableName:
              bindings.get(sourceObjectIdentity(sourceObject))?.tableName ??
              DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.tableNameForSourceObject(sourceObject),
          }),
        existingDocument
      );
      return { path, content: serializeSourceDocument(nextDocument) };
    });
}
