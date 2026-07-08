/** Owned concern: expose dbt source YAML artifact operations for warehouse source import. */

import { buildWarehouseSourceYamlBindings } from './warehouseSourceYamlBindings.js';
import {
  DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR,
  groupTablesForYaml,
} from './warehouseSourceYamlDescriptor.js';
import { readExistingSourceDocument } from './warehouseSourceYamlDocument.js';
import { tableIdentity } from './warehouseSourceYamlIdentity.js';
import { upsertSourceTable } from './warehouseSourceYamlMerge.js';
import { serializeSourceDocument } from './warehouseSourceYamlSerializer.js';
import type {
  BuildWarehouseSourceYamlUpdatesInput,
  WarehouseSourceYamlUpdate,
} from './warehouseSourceYamlTypes.js';

export {
  buildWarehouseSourceYamlBindings,
  buildSourceTableDatabaseIndex,
  findExistingSourceNameForTable,
} from './warehouseSourceYamlBindings.js';
export {
  DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR,
  buildWarehouseSourceYamlPath,
  groupTablesForYaml,
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
  isRetiredSourceNameForTable,
  sourceTableIdentity,
  tableIdentity,
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
  const tablesByPath = groupTablesForYaml(input.tables, input.groupingStrategy);
  const bindings = buildWarehouseSourceYamlBindings(input);
  return Array.from(tablesByPath.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, tables]) => {
      const existingDocument = readExistingSourceDocument(input.existingFiles.get(path));

      const nextDocument = tables.reduce(
        (document, table) =>
          upsertSourceTable(document, table, {
            includeColumns: input.includeColumns,
            addTests: input.addTests,
            addFreshness: input.addFreshness,
            sourceName:
              bindings.get(tableIdentity(table))?.sourceName ??
              DBT_SOURCE_YAML_ARTIFACT_DESCRIPTOR.sourceNameForTable(table),
          }),
        existingDocument
      );
      return { path, content: serializeSourceDocument(nextDocument) };
    });
}
