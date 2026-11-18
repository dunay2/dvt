/** Read only direct, visible workspace files, in bounded memory with a scope-bound cursor. */
import { lstat, opendir } from 'node:fs/promises';
import path from 'node:path';

import {
  WORKSPACE_DIRECTORY_PAGE_SIZE,
  WorkspaceRelativeProjectRootSchema,
  type WorkspaceDirectoryPage,
  type WorkspaceDirectoryRequest,
} from '@dvt/contracts';

import {
  InvalidWorkspacePathError,
  type WorkspaceStorageScope,
} from '../../application/ports/workspaceFiles.js';

import {
  buildWorkspaceScopeStorageKey,
  excludedWorkspaceNames,
  isAllowedWorkspaceFileName,
  resolveWorkspaceScopeStorageRoot,
} from './workspaceScopeStoragePath.js';

function readContinuation(request: WorkspaceDirectoryRequest, scopeKey: string): string {
  if (request.cursor == null) return '';
  if (request.cursor.length > 4096) throw new InvalidWorkspacePathError(request.directory);
  try {
    const bytes = Buffer.from(request.cursor, 'base64url');
    const state: unknown = JSON.parse(bytes.toString('utf8'));
    if (
      bytes.toString('base64url') === request.cursor &&
      Array.isArray(state) &&
      state.length === 3 &&
      state[0] === scopeKey &&
      state[1] === request.directory &&
      typeof state[2] === 'string' &&
      state[2] === path.basename(state[2]) &&
      isAllowedWorkspaceFileName(state[2])
    )
      return state[2];
  } catch {
    // Malformed continuations have the same public response as mismatched ones.
  }
  throw new InvalidWorkspacePathError(request.directory);
}

export async function readWorkspaceDirectoryPage(
  root: string,
  scope: WorkspaceStorageScope,
  request: WorkspaceDirectoryRequest
): Promise<WorkspaceDirectoryPage> {
  const { directory } = request;
  const valid = WorkspaceRelativeProjectRootSchema.safeParse(directory);
  if (
    !valid.success ||
    valid.data !== directory ||
    directory.length > 512 ||
    directory
      .split('/')
      .some(
        (segment) =>
          segment.startsWith('.') ||
          /[. ]$|[<>|"*?]/u.test(segment) ||
          [...segment].some((character) => character.charCodeAt(0) < 32) ||
          excludedWorkspaceNames.has(segment.toLowerCase())
      )
  )
    throw new InvalidWorkspacePathError(directory);
  const scopeKey = buildWorkspaceScopeStorageKey(scope);
  const after = readContinuation(request, scopeKey);
  let parent = resolveWorkspaceScopeStorageRoot(root, scope);
  const names: string[] = [];
  try {
    for (const segment of ['', ...directory.split('/')]) {
      parent = path.join(parent, segment);
      const stat = await lstat(parent);
      if (!stat.isDirectory() || stat.isSymbolicLink())
        throw new InvalidWorkspacePathError(directory);
    }
    const dir = await opendir(parent);
    for await (const item of dir) {
      if (
        item.isFile() &&
        !item.name.startsWith('.') &&
        item.name > after &&
        isAllowedWorkspaceFileName(item.name)
      ) {
        names.push(item.name);
        if (names.length > 2 * WORKSPACE_DIRECTORY_PAGE_SIZE) {
          names.sort();
          names.length = WORKSPACE_DIRECTORY_PAGE_SIZE + 1;
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return { entries: [], nextCursor: null };
    throw error;
  }
  names.sort();
  const page = names.slice(0, WORKSPACE_DIRECTORY_PAGE_SIZE);
  const nextCursor =
    names.length > page.length
      ? Buffer.from(JSON.stringify([scopeKey, directory, page.at(-1)])).toString('base64url')
      : null;
  return { entries: page.map((name) => directory + '/' + name), nextCursor };
}
