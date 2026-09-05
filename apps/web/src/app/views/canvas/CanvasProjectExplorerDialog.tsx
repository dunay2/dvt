/** Owned concern: render the contextual Canvas project explorer from route-owned project data. */
import { useMemo, useState } from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { ProjectCanvasDocument } from './canvasProjectCanvasLifecycle';
import { canvasViewCopy } from './copy';

type CanvasProjectExplorerDialogProps = Readonly<{
  open: boolean;
  activeCanvasId: string | null;
  canvasDocuments: readonly ProjectCanvasDocument[];
  onSelectCanvas?: (canvasId: string) => void;
  onClose: () => void;
  onRestoreFocus?: () => void;
}>;

function formatCanvasKind(kind: string): string {
  return kind === 'dbt' ? 'dbt' : canvasViewCopy.workspaceTransformationKindLabel;
}

export function CanvasProjectExplorerDialog({
  open,
  activeCanvasId,
  canvasDocuments,
  onSelectCanvas,
  onClose,
  onRestoreFocus,
}: CanvasProjectExplorerDialogProps): JSX.Element | null {
  const [query, setQuery] = useState('');
  useApplicationLanguageStore((state) => state.language);
  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return canvasDocuments;
    }

    return canvasDocuments.filter((canvasDocument) =>
      [canvasDocument.title, canvasDocument.kind, canvasDocument.environmentId, canvasDocument.id]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [canvasDocuments, query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        data-slot="canvas-project-explorer-dialog"
        closeLabel={canvasViewCopy.projectExplorerDismissLabel}
        onCloseAutoFocus={(event) => {
          if (onRestoreFocus) {
            event.preventDefault();
            onRestoreFocus();
          }
        }}
        className="max-h-[min(88vh,48rem)] max-w-4xl gap-0 overflow-hidden border-(--border-default) bg-(--surface-panel) p-0 text-(--text-default)"
      >
        <DialogHeader className="border-b border-(--border-muted) px-5 py-4 pr-12">
          <DialogTitle>{canvasViewCopy.projectExplorerTitle}</DialogTitle>
          <DialogDescription>{canvasViewCopy.projectExplorerDescription}</DialogDescription>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
            {canvasViewCopy.projectExplorerSearchLabel}
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              className="mt-2 w-full rounded border border-(--border-default) bg-(--surface-panel-subtle) px-3 py-2 text-sm font-normal normal-case tracking-normal text-(--text-default) outline-none focus:border-(--accent-default)"
              placeholder={canvasViewCopy.projectExplorerSearchPlaceholder}
            />
          </label>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto p-4">
          {filteredDocuments.length === 0 ? (
            <p className="rounded border border-(--border-muted) px-4 py-6 text-sm text-(--text-muted)">
              {canvasViewCopy.projectExplorerEmptyMessage}
            </p>
          ) : (
            <ul className="grid gap-2" aria-label={canvasViewCopy.projectExplorerListLabel}>
              {filteredDocuments.map((canvasDocument) => {
                const selected = canvasDocument.id === activeCanvasId;
                return (
                  <li
                    key={canvasDocument.id}
                    className="rounded border border-(--border-default) bg-(--surface-panel-subtle) p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-(--text-default)">
                          {canvasDocument.title}
                        </p>
                        <p className="mt-1 text-xs text-(--text-muted)">
                          {formatCanvasKind(canvasDocument.kind)} - {canvasDocument.environmentId}
                        </p>
                      </div>
                      {selected ? (
                        <span className="rounded border border-(--status-info) px-2 py-1 text-xs text-(--status-info)">
                          {canvasViewCopy.projectExplorerCurrentCanvasLabel}
                        </span>
                      ) : onSelectCanvas == null ? null : (
                        <button
                          type="button"
                          className="rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) hover:bg-(--surface-elevated)"
                          onClick={() => {
                            onSelectCanvas(canvasDocument.id);
                            onClose();
                          }}
                        >
                          {canvasViewCopy.projectExplorerOpenCanvasTemplate.replace(
                            '{title}',
                            canvasDocument.title
                          )}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DialogFooter className="border-t border-(--border-muted) bg-(--surface-panel-subtle) px-5 py-3">
          <DialogClose asChild>
            <button
              type="button"
              data-slot="canvas-project-explorer-close-command"
              className="rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) hover:bg-(--surface-elevated)"
            >
              {canvasViewCopy.projectExplorerCloseLabel}
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
