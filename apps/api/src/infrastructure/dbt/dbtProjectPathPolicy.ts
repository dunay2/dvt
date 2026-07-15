/** Owned concern: keep dbt source, generated, and dependency paths contained and disjoint. */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { load as loadYaml } from 'js-yaml';

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
}>;

export function evaluateDbtProjectPathPolicy(dbtProjectYaml: string): DbtProjectPathPolicyResult {
  const document = parseDbtProjectDocument(dbtProjectYaml);
  if (document === null) {
    return { ok: false, reason: 'malformed_config' };
  }

  for (const [setting, configuredValue] of Object.entries(document)) {
    if (!PATH_SETTING.test(setting)) continue;

    const configuredPaths = readConfiguredPaths(configuredValue);
    if (configuredPaths === null) {
      return { ok: false, reason: 'unsupported_path_value' };
    }
    for (const configuredPath of configuredPaths) {
      if (TEMPLATE_MARKER.test(configuredPath)) {
        return { ok: false, reason: 'unverifiable_path' };
      }
      if (!isSnapshotContainedRelativePath(configuredPath)) {
        return { ok: false, reason: 'escaping_path' };
      }
    }
  }

  if (nonSourcePathsOverlap(document)) {
    return { ok: false, reason: 'non_source_path_overlap' };
  }

  if (nonSourcePathShadowsConfiguredSource(document)) {
    return { ok: false, reason: 'non_source_path_shadows_source' };
  }

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
    };
  }
  return {
    generatedArtifactDirectories: resolveEffectivePathSettings(
      document,
      GENERATED_ARTIFACT_PATH_SETTING_DEFAULTS
    ).filter((configuredPath) => configuredPath !== '.'),
    installedDependencyDirectories: resolveEffectivePathSettings(
      document,
      INSTALLED_DEPENDENCY_PATH_SETTING_DEFAULTS
    ).filter((configuredPath) => configuredPath !== '.'),
  };
}

export async function evaluateDbtProjectSnapshotPathPolicy(
  snapshotDirectory: string
): Promise<DbtProjectPathPolicyResult> {
  for (const projectFile of await listDbtProjectFiles(snapshotDirectory)) {
    const result = evaluateDbtProjectPathPolicy(await readFile(projectFile, 'utf8'));
    if (!result.ok) return result;
  }
  return { ok: true };
}

function readConfiguredPaths(value: unknown): readonly string[] | null {
  if (value === undefined) return null;
  if (typeof value === 'string') return value.length > 0 ? [value] : null;
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== 'string')
  ) {
    return null;
  }
  return value.every((item) => item.length > 0) ? value : null;
}

function isSnapshotContainedRelativePath(configuredPath: string): boolean {
  return normalizeContainedRelativePath(configuredPath) !== null;
}

function normalizeContainedRelativePath(configuredPath: string): string | null {
  const portablePath = configuredPath.replaceAll('\\', '/');
  if (path.posix.isAbsolute(portablePath) || path.win32.parse(configuredPath).root.length > 0) {
    return null;
  }

  const normalized = path.posix.normalize(portablePath);
  return normalized !== '..' && !normalized.startsWith('../') ? normalized : null;
}

function nonSourcePathShadowsConfiguredSource(document: Record<string, unknown>): boolean {
  const nonSourcePaths = [
    ...resolveEffectivePathSettings(document, GENERATED_ARTIFACT_PATH_SETTING_DEFAULTS),
    ...resolveEffectivePathSettings(document, INSTALLED_DEPENDENCY_PATH_SETTING_DEFAULTS),
  ];
  const configuredSourcePaths = resolveEffectivePathSettings(
    document,
    SOURCE_PATH_SETTING_DEFAULTS
  );

  return nonSourcePaths.some(
    (nonSourcePath) =>
      nonSourcePath === '.' ||
      configuredSourcePaths.some(
        (sourcePath) => sourcePath === nonSourcePath || sourcePath.startsWith(`${nonSourcePath}/`)
      )
  );
}

function nonSourcePathsOverlap(document: Record<string, unknown>): boolean {
  const generatedArtifactPaths = resolveEffectivePathSettings(
    document,
    GENERATED_ARTIFACT_PATH_SETTING_DEFAULTS
  );
  const installedDependencyPaths = resolveEffectivePathSettings(
    document,
    INSTALLED_DEPENDENCY_PATH_SETTING_DEFAULTS
  );

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

async function listDbtProjectFiles(directory: string): Promise<readonly string[]> {
  const projectFiles: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      projectFiles.push(...(await listDbtProjectFiles(candidate)));
    } else if (entry.isFile() && entry.name === 'dbt_project.yml') {
      projectFiles.push(candidate);
    }
  }
  return projectFiles;
}
