import type {
  DbtProjectAnalysis,
  DbtProjectAnalysisDependency,
  DbtProjectAnalysisResource,
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

export type ManifestProjection = Readonly<{
  dbtVersion?: string;
  adapterType?: string;
  resources: readonly DbtProjectAnalysisResource[];
  dependencies: readonly DbtProjectAnalysisDependency[];
  diagnostics: DbtProjectAnalysis['diagnostics'];
}>;

export function projectDbtManifest(value: unknown): ManifestProjection {
  const manifest = record(value);
  if (
    stringValue(record(manifest.metadata).dbt_version) === undefined ||
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
  const diagnostics: DbtProjectAnalysis['diagnostics'][number][] = [];
  const resources: DbtProjectAnalysisResource[] = [];
  for (const candidate of candidates) {
    const resource = projectResource(candidate);
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

  const dbtVersion = stringValue(record(manifest.metadata).dbt_version);
  const adapterType = stringValue(record(manifest.metadata).adapter_type);
  return {
    ...(dbtVersion === undefined ? {} : { dbtVersion }),
    ...(adapterType === undefined ? {} : { adapterType }),
    resources,
    dependencies: deduplicateDependencies(dependencies),
    diagnostics: diagnostics.sort((left, right) => left.message.localeCompare(right.message)),
  };
}

function projectResource(value: unknown): DbtProjectAnalysisResource | null {
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

  return {
    uniqueId,
    resourceType: projectedType,
    name,
    packageName,
    ...(originalFilePath === undefined
      ? {}
      : { originalFilePath: normalizeManifestPath(originalFilePath) }),
    ...(stringValue(resource.source_name) === undefined
      ? {}
      : { sourceName: stringValue(resource.source_name) }),
    ...(stringValue(record(resource.config).materialized) === undefined
      ? {}
      : { materialized: stringValue(record(resource.config).materialized) }),
    columns,
    tags: [...new Set(stringArray(resource.tags))].sort(),
    ...(testMetadata === undefined ? {} : { testMetadata }),
    codeOnlyReasons: ['phase_two_read_only_projection'],
  };
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
