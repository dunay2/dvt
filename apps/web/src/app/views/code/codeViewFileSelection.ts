/** Owned concern: project workspace file trees into Code route file-selection state. */
import type { WorkspaceFileEntry } from '../../ports/workspace';

function flattenCodeWorkspaceFiles(entries: readonly WorkspaceFileEntry[]): WorkspaceFileEntry[] {
  return entries.flatMap((entry) => {
    if (entry.kind === 'file') {
      return [entry];
    }

    if (entry.children) {
      return flattenCodeWorkspaceFiles(entry.children);
    }

    return [];
  });
}

export function resolveInitialCodeFilePath(
  entries: readonly WorkspaceFileEntry[]
): string | undefined {
  return flattenCodeWorkspaceFiles(entries)[0]?.path;
}

export function hasCodeWorkspaceFiles(entries: readonly WorkspaceFileEntry[]): boolean {
  return resolveInitialCodeFilePath(entries) !== undefined;
}
