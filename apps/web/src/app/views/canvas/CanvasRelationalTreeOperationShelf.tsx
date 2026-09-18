/** Owned concern: expose admitted operations in one collapsible relational-canvas toolbox. */
import { ChevronDown } from 'lucide-react';
import { CanvasRelationalJoinIcon } from './CanvasRelationalJoinIcon';
import { useState } from 'react';

import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { DvtRelationalOperationChooser } from './DvtRelationalOperationChooser';

export function CanvasRelationalTreeOperationShelf({
  choices,
  copy,
  hasOperands,
  operation,
  selectedInputCount,
  onSelectOperation,
}: Readonly<{
  choices: readonly CanvasRelationalOperationChoice[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  hasOperands: boolean;
  operation: CanvasRelationalOperation | null;
  selectedInputCount: number;
  onSelectOperation: (operation: CanvasRelationalOperation) => void;
}>): JSX.Element {
  const [expanded, setExpanded] = useState(true);

  return (
    <section
      data-slot="canvas-relational-tree-operation-shelf"
      className="shrink-0 border-b border-(--border-subtle) bg-(--surface-panel)"
    >
      <div className="flex min-h-11 items-center gap-3 px-3 py-2">
        <button
          type="button"
          data-slot="canvas-relational-tree-operation-shelf-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="flex min-w-0 items-center gap-2 rounded px-1 py-1 text-left text-(--text-primary) hover:bg-(--surface-subtle)"
        >
          <CanvasRelationalJoinIcon className="size-4 shrink-0 text-(--status-info)" />
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide">
            {copy.inspectorDvtRelationalOperationTitle}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        {!hasOperands ? (
          <span className="text-[10px] text-(--text-muted)">
            {copy.relationalTreeSelectFirstSourceMessage}
          </span>
        ) : operation == null && selectedInputCount === 1 ? (
          <span className="text-[10px] text-(--text-muted)">
            {copy.relationalTreeSelectNextSourceMessage}
          </span>
        ) : null}
      </div>
      {!expanded ? null : (
        <div className="border-t border-(--border-subtle) px-3 py-2">
          {choices.length === 0 ? (
            <p className="text-[10px] text-(--text-muted)">
              {hasOperands
                ? copy.relationalTreeSelectNextSourceMessage
                : copy.relationalTreeSelectFirstSourceMessage}
            </p>
          ) : (
            <DvtRelationalOperationChooser
              choices={choices}
              copy={copy}
              layout="shelf"
              selectedOperation={operation}
              onSelect={onSelectOperation}
            />
          )}
        </div>
      )}
    </section>
  );
}
