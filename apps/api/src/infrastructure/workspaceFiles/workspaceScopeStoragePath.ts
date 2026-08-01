import { createHash } from 'node:crypto';
import path from 'node:path';

import {
  InvalidWorkspacePathError,
  type WorkspaceStorageScope,
} from '../../application/ports/workspaceFiles.js';

const SCOPE_STORAGE_DIRECTORY = 'scopes';
const ALLOWED_WORKSPACE_FILE_EXTENSIONS = new Set([
  '.cjs',
  '.csv',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

export function buildWorkspaceScopeStorageKey(scope: WorkspaceStorageScope): string {
  const identity = [scope.tenantId, scope.projectId, scope.environmentId]
    .map((value) => {
      if (value.trim().length === 0) {
        throw new Error('Workspace storage scope identifiers must be non-empty.');
      }
      return `${Buffer.byteLength(value, 'utf8')}:${value}`;
    })
    .join('|');

  return createHash('sha256').update(identity, 'utf8').digest('hex');
}

export function resolveWorkspaceScopeStorageRoot(
  namespaceRoot: string,
  scope: WorkspaceStorageScope
): string {
  const resolvedNamespaceRoot = path.resolve(namespaceRoot);
  const scopeRoot = path.resolve(
    resolvedNamespaceRoot,
    SCOPE_STORAGE_DIRECTORY,
    buildWorkspaceScopeStorageKey(scope)
  );
  const relativeScopeRoot = path.relative(resolvedNamespaceRoot, scopeRoot);
  if (relativeScopeRoot.startsWith('..') || path.isAbsolute(relativeScopeRoot)) {
    throw new Error('Workspace scope storage root escaped its configured namespace.');
  }

  return scopeRoot;
}

export function resolveWorkspaceScopeMutationLockKey(
  namespaceRoot: string,
  scope: WorkspaceStorageScope
): string {
  return resolveWorkspaceScopeStorageRoot(namespaceRoot, scope);
}

export function resolveWorkspaceFileStoragePath(
  namespaceRoot: string,
  scope: WorkspaceStorageScope,
  requestPath: string
): Readonly<{
  absolutePath: string;
  workspacePath: string;
}> {
  const scopeRoot = resolveWorkspaceScopeStorageRoot(namespaceRoot, scope);
  let workspacePath: string;
  try {
    workspacePath = decodeURIComponent(requestPath).replaceAll('\\', '/').trim();
  } catch {
    throw new InvalidWorkspacePathError(requestPath);
  }
  const segments = workspacePath.split('/');
  if (
    workspacePath.length === 0 ||
    workspacePath.startsWith('/') ||
    segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..') ||
    !isAllowedWorkspaceFileName(path.basename(workspacePath))
  ) {
    throw new InvalidWorkspacePathError(requestPath);
  }

  const absolutePath = path.resolve(scopeRoot, workspacePath);
  const relativePath = path.relative(scopeRoot, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new InvalidWorkspacePathError(requestPath);
  }

  return { absolutePath, workspacePath };
}

export function isAllowedWorkspaceFileName(fileName: string): boolean {
  return ALLOWED_WORKSPACE_FILE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}
