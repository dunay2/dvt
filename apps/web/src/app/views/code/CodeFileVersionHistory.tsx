/** Owned concern: list version commits and compare or recover the selected file revision. */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sha256HexUtf8 } from '@dvt/crypto';
import { GitCommitHorizontal } from 'lucide-react';
import { useRef, useState, type RefObject } from 'react';
import { MonacoDiffViewer } from '../../components/monaco/MonacoDiffViewer';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useWorkspaceFileVersionQueries } from '../../queries/workspaceQueries';
import { useWorkspaceFileVersionCommandPort } from '../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CodeViewCopy } from './codeViewCopy';
import styles from './CodeFileVersionHistory.module.css';

export function CodeFileVersionHistory({
  copy,
  path,
  language,
  value,
  synchronized,
  onRestore,
}: Readonly<{
  copy: CodeViewCopy;
  path: string;
  language: string;
  value: string;
  synchronized: boolean;
  onRestore: (value: string) => void;
}>): JSX.Element {
  const [selected, setSelected] = useState<string>();
  const opener = useRef<HTMLButtonElement | null>(null);
  const locale = useApplicationLanguageStore((state) => state.language);
  const { pages, version, historyKey, scope } = useWorkspaceFileVersionQueries(path, selected);
  const command = useWorkspaceFileVersionCommandPort();
  const cache = useQueryClient();
  const commit = useMutation({
    mutationFn: (digest: string) => command.commitFileVersion(path, digest, scope),
    onSuccess: () => cache.invalidateQueries({ queryKey: historyKey }),
  });
  const comparison = version.data;
  const canSaveVersion = synchronized && !commit.isPending;
  const canRestore = canSaveVersion && comparison != null && value !== comparison.content;

  function restore(): void {
    if (comparison == null || !canRestore) return;
    onRestore(comparison.content);
    setSelected(undefined);
  }

  return (
    <section
      aria-label={copy.versionDialogTitle}
      className={styles.history}
      data-slot="code-file-version-history"
    >
      <h3 className={styles.heading}>{copy.versionDialogTitle}</h3>
      <CodeFileVersionTimeline
        copy={copy}
        locale={locale}
        pages={pages}
        onSelect={(commitSha, trigger) => {
          opener.current = trigger;
          setSelected(commitSha);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canSaveVersion}
        onClick={() => commit.mutate(sha256HexUtf8(value))}
      >
        {copy.versionSave}
      </Button>
      {commit.isError && <p role="alert">{copy.versionSaveError}</p>}
      {commit.isSuccess && <p role="status">{copy.versionSaved}</p>}

      <CodeFileVersionComparison
        copy={copy}
        path={path}
        language={language}
        value={value}
        selected={selected}
        version={version}
        opener={opener}
        canRestore={canRestore}
        onClose={() => setSelected(undefined)}
        onRestore={restore}
      />
    </section>
  );
}

function CodeFileVersionTimeline({
  copy,
  locale,
  pages,
  onSelect,
}: Readonly<{
  copy: CodeViewCopy;
  locale: string;
  pages: ReturnType<typeof useWorkspaceFileVersionQueries>['pages'];
  onSelect: (commitSha: string, trigger: HTMLButtonElement) => void;
}>): JSX.Element {
  const entries = pages.data?.pages.flat() ?? [];
  return (
    <>
      {pages.isPending && <p role="status">{copy.historyLoadingMessage}</p>}
      {pages.isError && <p role="alert">{copy.historyErrorMessage}</p>}
      {pages.isSuccess && entries.length === 0 && <p>{copy.historyEmptyMessage}</p>}
      <ol className={styles.timeline}>
        {entries.map((entry) => (
          <li key={entry.commitSha}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={styles.version}
              aria-haspopup="dialog"
              onClick={(event) => onSelect(entry.commitSha, event.currentTarget)}
            >
              <GitCommitHorizontal aria-hidden="true" className={styles.glyph} />
              <span className={styles.details}>
                <span className={styles.subject}>{entry.subject}</span>
                <code>{entry.shortSha}</code> · {entry.authorName}
                <time dateTime={entry.authoredAt}>
                  {new Date(entry.authoredAt).toLocaleString(locale)}
                </time>
              </span>
            </Button>
          </li>
        ))}
      </ol>
      {pages.hasNextPage && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pages.isFetching}
          onClick={() => void pages.fetchNextPage()}
        >
          {copy.versionLoadMore}
        </Button>
      )}
    </>
  );
}

function CodeFileVersionComparison({
  copy,
  path,
  language,
  value,
  selected,
  version,
  opener,
  canRestore,
  onClose,
  onRestore,
}: Readonly<{
  copy: CodeViewCopy;
  path: string;
  language: string;
  value: string;
  selected?: string;
  version: Pick<
    ReturnType<typeof useWorkspaceFileVersionQueries>['version'],
    'data' | 'isPending' | 'isError'
  >;
  opener: RefObject<HTMLButtonElement | null>;
  canRestore: boolean;
  onClose: () => void;
  onRestore: () => void;
}>): JSX.Element {
  const comparison = version.data;
  return (
    <Dialog
      open={selected !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-5xl"
        closeLabel={copy.versionClose}
        onCloseAutoFocus={(event) => {
          if (!opener.current?.isConnected) return;
          event.preventDefault();
          opener.current.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{copy.versionCompareTitle}</DialogTitle>
          <DialogDescription>
            {path} · {selected?.slice(0, 12)}
          </DialogDescription>
        </DialogHeader>
        {version.isPending && <p role="status">{copy.historyLoadingMessage}</p>}
        {version.isError && <p role="alert">{copy.versionReadError}</p>}
        {comparison && (
          <MonacoDiffViewer
            containerClassName={styles.diff}
            language={language}
            original={comparison.content}
            originalLabel={comparison.commitSha.slice(0, 12)}
            modified={value}
            modifiedLabel={copy.versionCurrent}
            loadingLabel={copy.historyLoadingMessage}
          />
        )}
        <DialogFooter>
          <Button type="button" size="sm" disabled={!canRestore} onClick={onRestore}>
            {copy.versionRestore}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
