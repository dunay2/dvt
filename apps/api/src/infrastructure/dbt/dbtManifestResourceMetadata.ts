/**
 * Owned concern: project native resource metadata and root-owned declaration paths.
 * @decision Resolve descriptions, source declarations and test metadata at the adapter boundary.
 * @consequence Cross-package declaration paths and incomplete physical identities stay absent.
 */
import type {
  DbtProjectAnalysisResource,
  DbtProjectSourceIdentityRef,
} from '../../application/ports/dbtProjectAnalysis.js';

import {
  record,
  stringValue,
  stringArray,
  normalizeManifestPath,
} from './dbtManifestValueReaders.js';

export function projectSourceTableDeclaration(
  input: Readonly<{
    resource: Record<string, unknown>;
    resourceType: DbtProjectAnalysisResource['resourceType'];
    rootProjectName: string;
    uniqueId: string;
    name: string;
    packageName: string;
    normalizedOriginalFilePath: string | undefined;
    identifier: string | undefined;
  }>
): DbtProjectAnalysisResource['sourceTableDeclaration'] {
  if (
    input.resourceType !== 'source' ||
    input.packageName !== input.rootProjectName ||
    input.normalizedOriginalFilePath === undefined
  ) {
    return undefined;
  }
  const sourceName = stringValue(input.resource.source_name);
  if (sourceName === undefined) return undefined;
  const database = stringValue(input.resource.database);
  const schema = stringValue(input.resource.schema);
  return {
    uniqueId: input.uniqueId,
    filePath: input.normalizedOriginalFilePath,
    sourceName,
    tableName: input.name,
    ...(database === undefined ? {} : { database }),
    ...(schema === undefined ? {} : { schema }),
    ...(input.identifier === undefined ? {} : { identifier: input.identifier }),
  };
}

export function projectSourceIdentityRef(
  resource: Record<string, unknown>,
  resourceType: DbtProjectAnalysisResource['resourceType']
): DbtProjectSourceIdentityRef | undefined {
  if (resourceType !== 'source') return undefined;

  const identity = record(record(resource.meta).dvt_source_identity);
  const database = stringValue(resource.database);
  const connectionId = stringValue(identity.connection_id);
  const schema = stringValue(resource.schema);
  const databaseUser = stringValue(identity.database_user);
  if (
    database === undefined ||
    connectionId === undefined ||
    schema === undefined ||
    databaseUser === undefined
  ) {
    return undefined;
  }

  return { database, connectionId, schema, databaseUser };
}

export function projectTestMetadata(resource: Record<string, unknown>) {
  const metadata = record(resource.test_metadata);
  const kwargs = record(metadata.kwargs);
  const targetUniqueId =
    stringValue(resource.attached_node) ?? stringArray(record(resource.depends_on).nodes)[0];
  const name = stringValue(metadata.name);
  const columnName = stringValue(kwargs.column_name);
  const severity = stringValue(record(resource.config).severity);
  if (
    targetUniqueId === undefined &&
    name === undefined &&
    columnName === undefined &&
    severity === undefined
  ) {
    return undefined;
  }
  return {
    ...(name === undefined ? {} : { name }),
    ...(targetUniqueId === undefined ? {} : { targetUniqueId }),
    ...(columnName === undefined ? {} : { columnName }),
    ...(severity === undefined ? {} : { severity }),
  };
}

export function resolveDescriptionFilePath(
  input: Readonly<{
    patchPath: string | undefined;
    normalizedOriginalFilePath: string | undefined;
    resourcePackageName: string;
    rootProjectName: string;
  }>
): string | undefined {
  if (input.resourcePackageName !== input.rootProjectName) return undefined;
  if (input.patchPath === undefined) {
    return isYamlPath(input.normalizedOriginalFilePath)
      ? input.normalizedOriginalFilePath
      : undefined;
  }

  const ownedPath = parseDbtOwnedPath(input.patchPath);
  return ownedPath.owner === undefined || ownedPath.owner === input.rootProjectName
    ? ownedPath.path
    : undefined;
}

function parseDbtOwnedPath(value: string): Readonly<{ owner?: string; path: string }> {
  const normalized = normalizeManifestPath(value);
  const schemeSeparatorIndex = normalized.indexOf('://');
  if (schemeSeparatorIndex < 0) return { path: normalized };
  return {
    owner: normalized.slice(0, schemeSeparatorIndex),
    path: normalized.slice(schemeSeparatorIndex + '://'.length),
  };
}

function isYamlPath(value: string | undefined): value is string {
  return value != null && /\.ya?ml$/iu.test(value);
}
