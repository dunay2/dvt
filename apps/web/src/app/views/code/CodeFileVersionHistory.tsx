/** Owned concern: list version commits and compare or recover the selected file revision. */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sha256HexUtf8 } from '@dvt/crypto';
import { GitCommitHorizontal } from 'lucide-react';
import { useRef, useState } from 'react';
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
  const opener = useRef<HTMLButtonElement>(null);
  const locale = useApplicationLanguageStore((state) => state.language);
  const { pages, version, historyKey, scope } = useWorkspaceFileVersionQueries(path, selected);
  const command = useWorkspaceFileVersionCommandPort();
  const cache = useQueryClient();
  const commit = useMutation({
    mutationFn: (digest: string) => command.commitFileVersion(path, digest, scope),
    onSuccess: () => cache.invalidateQueries({ queryKey: historyKey }),
  });
  const entries = pages.data?.pages.flat() ?? [];
  const comparison = version.data;

  function restore(): void {
    if (!comparison || !synchronized || commit.isPending) return;
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
              onClick={(event) => {
                opener.current = event.currentTarget;
                setSelected(entry.commitSha);
              }}
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!synchronized || commit.isPending}
        onClick={() => commit.mutate(sha256HexUtf8(value))}
      >
        {copy.versionSave}
      </Button>
      {commit.isError && <p role="alert">{copy.versionSaveError}</p>}
      {commit.isSuccess && <p role="status">{copy.versionSaved}</p>}

      <Dialog
        open={selected !== undefined}
        onOpenChange={(open) => {
          if (!open) setSelected(undefined);
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
            <Button
              type="button"
              size="sm"
              disabled={
                !comparison || !synchronized || commit.isPending || value === comparison.content
              }
              onClick={restore}
            >
              {copy.versionRestore}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
