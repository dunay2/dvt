/** Validate private history storage directories and immutable record files without following symlinks. */
import { lstat } from 'node:fs/promises';
import path from 'node:path';

import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import { resolveWorkspaceScopeStorageRoot } from '../workspaceFiles/workspaceScopeStoragePath.js';

export async function assertSqlHistoryStorage(
  namespace: string,
  scope: WorkspaceStorageScope
): Promise<void> {
  const root = resolveWorkspaceScopeStorageRoot(namespace, scope);
  for (const directory of [path.dirname(namespace), namespace, path.dirname(root), root]) {
    const stat = await optionalStat(directory);
    if (stat === undefined) continue;
    if (!stat.isDirectory()) throw new Error('Invalid history directory.');
    if (stat.isSymbolicLink()) throw new Error('Unsafe history directory.');
  }
}

export async function assertSqlHistoryRecordFile(absolutePath: string): Promise<void> {
  const stat = await optionalStat(absolutePath);
  if (stat === undefined) return;
  if (!stat.isFile()) throw new Error('Invalid history file.');
  if (stat.isSymbolicLink()) throw new Error('Unsafe history file.');
}

async function optionalStat(absolutePath: string) {
  try {
    return await lstat(absolutePath);
  } catch (error) {
    if (isMissingHistoryPath(error)) return undefined;
    throw error;
  }
}

export function isMissingHistoryPath(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
