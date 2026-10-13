/**
 * Owned concern: render accessible Canvas graph search from its UI binding and separate localized copy.
 * @baseline GH-3634: control-owned appearance belongs to its stylesheet, not JSX utility strings.
 * @decision Keep semantic CSS classes separate from bindings, focus restoration and primitive behavior.
 * @consequence Search interaction and accessibility remain unchanged while appearance has one owner.
 * @version 1.0.0
 */
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasGraphSearchControlBinding } from './canvasGraphSearchControl.binding';
import styles from './CanvasGraphSearchControl.module.css';

type CanvasGraphSearchControlProps = Readonly<{
  binding: CanvasGraphSearchControlBinding;
  copy: CanvasViewCopy;
}>;

export function CanvasGraphSearchControl({
  binding,
  copy,
}: CanvasGraphSearchControlProps): JSX.Element | null {
  const { model } = binding;
  const inputId = useId();
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!model.open) {
      return;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    return () => {
      const restoreFocusTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (restoreFocusTarget?.isConnected) {
        restoreFocusTarget.focus();
      }
    };
  }, [inputId, model.open]);

  useEffect(() => {
    if (model.open) {
      document.getElementById(inputId)?.focus();
    }
  }, [inputId, model.focusRequestId, model.open]);

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
      className={styles.control}
      onKeyDown={binding.onControlKeyDown}
    >
      <Search className={styles.searchIcon} aria-hidden="true" />
      <Input
        id={inputId}
        type="search"
        value={model.query}
        aria-label={copy.canvasGraphSearchInputLabel}
        placeholder={copy.canvasGraphSearchPlaceholder}
        className={styles.queryInput}
        onChange={(event) => binding.setQuery(event.currentTarget.value)}
        onKeyDown={binding.onQueryKeyDown}
      />
      {resultStatus == null ? null : (
        <output aria-live="polite" className={styles.status}>
          {resultStatus}
        </output>
      )}
      <TooltipProvider delayDuration={250}>
        <SearchAction
          label={copy.canvasGraphSearchPreviousLabel}
          disabled={!canNavigate}
          onClick={binding.showPrevious}
        >
          <ChevronUp aria-hidden="true" />
        </SearchAction>
        <SearchAction
          label={copy.canvasGraphSearchNextLabel}
          disabled={!canNavigate}
          onClick={binding.showNext}
        >
          <ChevronDown aria-hidden="true" />
        </SearchAction>
        <SearchAction label={copy.canvasGraphSearchCloseLabel} onClick={binding.close}>
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
          className={styles.actionButton}
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
