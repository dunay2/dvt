/** Owned concern: keep dbt source, generated, and dependency paths contained and disjoint. */
import path from 'node:path';

import { load as loadYaml } from 'js-yaml';

import { readDbtProjectSnapshotConfigs } from './dbtProjectSnapshotConfigs.js';

export type DbtProjectPathPolicyResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | 'escaping_path'
        | 'malformed_config'
        | 'non_source_path_overlap'
        | 'non_source_path_shadows_source'
        | 'unsupported_path_value'
        | 'unverifiable_path';
    };

const TEMPLATE_MARKER = /{{|}}|{%|%}|{#|#}/;
const PATH_SETTING = /(?:^|-)paths?$/;
const GENERATED_ARTIFACT_PATH_SETTING_DEFAULTS = {
  'target-path': 'target',
  'log-path': 'logs',
} as const;
const INSTALLED_DEPENDENCY_PATH_SETTING_DEFAULTS = {
  'packages-install-path': 'dbt_packages',
} as const;
const SOURCE_PATH_SETTING_DEFAULTS = {
  'analysis-paths': 'analyses',
  'macro-paths': 'macros',
  'model-paths': 'models',
  'seed-paths': 'seeds',
  'semantic-model-paths': 'semantic_models',
  'snapshot-paths': 'snapshots',
  'test-paths': 'tests',
} as const;

export const DBT_GENERATED_ARTIFACT_DIRECTORY_DEFAULTS = Object.freeze(
  Object.values(GENERATED_ARTIFACT_PATH_SETTING_DEFAULTS)
);
export const DBT_INSTALLED_DEPENDENCY_DIRECTORY_DEFAULTS = Object.freeze(
  Object.values(INSTALLED_DEPENDENCY_PATH_SETTING_DEFAULTS)
);

export type DbtProjectDirectoryPartition = Readonly<{
  generatedArtifactDirectories: readonly string[];
  installedDependencyDirectories: readonly string[];
  sourceDirectories: readonly string[];
}>;

export function evaluateDbtProjectPathPolicy(dbtProjectYaml: string): DbtProjectPathPolicyResult {
  return evaluateProjectDirectories(parseDbtProjectDocument(dbtProjectYaml));
}

function evaluateProjectDirectories(
  document: Record<string, unknown> | null
): DbtProjectPathPolicyResult {
  if (document === null) {
    return { ok: false, reason: 'malformed_config' };
  }

  for (const [setting, value] of Object.entries(document)) {
    if (!PATH_SETTING.test(setting)) continue;
    const result = evaluateConfiguredPaths(value);
    if (!result.ok) return result;
  }
  const partition = readDirectoryPartition(document);
  if (nonSourcePathsOverlap(partition)) return { ok: false, reason: 'non_source_path_overlap' };
  if (nonSourcePathShadowsConfiguredSource(partition))
    return { ok: false, reason: 'non_source_path_shadows_source' };
  return { ok: true };
}

export function resolveDbtProjectDirectoryPartition(
  dbtProjectYaml: string
): DbtProjectDirectoryPartition {
  const document = parseDbtProjectDocument(dbtProjectYaml);
  if (document === null) {
    return {
      generatedArtifactDirectories: DBT_GENERATED_ARTIFACT_DIRECTORY_DEFAULTS,
      installedDependencyDirectories: DBT_INSTALLED_DEPENDENCY_DIRECTORY_DEFAULTS,
      sourceDirectories: Object.values(SOURCE_PATH_SETTING_DEFAULTS).sort((left, right) =>
        left.localeCompare(right)
      ),
    };
  }
  const partition = readDirectoryPartition(document);
  return {
    ...partition,
    generatedArtifactDirectories: partition.generatedArtifactDirectories.filter(
      (dir) => dir !== '.'
    ),
    installedDependencyDirectories: partition.installedDependencyDirectories.filter(
      (dir) => dir !== '.'
    ),
  };
}

function readDirectoryPartition(document: Record<string, unknown>): DbtProjectDirectoryPartition {
  return {
    generatedArtifactDirectories: resolveEffectivePathSettings(
      document,
      GENERATED_ARTIFACT_PATH_SETTING_DEFAULTS
    ),
    installedDependencyDirectories: resolveEffectivePathSettings(
      document,
      INSTALLED_DEPENDENCY_PATH_SETTING_DEFAULTS
    ),
    sourceDirectories: resolveEffectivePathSettings(document, SOURCE_PATH_SETTING_DEFAULTS),
  };
}

function evaluateConfiguredPaths(value: unknown): DbtProjectPathPolicyResult {
  const paths = readConfiguredPaths(value);
  if (!paths) return { ok: false, reason: 'unsupported_path_value' };
  for (const entry of paths) {
    if (TEMPLATE_MARKER.test(entry)) return { ok: false, reason: 'unverifiable_path' };
    if (normalizeContainedRelativePath(entry) === null)
      return { ok: false, reason: 'escaping_path' };
  }
  return { ok: true };
}

/** Publish new models to the first model folder declared by the project. */
export function resolveWorksheetDbtModelDirectory(
  config: Readonly<{ path: string; content: string }>
) {
  const document = parseDbtProjectDocument(config.content);
  if (!document) return null;
  if (typeof document.name !== 'string') return null;
  if (!evaluateProjectDirectories(document).ok) return null;
  const paths = readConfiguredPaths(document['model-paths']);
  const directory = normalizeContainedRelativePath(
    paths?.[0] ?? SOURCE_PATH_SETTING_DEFAULTS['model-paths']
  );
  if (directory === null) return null;
  return {
    projectName: document.name,
    directory,
    workspaceDirectory: path.posix.join(path.posix.dirname(config.path), directory),
  };
}

export async function evaluateDbtProjectSnapshotPathPolicy(
  snapshotDirectory: string
): Promise<DbtProjectPathPolicyResult> {
  for await (const content of readDbtProjectSnapshotConfigs(snapshotDirectory)) {
    const result = evaluateDbtProjectPathPolicy(content);
    if (!result.ok) return result;
  }
  return { ok: true };
}

function readConfiguredPaths(value: unknown): readonly string[] | null {
  const paths = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(paths) || paths.length === 0) return null;
  const admissible = paths.every(
    (item: unknown): item is string => typeof item === 'string' && item.length > 0
  );
  return admissible ? paths : null;
}

function normalizeContainedRelativePath(configuredPath: string): string | null {
  const portablePath = configuredPath.replaceAll('\\', '/');
  if (path.posix.isAbsolute(portablePath) || path.win32.parse(configuredPath).root.length > 0) {
    return null;
  }

  const normalized = path.posix.normalize(portablePath);
  if (normalized === '..' || normalized.startsWith('../')) return null;
  return normalized === '.' ? normalized : normalized.replace(/\/+$/u, '');
}

function nonSourcePathShadowsConfiguredSource(partition: DbtProjectDirectoryPartition): boolean {
  const nonSourcePaths = [
    ...partition.generatedArtifactDirectories,
    ...partition.installedDependencyDirectories,
  ];
  const configuredSourcePaths = partition.sourceDirectories;
  return nonSourcePaths.some(
    (nonSourcePath) =>
      nonSourcePath === '.' ||
      configuredSourcePaths.some(
        (sourcePath) => sourcePath === nonSourcePath || sourcePath.startsWith(`${nonSourcePath}/`)
      )
  );
}

function nonSourcePathsOverlap(partition: DbtProjectDirectoryPartition): boolean {
  const {
    generatedArtifactDirectories: generatedArtifactPaths,
    installedDependencyDirectories: installedDependencyPaths,
  } = partition;
  return generatedArtifactPaths.some((generatedPath) =>
    installedDependencyPaths.some(
      (dependencyPath) =>
        generatedPath === dependencyPath ||
        generatedPath.startsWith(`${dependencyPath}/`) ||
        dependencyPath.startsWith(`${generatedPath}/`)
    )
  );
}

function resolveEffectivePathSettings(
  document: Record<string, unknown>,
  defaults: Readonly<Record<string, string>>
): readonly string[] {
  const resolvedPaths = Object.entries(defaults).flatMap(([setting, defaultPath]) => {
    const configuredPaths = readConfiguredPaths(document[setting]);
    if (configuredPaths === null) return [defaultPath];
    const normalizedPaths = configuredPaths
      .map(normalizeContainedRelativePath)
      .filter((configuredPath): configuredPath is string => configuredPath !== null);
    return normalizedPaths.length > 0 ? normalizedPaths : [defaultPath];
  });
  return [...new Set(resolvedPaths)].sort((left, right) => left.localeCompare(right));
}

function parseDbtProjectDocument(content: string): Record<string, unknown> | null {
  try {
    const document = loadYaml(content, { json: true });
    return isRecord(document) ? document : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
