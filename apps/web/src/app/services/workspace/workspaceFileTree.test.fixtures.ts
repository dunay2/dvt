import type { WorkspaceFileEntry } from '../../ports/workspace';

export function flattenWorkspaceEntries(entries: readonly WorkspaceFileEntry[]): string[] {
  return entries.flatMap((entry) => [
    entry.path,
    ...(entry.children ? flattenWorkspaceEntries(entry.children) : []),
  ]);
}
