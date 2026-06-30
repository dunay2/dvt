/** Owned concern: render the contextual Canvas project explorer from route-owned project data. */
import { useMemo, useState } from 'react';

import type { ProjectCanvasDocument } from './canvasProjectCanvasLifecycle';

type CanvasProjectExplorerDialogProps = Readonly<{
  open: boolean;
  activeCanvasId: string | null;
  canvasDocuments: readonly ProjectCanvasDocument[];
  onSelectCanvas: (canvasId: string) => void;
  onClose: () => void;
}>;

function formatCanvasKind(kind: string): string {
  return kind === 'dbt' ? 'dbt' : 'Transformation';
}

export function CanvasProjectExplorerDialog({
  open,
  activeCanvasId,
  canvasDocuments,
  onSelectCanvas,
  onClose,
}: CanvasProjectExplorerDialogProps): JSX.Element | null {
  const [query, setQuery] = useState('');
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

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Explore project"
      data-slot="canvas-project-explorer-dialog"
      className="absolute inset-0 z-40 flex items-start justify-center bg-black/40 p-8"
    >
      <section className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-md border border-(--border-default) bg-(--surface-panel) shadow-2xl">
        <header className="border-b border-(--border-muted) px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-(--text-default)">Explore project</h2>
              <p className="mt-1 text-sm text-(--text-muted)">
                Open another governed canvas without mounting a permanent project rail.
              </p>
            </div>
            <button
              type="button"
              className="rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) hover:bg-(--surface-elevated)"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
            Search canvases
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              className="mt-2 w-full rounded border border-(--border-default) bg-(--surface-panel-subtle) px-3 py-2 text-sm font-normal normal-case tracking-normal text-(--text-default) outline-none focus:border-(--accent-default)"
              placeholder="Search by canvas, kind, environment, or id"
            />
          </label>
        </header>
        <div className="min-h-0 overflow-y-auto p-4">
          {filteredDocuments.length === 0 ? (
            <p className="rounded border border-(--border-muted) px-4 py-6 text-sm text-(--text-muted)">
              No canvas documents match this search.
            </p>
          ) : (
            <ul className="grid gap-2" aria-label="Project canvases">
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
                          Current
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) hover:bg-(--surface-elevated)"
                          onClick={() => {
                            onSelectCanvas(canvasDocument.id);
                            onClose();
                          }}
                        >
                          Open {canvasDocument.title}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
