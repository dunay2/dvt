import { createHash } from 'node:crypto';
import path from 'node:path';

import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';

const SCOPE_STORAGE_DIRECTORY = 'scopes';

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
