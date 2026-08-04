/** Owned concern: render the accessible Canvas graph search control from a presentation model. */
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, type KeyboardEventHandler, type ReactNode } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasGraphSearchControlModel } from './useCanvasGraphSearchController';

type CanvasGraphSearchControlProps = Readonly<{
  model: CanvasGraphSearchControlModel;
  copy: CanvasViewCopy;
  onQueryChange: (query: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  onQueryKeyDown: KeyboardEventHandler<HTMLInputElement>;
}>;

export function CanvasGraphSearchControl({
  model,
  copy,
  onQueryChange,
  onPrevious,
  onNext,
  onClose,
  onKeyDown,
  onQueryKeyDown,
}: CanvasGraphSearchControlProps): JSX.Element | null {
  const inputId = useId();
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!model.open) {
      return;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.getElementById(inputId)?.focus();

    return () => {
      const restoreFocusTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (restoreFocusTarget?.isConnected) {
        restoreFocusTarget.focus();
      }
    };
  }, [inputId, model.open]);

  if (!model.open) {
    return null;
  }

  const canNavigate = model.status === 'matched';
  const resultStatus =
    model.status === 'matched'
      ? `${model.activeMatchPosition} / ${model.matchCount}`
      : model.status === 'no-match'
        ? copy.canvasGraphSearchNoResultsLabel
        : null;

  return (
    <section
      role="search"
      data-slot="canvas-graph-search-control"
      aria-label={copy.canvasGraphSearchLabel}
      className="bg-popover text-popover-foreground border-border absolute top-3 left-1/2 z-20 flex w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 items-center gap-1 rounded-lg border p-1.5 shadow-2xl backdrop-blur"
      onKeyDown={onKeyDown}
    >
      <Search className="text-muted-foreground ml-2 size-4 shrink-0" aria-hidden="true" />
      <Input
        id={inputId}
        type="search"
        value={model.query}
        aria-label={copy.canvasGraphSearchInputLabel}
        placeholder={copy.canvasGraphSearchPlaceholder}
        className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0"
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        onKeyDown={onQueryKeyDown}
      />
      {resultStatus == null ? null : (
        <output
          aria-live="polite"
          className="text-muted-foreground shrink-0 px-2 text-xs tabular-nums"
        >
          {resultStatus}
        </output>
      )}
      <TooltipProvider delayDuration={250}>
        <SearchAction
          label={copy.canvasGraphSearchPreviousLabel}
          disabled={!canNavigate}
          onClick={onPrevious}
        >
          <ChevronUp aria-hidden="true" />
        </SearchAction>
        <SearchAction
          label={copy.canvasGraphSearchNextLabel}
          disabled={!canNavigate}
          onClick={onNext}
        >
          <ChevronDown aria-hidden="true" />
        </SearchAction>
        <SearchAction label={copy.canvasGraphSearchCloseLabel} onClick={onClose}>
          <X aria-hidden="true" />
        </SearchAction>
      </TooltipProvider>
    </section>
  );
}

type SearchActionProps = Readonly<{
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}>;

function SearchAction({ label, disabled = false, onClick, children }: SearchActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-popover-foreground size-8"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export type { CanvasGraphSearchControlProps };
