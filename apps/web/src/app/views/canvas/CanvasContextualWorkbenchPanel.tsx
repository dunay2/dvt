/** Owned concern: render contextual Canvas workbench panels without replacing the graph. */
import { CircleHelp, X } from 'lucide-react';
import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

const panelClassName =
  'flex min-h-0 w-full min-w-0 max-w-full flex-col border-l border-(--border-subtle) bg-(--surface-panel) shadow-2xl sm:w-[38rem] sm:max-w-[42rem]';
const headerClassName =
  'flex shrink-0 items-start justify-between gap-3 border-b border-(--border-subtle) px-4 py-3';
const titleClassName = 'text-sm font-semibold text-(--text-primary)';
const dragHandleClassName =
  'min-w-0 flex-1 cursor-move select-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)';
const closeButtonClassName =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded border border-(--border-subtle) text-(--text-muted) hover:border-(--border-strong) hover:text-(--text-primary)';

export type CanvasContextualWorkbenchPanelProps = Readonly<{
  title: string;
  closeLabel: string;
  description?: string;
  dragHandleProps?: Pick<HTMLAttributes<HTMLDivElement>, 'onKeyDown' | 'onPointerDown'>;
  moveLabel: string;
  onClose: () => void;
  children: ReactNode;
  autoFocus?: boolean;
}>;

export function CanvasContextualWorkbenchPanel({
  title,
  closeLabel,
  description,
  dragHandleProps,
  moveLabel,
  onClose,
  children,
  autoFocus = false,
}: CanvasContextualWorkbenchPanelProps): JSX.Element {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (autoFocus) closeRef.current?.focus({ preventScroll: true });
  }, [autoFocus, title]);
  return (
    <aside
      data-slot="canvas-contextual-workbench"
      aria-label={title}
      className={panelClassName}
      onKeyDown={(event) => {
        if (autoFocus && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div data-slot="canvas-contextual-workbench-header" className={headerClassName}>
        <div
          {...dragHandleProps}
          data-slot="canvas-contextual-workbench-drag-handle"
          role={dragHandleProps == null ? undefined : 'button'}
          tabIndex={dragHandleProps == null ? undefined : 0}
          aria-label={dragHandleProps == null ? undefined : moveLabel}
          className={dragHandleProps == null ? 'min-w-0 flex-1' : dragHandleClassName}
        >
          <h2 className={titleClassName}>{title}</h2>
        </div>
        <TooltipProvider delayDuration={250}>
          {description == null ? null : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-slot="canvas-contextual-workbench-help"
                  className={closeButtonClassName}
                  aria-label={description}
                >
                  <CircleHelp className="size-4" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{description}</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-slot="canvas-contextual-workbench-close"
                ref={closeRef}
                className={closeButtonClassName}
                aria-label={`${closeLabel}: ${title}`}
                onClick={onClose}
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">{closeLabel}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{closeLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </aside>
  );
}
