/** Owned concern: keep dbt source and runtime paths safe, contained, and disjoint. */
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
        | 'runtime_path_shadows_source'
        | 'unsupported_path_value'
        | 'unverifiable_path';
    };

const TEMPLATE_MARKER = /{{|}}|{%|%}|{#|#}/;
const PATH_SETTING = /(?:^|-)paths?$/;
const RUNTIME_PATH_SETTING_DEFAULTS = {
  'target-path': 'target',
  'log-path': 'logs',
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

export const DBT_RUNTIME_ARTIFACT_DIRECTORY_DEFAULTS = Object.freeze(
  Object.values(RUNTIME_PATH_SETTING_DEFAULTS)
);

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

  if (runtimePathShadowsConfiguredSource(document)) {
    return { ok: false, reason: 'runtime_path_shadows_source' };
  }

  return { ok: true };
}

export function resolveDbtRuntimeArtifactDirectoryPaths(dbtProjectYaml: string): readonly string[] {
  const document = parseDbtProjectDocument(dbtProjectYaml);
  if (document === null) return DBT_RUNTIME_ARTIFACT_DIRECTORY_DEFAULTS;
  return resolveEffectivePathSettings(document, RUNTIME_PATH_SETTING_DEFAULTS).filter(
    (configuredPath) => configuredPath !== '.'
  );
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

function runtimePathShadowsConfiguredSource(document: Record<string, unknown>): boolean {
  const runtimePaths = resolveEffectivePathSettings(document, RUNTIME_PATH_SETTING_DEFAULTS);
  const configuredSourcePaths = resolveEffectivePathSettings(
    document,
    SOURCE_PATH_SETTING_DEFAULTS
  );

  return runtimePaths.some(
    (runtimePath) =>
      runtimePath === '.' ||
      configuredSourcePaths.some(
        (sourcePath) => sourcePath === runtimePath || sourcePath.startsWith(`${runtimePath}/`)
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
