import { lstat, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

import { WorkspaceRelativeProjectRootSchema } from '@dvt/contracts';

import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import { resolveWorkspaceScopeStorageRoot } from '../workspaceFiles/workspaceScopeStoragePath.js';

export type DbtProjectBoundaryFailure = 'not_found' | 'path_unsafe' | 'symlink_unsupported';

export class DbtProjectBoundaryError extends Error {
  public constructor(readonly reason: DbtProjectBoundaryFailure) {
    super(`dbt project workspace boundary rejected the root: ${reason}`);
    this.name = 'DbtProjectBoundaryError';
  }
}

export async function resolveDbtProjectDirectory(input: {
  readonly workspaceFilesRoot: string;
  readonly scope: WorkspaceStorageScope;
  readonly projectRoot: string;
}): Promise<string> {
  const parsedRoot = WorkspaceRelativeProjectRootSchema.safeParse(input.projectRoot);
  if (!parsedRoot.success) {
    throw new DbtProjectBoundaryError('path_unsafe');
  }

  const scopeRoot = resolveWorkspaceScopeStorageRoot(input.workspaceFilesRoot, input.scope);
  const segments = parsedRoot.data === '.' ? [] : parsedRoot.data.split('/');
  const requestedDirectory = path.resolve(scopeRoot, ...segments);
  assertContained(scopeRoot, requestedDirectory);

  try {
    let current = scopeRoot;
    for (const segment of segments) {
      current = path.join(current, segment);
      if ((await lstat(current)).isSymbolicLink()) {
        throw new DbtProjectBoundaryError('symlink_unsupported');
      }
    }

    const [realScopeRoot, realProjectDirectory] = await Promise.all([
      realpath(scopeRoot),
      realpath(requestedDirectory),
    ]);
    assertContained(realScopeRoot, realProjectDirectory);
    if (!(await stat(path.join(realProjectDirectory, 'dbt_project.yml'))).isFile()) {
      throw new DbtProjectBoundaryError('not_found');
    }
    return realProjectDirectory;
  } catch (error) {
    if (error instanceof DbtProjectBoundaryError) throw error;
    throw new DbtProjectBoundaryError('not_found');
  }
}

function assertContained(root: string, candidate: string): void {
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new DbtProjectBoundaryError('path_unsafe');
  }
}
