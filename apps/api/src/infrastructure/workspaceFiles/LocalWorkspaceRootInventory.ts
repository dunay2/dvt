/** Owned concern: prove complete, bounded subtree membership beside scoped file mutation. */
import { isUtf8 } from 'node:buffer';
import { lstat, readFile, readdir, rmdir } from 'node:fs/promises';
import path from 'node:path';

import { WorkspaceRelativeProjectRootSchema } from '@dvt/contracts';

import {
  InvalidWorkspacePathError,
  type WorkspaceStorageScope,
} from '../../application/ports/workspaceFiles.js';

import { DEFAULT_LOCAL_WORKSPACE_FILE_BATCH_LIMITS } from './localWorkspaceFileBatchMutationModel.js';
import { resolveWorkspaceScopeStorageRoot } from './workspaceScopeStoragePath.js';

const MAX_DEPTH = 32;

function resolveRoot(root: string, scope: WorkspaceStorageScope, projectRoot: string): string {
  const parsed = WorkspaceRelativeProjectRootSchema.safeParse(projectRoot);
  if (!parsed.success || parsed.data !== projectRoot)
    throw new InvalidWorkspacePathError(projectRoot);
  return path.join(
    resolveWorkspaceScopeStorageRoot(root, scope),
    ...(projectRoot === '.' ? [] : projectRoot.split('/'))
  );
}

export async function readWorkspaceRootInventory(
  root: string,
  scope: WorkspaceStorageScope,
  projectRoot: string,
  maxFiles = 500
): Promise<Readonly<{ files: readonly string[]; directories: readonly string[] }>> {
  const absoluteRoot = resolveRoot(root, scope, projectRoot);
  const scopeRoot = resolveWorkspaceScopeStorageRoot(root, scope);
  const files: string[] = [];
  const directories: string[] = [];
  let entries = 0;
  let current = scopeRoot;
  for (const segment of projectRoot === '.' ? [] : projectRoot.split('/')) {
    current = path.join(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new InvalidWorkspacePathError(projectRoot);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { files, directories };
      throw error;
    }
  }
  const visit = async (absolute: string, relative: string, depth: number): Promise<void> => {
    if (depth > MAX_DEPTH) throw new InvalidWorkspacePathError(relative);
    directories.push(relative);
    for (const entry of await readdir(absolute, { withFileTypes: true })) {
      if (++entries > maxFiles * 4) throw new InvalidWorkspacePathError(projectRoot);
      const child = relative === '.' ? entry.name : `${relative}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new InvalidWorkspacePathError(child);
      if (entry.isDirectory()) await visit(path.join(absolute, entry.name), child, depth + 1);
      else if (entry.isFile()) {
        const absoluteFile = path.join(absolute, entry.name);
        if (
          (await lstat(absoluteFile)).size >
            DEFAULT_LOCAL_WORKSPACE_FILE_BATCH_LIMITS.maxFileBytes ||
          !isUtf8(await readFile(absoluteFile))
        )
          throw new InvalidWorkspacePathError(child);
        files.push(child);
        if (files.length > maxFiles) throw new InvalidWorkspacePathError(projectRoot);
      } else throw new InvalidWorkspacePathError(child);
    }
  };
  try {
    await visit(absoluteRoot, projectRoot, 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    throw new InvalidWorkspacePathError(projectRoot);
  }
  return { files: files.sort(), directories };
}

export class LocalWorkspaceRootInventory {
  public constructor(private readonly root: string) {}

  public async listFiles(
    scope: WorkspaceStorageScope,
    projectRoot: string
  ): Promise<readonly string[]> {
    return (await readWorkspaceRootInventory(this.root, scope, projectRoot)).files;
  }

  public async removeEmptyDirectories(
    scope: WorkspaceStorageScope,
    projectRoot: string
  ): Promise<boolean> {
    if (projectRoot === '.') throw new InvalidWorkspacePathError(projectRoot);
    const inventory = await readWorkspaceRootInventory(this.root, scope, projectRoot);
    if (inventory.files.length !== 0) return false;
    for (const directory of [...inventory.directories].reverse()) {
      try {
        await rmdir(resolveRoot(this.root, scope, directory));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ENOTEMPTY' || code === 'EEXIST') return false;
        if (code !== 'ENOENT') throw error;
      }
    }
    return true;
  }
}
