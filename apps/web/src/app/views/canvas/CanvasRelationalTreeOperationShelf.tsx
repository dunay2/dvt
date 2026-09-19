/** Owned concern: keep admitted operation tools visible without another editing surface. */
import { ChevronDown, Shapes } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { DvtRelationalOperationChooser } from './DvtRelationalOperationChooser';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { CanvasRelationalCrossNotice } from './CanvasRelationalCrossNotice';

export function CanvasRelationalTreeOperationShelf({
  choices,
  copy,
  hasOperands,
  operation,
  selectedInputCount,
  onSelectOperation,
  children,
}: Readonly<{
  choices: readonly CanvasRelationalOperationChoice[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  hasOperands: boolean;
  operation: CanvasRelationalOperation | null;
  selectedInputCount: number;
  onSelectOperation: (operation: CanvasRelationalOperation) => void;
  children?: ReactNode;
}>): JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const [replacement, setReplacement] = useState<CanvasRelationalOperation | null>(null);
  const language = useApplicationLanguageStore((state) => state.language);
  const localCopy = resolveCanvasSemanticEditorCopy(language);
  return (
    <section
      data-slot="canvas-relational-tree-operation-shelf"
      className="shrink-0 border-b border-(--border-subtle) bg-(--surface-panel)"
    >
      <div className="flex min-h-11 flex-wrap items-center gap-2 px-3 py-1.5">
        <button
          type="button"
          data-slot="canvas-relational-tree-operation-shelf-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="flex items-center gap-2 rounded px-2 py-1 text-sm font-medium text-(--text-strong) hover:bg-(--surface-selected)"
        >
          <Shapes aria-hidden="true" className="size-4 text-(--status-info)" />
          {localCopy.operations}
          <ChevronDown aria-hidden="true" className={`size-4 ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {!expanded ? null : choices.length > 0 ? (
          <DvtRelationalOperationChooser
            choices={choices}
            copy={copy}
            layout="shelf"
            selectedOperation={operation}
            onSelect={(next) => {
              if (next === operation) return;
              if (operation != null) setReplacement(next);
              else onSelectOperation(next);
            }}
          />
        ) : (
          <span className="text-xs text-(--text-muted)">
            {!hasOperands
              ? copy.relationalTreeSelectFirstSourceMessage
              : selectedInputCount === 1
                ? copy.relationalTreeSelectNextSourceMessage
                : copy.relationalTreeSelectOperationMessage}
          </span>
        )}
        {expanded && choices.length > 0 && selectedInputCount === 1 ? (
          <span className="text-xs text-(--text-muted)">
            {copy.relationalTreeSelectNextSourceMessage}
          </span>
        ) : null}
        {expanded ? children : null}
        {operation === 'cross_join' ? <CanvasRelationalCrossNotice /> : null}
      </div>
      <AlertDialog
        open={replacement != null}
        onOpenChange={(open) => {
          if (!open) setReplacement(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{localCopy.replaceOperation}</AlertDialogTitle>
            <AlertDialogDescription>
              {operation === 'projection'
                ? localCopy.replaceProjectionHint
                : localCopy.replaceOperationHint}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.inspectorDvtRelationalCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (replacement != null) onSelectOperation(replacement);
                setReplacement(null);
              }}
            >
              {copy.inspectorDvtRelationalApply}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
