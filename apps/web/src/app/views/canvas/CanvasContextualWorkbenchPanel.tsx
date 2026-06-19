/** Owned concern: render contextual Canvas workbench panels without replacing the graph. */
import type { ReactNode } from 'react';

const panelClassName =
  'flex min-h-0 w-[38rem] min-w-96 max-w-[42rem] flex-col border-l border-(--border-subtle) bg-(--surface-panel) shadow-2xl';
const headerClassName =
  'flex shrink-0 items-start justify-between gap-4 border-b border-(--border-subtle) px-4 py-3';
const titleClassName = 'text-sm font-semibold text-(--text-primary)';
const descriptionClassName = 'mt-1 text-xs leading-5 text-(--text-muted)';
const closeButtonClassName =
  'rounded border border-(--border-subtle) px-3 py-1 text-xs font-medium text-(--text-muted) hover:border-(--border-strong) hover:text-(--text-primary)';

export type CanvasContextualWorkbenchPanelProps = Readonly<{
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}>;

export function CanvasContextualWorkbenchPanel({
  title,
  description,
  onClose,
  children,
}: CanvasContextualWorkbenchPanelProps): JSX.Element {
  return (
    <aside data-slot="canvas-contextual-workbench" aria-label={title} className={panelClassName}>
      <div data-slot="canvas-contextual-workbench-header" className={headerClassName}>
        <div className="min-w-0">
          <h2 className={titleClassName}>{title}</h2>
          {description == null ? null : <p className={descriptionClassName}>{description}</p>}
        </div>
        <button
          type="button"
          className={closeButtonClassName}
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </aside>
  );
}
