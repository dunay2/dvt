/** Owned concern: reject dbt path configuration that can escape one project snapshot. */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { load as loadYaml } from 'js-yaml';

export type DbtProjectPathPolicyResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        'escaping_path' | 'malformed_config' | 'unsupported_path_value' | 'unverifiable_path';
    };

const TEMPLATE_MARKER = /{{|}}|{%|%}|{#|#}/;
const PATH_SETTING = /(?:^|-)paths?$/;

export function evaluateDbtProjectPathPolicy(dbtProjectYaml: string): DbtProjectPathPolicyResult {
  let document: unknown;
  try {
    document = loadYaml(dbtProjectYaml, { json: true });
  } catch {
    return { ok: false, reason: 'malformed_config' };
  }

  if (!isRecord(document)) {
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

  return { ok: true };
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
  const portablePath = configuredPath.replaceAll('\\', '/');
  if (path.posix.isAbsolute(portablePath) || path.win32.parse(configuredPath).root.length > 0) {
    return false;
  }

  const normalized = path.posix.normalize(portablePath);
  return normalized !== '..' && !normalized.startsWith('../');
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
