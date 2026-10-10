/** Physical preflight only; these internal paths are neither authorization nor a native lease. */
import type { Stats } from 'node:fs';
import { lstat, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';

import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import type { LocalDataConfiguration } from '../../plugins/localDataEnv.js';
import { resolveWorkspaceScopeStorageRoot } from '../workspaceFiles/workspaceScopeStoragePath.js';

type StorageFailure =
  | 'unsupported_platform'
  | 'unsafe_path'
  | 'invalid_scope'
  | 'not_found'
  | 'not_directory'
  | 'symlink_unsupported'
  | 'permissions_unsafe'
  | 'unsafe_file'
  | 'io_unavailable';

export class LocalDataStorageBoundaryError extends Error {
  public constructor(readonly reason: StorageFailure) {
    super(`Local data storage rejected: ${reason}`);
    this.name = 'LocalDataStorageBoundaryError';
  }
}

export type DuckDbWorkspacePaths = Readonly<{
  directory: string;
  database: string;
  temporary: string;
}>;

function hasCode(error: unknown, code: string): boolean {
  return error != null && typeof error === 'object' && 'code' in error && error.code === code;
}

function rejectIo(error: unknown): never {
  if (error instanceof LocalDataStorageBoundaryError) throw error;
  throw new LocalDataStorageBoundaryError(hasCode(error, 'ENOENT') ? 'not_found' : 'io_unavailable');
}

function isContained(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  );
}

async function inspectDirectory(directory: string, privateDirectory = false): Promise<Stats> {
  const entry = await lstat(directory);
  if (entry.isSymbolicLink()) throw new LocalDataStorageBoundaryError('symlink_unsupported');
  if (!entry.isDirectory()) throw new LocalDataStorageBoundaryError('not_directory');
  if (privateDirectory && (entry.uid !== process.geteuid!() || (entry.mode & 0o777) !== 0o700)) {
    throw new LocalDataStorageBoundaryError('permissions_unsafe');
  }
  return entry;
}

async function inspectDirectoryTree(directory: string, protectAncestors: boolean): Promise<string> {
  const normalized = path.resolve(directory);
  const filesystemRoot = path.parse(normalized).root;
  if (!path.isAbsolute(directory) || directory.includes('\0') || normalized === filesystemRoot) {
    throw new LocalDataStorageBoundaryError('unsafe_path');
  }
  let current = filesystemRoot;
  for (const segment of path.relative(filesystemRoot, normalized).split(path.sep)) {
    current = path.join(current, segment);
    const entry = await inspectDirectory(current);
    if (protectAncestors) {
      // Only the service and root may own ancestors. Sticky /tmp is allowed;
      // an untrusted same-UID process or mount administrator is outside this boundary.
      if (
        (entry.uid !== 0 && entry.uid !== process.geteuid!()) ||
        ((entry.mode & 0o022) !== 0 && (entry.mode & 0o1000) === 0)
      ) {
        throw new LocalDataStorageBoundaryError('permissions_unsafe');
      }
    }
  }
  const resolved = await realpath(normalized);
  if (resolved !== normalized) throw new LocalDataStorageBoundaryError('unsafe_path');
  return resolved;
}

/** Operator-provisioned roots must exist. Disabled mode performs no filesystem calls. */
export async function validateDuckDbLocalDataRoots(
  configuration: LocalDataConfiguration
): Promise<void> {
  if (configuration.kind === 'disabled') return;
  if (process.platform === 'win32' || typeof process.geteuid !== 'function') {
    throw new LocalDataStorageBoundaryError('unsupported_platform');
  }
  try {
    const root = await inspectDirectoryTree(configuration.root, true);
    const authoring = await inspectDirectoryTree(configuration.workspaceFilesRoot, false);
    if (isContained(root, authoring) || isContained(authoring, root)) {
      throw new LocalDataStorageBoundaryError('unsafe_path');
    }
    await inspectDirectory(root, true);
  } catch (error) {
    rejectIo(error);
  }
}

async function ensurePrivateDirectory(directory: string): Promise<void> {
  try {
    // Never recursively create through an unchecked ancestor or chmod an existing entry.
    await mkdir(directory, { mode: 0o700 });
  } catch (error) {
    if (!hasCode(error, 'EEXIST')) throw error;
  }
  await inspectDirectory(directory, true);
  if ((await realpath(directory)) !== directory) {
    throw new LocalDataStorageBoundaryError('unsafe_path');
  }
}

async function inspectDatabaseEntry(filename: string): Promise<void> {
  try {
    const entry = await lstat(filename);
    if (entry.isSymbolicLink()) throw new LocalDataStorageBoundaryError('symlink_unsupported');
    if (!entry.isFile() || entry.nlink !== 1 || entry.uid !== process.geteuid!()) {
      throw new LocalDataStorageBoundaryError('unsafe_file');
    }
  } catch (error) {
    if (!hasCode(error, 'ENOENT')) throw error;
  }
}

/** Call only after scope authorization, immediately before a native open; never cache as a lease. */
export async function prepareDuckDbWorkspacePaths(
  configuration: LocalDataConfiguration,
  scope: WorkspaceStorageScope
): Promise<DuckDbWorkspacePaths | null> {
  if (configuration.kind === 'disabled') return null;
  let directory: string;
  try {
    directory = resolveWorkspaceScopeStorageRoot(configuration.root, scope);
  } catch {
    throw new LocalDataStorageBoundaryError('invalid_scope');
  }
  await validateDuckDbLocalDataRoots(configuration);
  try {
    await ensurePrivateDirectory(path.dirname(directory));
    await ensurePrivateDirectory(directory);
    const database = path.join(directory, 'workspace.duckdb');
    await inspectDatabaseEntry(database);
    await inspectDatabaseEntry(`${database}.wal`);
    const temporary = path.join(directory, 'temp');
    await ensurePrivateDirectory(temporary);
    // Detect changed paths at this boundary; the native open must still handle races/errors.
    await validateDuckDbLocalDataRoots(configuration);
    return Object.freeze({ directory, database, temporary });
  } catch (error) {
    rejectIo(error);
  }
}
