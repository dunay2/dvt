/** Owned concern: select and configure one draft relational operation behind Apply/Cancel. */
import { GitMerge } from 'lucide-react';

import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import {
  canvasRelationalOperationLabel,
  DvtRelationalOperationChooser,
} from './DvtRelationalOperationChooser';

export function CanvasRelationalTreeOperationPanel({
  appendInput,
  choices,
  copy,
  joinDraft,
  operation,
  selectedInputIds,
  onAppendJoinInput,
  onApply,
  onCancel,
  onChangeJoinDraft,
  onSelectOperation,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  choices: readonly CanvasRelationalOperationChoice[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  joinDraft: DvtSubstraitInnerJoinDraft | null;
  operation: CanvasRelationalOperation | null;
  selectedInputIds: readonly string[];
  onAppendJoinInput: (
    selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => void;
  onApply: () => void;
  onCancel: () => void;
  onChangeJoinDraft: (draft: DvtSubstraitInnerJoinDraft) => void;
  onSelectOperation: (operation: CanvasRelationalOperation) => void;
}>): JSX.Element {
  const ready =
    (operation === 'projection' && selectedInputIds.length === 1) ||
    (operation === 'inner_join' && joinDraft != null) ||
    (operation === 'union_all' && selectedInputIds.length >= 2);
  const hasOperands = selectedInputIds.length > 0;

  return (
    <aside
      data-slot="canvas-relational-tree-operation-panel"
      className="min-h-0 overflow-auto border-t border-(--border-subtle) bg-(--surface-panel) p-4 md:border-t-0 md:border-l"
    >
      <header className="flex items-center gap-2 border-b border-(--border-subtle) pb-3">
        <GitMerge aria-hidden="true" className="size-4 text-(--status-info)" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-(--text-primary)">
          {operation == null
            ? copy.inspectorDvtRelationalOperationTitle
            : canvasRelationalOperationLabel(operation, copy)}
        </h3>
      </header>
      {!hasOperands ? (
        <p className="mt-4 text-xs text-(--text-muted)">
          {copy.relationalTreeSelectFirstSourceMessage}
        </p>
      ) : operation == null ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-(--text-muted)">
            {selectedInputIds.length === 1
              ? copy.relationalTreeSelectNextSourceMessage
              : copy.relationalTreeSelectOperationMessage}
          </p>
          <DvtRelationalOperationChooser
            choices={choices}
            copy={copy}
            onSelect={onSelectOperation}
          />
        </div>
      ) : operation === 'inner_join' && joinDraft != null ? (
        <div className="mt-4">
          <CanvasRelationalTreeJoinEditor
            key={appendInput?.nodeId ?? 'base'}
            appendInput={appendInput}
            copy={copy}
            draft={joinDraft}
            onAppend={onAppendJoinInput}
            onChange={onChangeJoinDraft}
          />
        </div>
      ) : null}
      {!hasOperands ? null : (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-(--border-subtle) pt-4">
          <Button
            type="button"
            size="sm"
            data-slot="canvas-relational-tree-apply"
            disabled={!ready}
            onClick={onApply}
          >
            {copy.inspectorDvtRelationalApply}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-slot="canvas-relational-tree-cancel"
            onClick={onCancel}
          >
            {copy.inspectorDvtRelationalCancel}
          </Button>
        </div>
      )}
    </aside>
  );
}
