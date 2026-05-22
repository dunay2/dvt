/** Owned concern: render selected-file history inside the Code workbench slot. */
import type { WorkspaceFileHistoryEntry } from '../../ports/workspace';
import { routeWorkbenchFieldClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { buildCodeFileHistoryDiffHref } from './codeFileHistoryModel';
import type { CodeViewCopy } from './codeViewCopy';

export type CodeFileHistoryPanelProps = Readonly<{
  copy: CodeViewCopy;
  selectedPath: string | undefined;
  entries: readonly WorkspaceFileHistoryEntry[];
  isLoading: boolean;
  error: Error | null;
}>;

export function CodeFileHistoryPanel({
  copy,
  entries,
  error,
  isLoading,
  selectedPath,
}: CodeFileHistoryPanelProps) {
  return (
    <aside className="flex h-full flex-col gap-3 p-4" aria-label={copy.historyTitle}>
      <div>
        <h2 className="text-sm font-semibold text-(--text-primary)">{copy.historyTitle}</h2>
        <p className="mt-1 text-xs text-(--text-muted)">{selectedPath ?? copy.historyNoFile}</p>
      </div>

      {selectedPath === undefined ? (
        <p className={routeWorkbenchFieldClassName}>{copy.historyNoFile}</p>
      ) : isLoading ? (
        <p className={routeWorkbenchFieldClassName}>{copy.historyLoadingMessage}</p>
      ) : error ? (
        <p className={routeWorkbenchFieldClassName}>{copy.historyErrorMessage}</p>
      ) : entries.length === 0 ? (
        <p className={routeWorkbenchFieldClassName}>{copy.historyEmptyMessage}</p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry) => (
            <li
              key={`${entry.commitSha}-${entry.path}`}
              className="rounded-md border border-(--border-subtle) bg-(--surface-panel) p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-(--text-primary)">
                    {entry.subject}
                  </p>
                  <p className="mt-1 text-xs text-(--text-muted)">
                    {entry.shortSha} - {entry.authorName}
                  </p>
                </div>
                <a
                  data-slot="code-file-history-open-diff"
                  className="shrink-0 text-xs font-medium text-(--status-info)"
                  href={buildCodeFileHistoryDiffHref(entry)}
                >
                  {copy.historyOpenDiffLabel}
                </a>
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
