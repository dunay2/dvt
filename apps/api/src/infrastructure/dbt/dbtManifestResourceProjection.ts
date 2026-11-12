/**
 * Owned concern: project supported native dbt resources and their compilation evidence.
 * @decision Preserve compiled_code for every existing executable resource kind.
 * @consequence Parse-only, blank or absent SQL is never synthesized into compilation evidence.
 */
import type { DbtProjectAnalysisResource } from '../../application/ports/dbtProjectAnalysis.js';

import {
  projectTestMetadata,
  projectSourceIdentityRef,
  projectSourceTableDeclaration,
  resolveDescriptionFilePath,
} from './dbtManifestResourceMetadata.js';
import {
  record,
  stringValue,
  normalizeManifestPath,
  collectionValues,
  stringArray,
} from './dbtManifestValueReaders.js';

export const SUPPORTED_RESOURCE_TYPES = new Set([
  'source',
  'model',
  'seed',
  'snapshot',
  'test',
  'exposure',
  'metric',
]);

export function projectResource(
  value: unknown,
  rootProjectName: string
): DbtProjectAnalysisResource | null {
  const resource = record(value);
  const resourceType = stringValue(resource.resource_type);
  const uniqueId = stringValue(resource.unique_id);
  const name = stringValue(resource.name);
  const packageName = stringValue(resource.package_name);
  if (
    resourceType === undefined ||
    !SUPPORTED_RESOURCE_TYPES.has(resourceType) ||
    uniqueId === undefined ||
    name === undefined ||
    packageName === undefined
  ) {
    return null;
  }

  const projectedType = resourceType as DbtProjectAnalysisResource['resourceType'];
  const originalFilePath = stringValue(resource.original_file_path);
  const normalizedOriginalFilePath =
    originalFilePath === undefined ? undefined : normalizeManifestPath(originalFilePath);
  const patchPath = stringValue(resource.patch_path);
  const descriptionFilePath = resolveDescriptionFilePath({
    patchPath,
    normalizedOriginalFilePath,
    resourcePackageName: packageName,
    rootProjectName,
  });
  const description = typeof resource.description === 'string' ? resource.description : undefined;
  const columns = collectionValues(resource.columns)
    .map((columnValue) => {
      const column = record(columnValue);
      const columnName = stringValue(column.name);
      if (columnName === undefined) return null;
      return {
        name: columnName,
        ...(stringValue(column.data_type) === undefined
          ? {}
          : { dataType: stringValue(column.data_type) }),
        ...(stringValue(column.description) === undefined
          ? {}
          : { description: stringValue(column.description) }),
      };
    })
    .filter((column): column is NonNullable<typeof column> => column !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
  const testMetadata = projectedType === 'test' ? projectTestMetadata(resource) : undefined;
  const compiledSql =
    projectedType === 'model' || projectedType === 'test' || projectedType === 'snapshot'
      ? stringValue(resource.compiled_code)
      : undefined;
  const sourceIdentityRef = projectSourceIdentityRef(resource, projectedType);
  const identifier = projectedType === 'source' ? stringValue(resource.identifier) : undefined;
  const sourceTableDeclaration = projectSourceTableDeclaration({
    resource,
    resourceType: projectedType,
    rootProjectName,
    uniqueId,
    name,
    packageName,
    normalizedOriginalFilePath,
    identifier,
  });

  return {
    uniqueId,
    resourceType: projectedType,
    name,
    ...(identifier === undefined ? {} : { identifier }),
    packageName,
    ...(normalizedOriginalFilePath === undefined
      ? {}
      : { originalFilePath: normalizedOriginalFilePath }),
    ...(descriptionFilePath === undefined ? {} : { descriptionFilePath }),
    ...(stringValue(resource.source_name) === undefined
      ? {}
      : { sourceName: stringValue(resource.source_name) }),
    ...(description === undefined ? {} : { description }),
    ...(stringValue(record(resource.config).materialized) === undefined
      ? {}
      : { materialized: stringValue(record(resource.config).materialized) }),
    columns,
    tags: [...new Set(stringArray(resource.tags))].sort(),
    ...(testMetadata === undefined ? {} : { testMetadata }),
    ...(compiledSql === undefined ? {} : { compiledSql }),
    ...(sourceIdentityRef === undefined ? {} : { sourceIdentityRef }),
    ...(sourceTableDeclaration === undefined ? {} : { sourceTableDeclaration }),
    codeOnlyReasons: ['phase_two_read_only_projection'],
  };
}
