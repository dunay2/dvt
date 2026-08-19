import type {
  DbtProjectAnalysis,
  DbtProjectAnalysisDependency,
  DbtProjectAnalysisIdentity,
  DbtProjectAnalysisResource,
  DbtProjectSourceIdentityRef,
} from '../../application/ports/dbtProjectAnalysis.js';

const SUPPORTED_RESOURCE_TYPES = new Set([
  'source',
  'model',
  'seed',
  'snapshot',
  'test',
  'exposure',
  'metric',
]);
const SUPPORTED_ANALYSIS_IDENTITY_TYPES = new Set([
  'model',
  'source',
  'test',
  'snapshot',
  'seed',
  'macro',
]);

export type ManifestProjection = Readonly<{
  dbtVersion?: string;
  adapterType?: string;
  projectName: string;
  resources: readonly DbtProjectAnalysisResource[];
  identities: readonly DbtProjectAnalysisIdentity[];
  dependencies: readonly DbtProjectAnalysisDependency[];
  diagnostics: DbtProjectAnalysis['diagnostics'];
}>;

export function projectDbtManifest(value: unknown): ManifestProjection {
  const manifest = record(value);
  const metadata = record(manifest.metadata);
  const projectName = stringValue(metadata.project_name);
  if (
    stringValue(metadata.dbt_version) === undefined ||
    projectName === undefined ||
    !isRecord(manifest.nodes) ||
    !isRecord(manifest.sources)
  ) {
    throw new Error('dbt parse did not produce a supported manifest shape.');
  }
  const candidates = [
    ...collectionValues(manifest.nodes),
    ...collectionValues(manifest.sources),
    ...collectionValues(manifest.exposures),
    ...collectionValues(manifest.metrics),
  ];
  const identityCandidates = [
    ...collectionValues(manifest.nodes),
    ...collectionValues(manifest.sources),
    ...collectionValues(manifest.macros),
  ];
  const diagnostics: DbtProjectAnalysis['diagnostics'][number][] = [];
  const resources: DbtProjectAnalysisResource[] = [];
  for (const candidate of candidates) {
    const resource = projectResource(candidate, projectName);
    if (resource !== null) {
      resources.push(resource);
      continue;
    }

    const rawResource = record(candidate);
    const resourceType = stringValue(rawResource.resource_type);
    const uniqueId = stringValue(rawResource.unique_id);
    if (
      resourceType !== undefined &&
      uniqueId !== undefined &&
      !SUPPORTED_RESOURCE_TYPES.has(resourceType)
    ) {
      diagnostics.push({
        code: 'dbt_resource_not_projected',
        severity: 'warning',
        message: `${uniqueId} uses unsupported dbt resource type ${resourceType} and is not represented on the Canvas.`,
      });
      continue;
    }

    throw new Error('dbt parse produced a malformed graph resource.');
  }
  resources.sort((left, right) => left.uniqueId.localeCompare(right.uniqueId));
  const identities = identityCandidates
    .map((candidate) => {
      const identity = projectIdentity(candidate);
      const resourceType = stringValue(record(candidate).resource_type);
      if (identity === null && SUPPORTED_ANALYSIS_IDENTITY_TYPES.has(resourceType ?? '')) {
        throw new Error('dbt parse produced a malformed analysis identity.');
      }
      return identity;
    })
    .filter((identity): identity is DbtProjectAnalysisIdentity => identity !== null)
    .sort((left, right) => left.uniqueId.localeCompare(right.uniqueId));
  const resourceIds = new Set(resources.map((resource) => resource.uniqueId));
  const resourceById = new Map(resources.map((resource) => [resource.uniqueId, resource]));
  const dependencies: DbtProjectAnalysisDependency[] = [];

  for (const candidate of candidates) {
    const resource = resourceById.get(stringValue(record(candidate).unique_id) ?? '');
    if (!resource) continue;
    for (const dependencyId of stringArray(record(record(candidate).depends_on).nodes)) {
      if (!resourceIds.has(dependencyId)) {
        diagnostics.push({
          code: 'dbt_dependency_not_projected',
          severity: 'warning',
          message: `${resource.uniqueId} depends on unsupported resource ${dependencyId}.`,
        });
        continue;
      }
      dependencies.push({
        sourceUniqueId: dependencyId,
        targetUniqueId: resource.uniqueId,
        relation: dependencyRelation(resource.resourceType),
      });
    }
  }

  const dbtVersion = stringValue(metadata.dbt_version);
  const adapterType = stringValue(metadata.adapter_type);
  return {
    projectName,
    ...(dbtVersion === undefined ? {} : { dbtVersion }),
    ...(adapterType === undefined ? {} : { adapterType }),
    resources,
    identities,
    dependencies: deduplicateDependencies(dependencies),
    diagnostics: diagnostics.sort((left, right) => left.message.localeCompare(right.message)),
  };
}

function projectIdentity(value: unknown): DbtProjectAnalysisIdentity | null {
  const resource = record(value);
  const resourceType = stringValue(resource.resource_type);
  if (resourceType === undefined || !SUPPORTED_ANALYSIS_IDENTITY_TYPES.has(resourceType)) {
    return null;
  }
  const uniqueId = stringValue(resource.unique_id);
  const name = stringValue(resource.name);
  const packageName = stringValue(resource.package_name);
  if (uniqueId === undefined || name === undefined || packageName === undefined) return null;

  const originalFilePath = stringValue(resource.original_file_path);
  const sourceName = stringValue(resource.source_name);
  const dependencies = record(resource.depends_on);
  return {
    uniqueId,
    resourceType: resourceType as DbtProjectAnalysisIdentity['resourceType'],
    name,
    packageName,
    ...(sourceName === undefined ? {} : { sourceName }),
    ...(originalFilePath === undefined
      ? {}
      : { originalFilePath: normalizeManifestPath(originalFilePath) }),
    dependencyUniqueIds: [...new Set(stringArray(dependencies.nodes))].sort(),
    macroUniqueIds: [...new Set(stringArray(dependencies.macros))].sort(),
  };
}

function projectResource(
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
  const compiledSql = projectedType === 'model' ? stringValue(resource.compiled_code) : undefined;
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

function projectSourceTableDeclaration(
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

function projectTestMetadata(resource: Record<string, unknown>) {
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

function dependencyRelation(
  targetType: DbtProjectAnalysisResource['resourceType']
): DbtProjectAnalysisDependency['relation'] {
  if (targetType === 'test') return 'test_target';
  if (targetType === 'exposure') return 'exposure';
  if (targetType === 'metric') return 'metric';
  return 'dependency';
}

function deduplicateDependencies(
  dependencies: readonly DbtProjectAnalysisDependency[]
): readonly DbtProjectAnalysisDependency[] {
  const unique = new Map<string, DbtProjectAnalysisDependency>();
  for (const dependency of dependencies) {
    const key = `${dependency.sourceUniqueId}->${dependency.targetUniqueId}:${dependency.relation}`;
    unique.set(key, dependency);
  }
  return [...unique.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, dependency]) => dependency);
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? (value as Record<string, unknown>) : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collectionValues(value: unknown): readonly unknown[] {
  return Object.values(record(value));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function normalizeManifestPath(value: string): string {
  return value.replaceAll('\\', '/');
}

function resolveDescriptionFilePath(
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
