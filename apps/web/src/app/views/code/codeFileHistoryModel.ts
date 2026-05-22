/** Owned concern: project file-history entries into Code -> Diff handoff links. */
import type { WorkspaceFileHistoryEntry } from '../../ports/workspace';

export function buildCodeFileHistoryDiffHref(entry: WorkspaceFileHistoryEntry): string {
  const query = new URLSearchParams({
    file: entry.path,
    revision: entry.commitSha,
  });
  return `/diff?${query.toString()}`;
}
