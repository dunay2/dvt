/** Owned concern: present central block composition, operand slots, and its Apply/Cancel boundary. */
import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import {
  CanvasRelationalTreeOperandSlot,
  type CanvasRelationalOperandPosition,
} from './CanvasRelationalTreeOperandSlot';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import {
  canvasRelationalOperationLabel,
  DvtRelationalOperationChooser,
} from './DvtRelationalOperationChooser';

export function CanvasRelationalTreeBlockCanvas({
  appendInput,
  choices,
  copy,
  inputs,
  joinDraft,
  operation,
  primaryInputId,
  secondaryInputId,
  selectedInputIds,
  onAppendJoinInput,
  onApply,
  onCancel,
  onChangeJoinDraft,
  onPlaceInput,
  onSelectOperation,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  choices: readonly CanvasRelationalOperationChoice[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  inputs: readonly CanvasDvtCompositionInput[];
  joinDraft: DvtSubstraitInnerJoinDraft | null;
  operation: CanvasRelationalOperation | null;
  primaryInputId: string | null;
  secondaryInputId: string | null;
  selectedInputIds: readonly string[];
  onAppendJoinInput: (
    selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => void;
  onApply: () => void;
  onCancel: () => void;
  onChangeJoinDraft: (draft: DvtSubstraitInnerJoinDraft) => void;
  onPlaceInput: (nodeId: string, position: CanvasRelationalOperandPosition) => void;
  onSelectOperation: (operation: CanvasRelationalOperation) => void;
}>): JSX.Element {
  const inputById = new Map(inputs.map((input) => [input.nodeId, input] as const));
  const ready =
    (operation === 'projection' && selectedInputIds.length === 1) ||
    (operation === 'inner_join' && joinDraft != null) ||
    (operation === 'union_all' && selectedInputIds.length >= 2);
  const hasOperands = selectedInputIds.length > 0;

  return (
    <section
      data-slot="canvas-relational-tree-block-canvas"
      aria-label={copy.relationalTreeCanvasLabel}
      className="min-h-64 overflow-auto p-4"
    >
      <div className="grid min-h-[22rem] grid-cols-2 grid-rows-[auto_1fr_auto] gap-4">
        <CanvasRelationalTreeOperandSlot
          copy={copy}
          input={primaryInputId == null ? null : (inputById.get(primaryInputId) ?? null)}
          position="primary"
          onPlaceInput={onPlaceInput}
        />
        <div
          data-slot="canvas-relational-tree-operation-block"
          className="col-span-2 row-start-2 w-full max-w-2xl place-self-center rounded border border-(--border-subtle) bg-(--surface-panel) p-4"
        >
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
            {operation == null
              ? copy.inspectorDvtRelationalOperationTitle
              : canvasRelationalOperationLabel(operation, copy)}
          </h3>
          {!hasOperands ? (
            <p className="mt-3 text-xs text-(--text-muted)">
              {copy.relationalTreeSelectFirstSourceMessage}
            </p>
          ) : operation == null ? (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-(--text-muted)">
                {copy.relationalTreeSelectOperationMessage}
              </p>
              <DvtRelationalOperationChooser
                choices={choices}
                copy={copy}
                onSelect={onSelectOperation}
              />
            </div>
          ) : operation === 'inner_join' && joinDraft != null ? (
            <div className="mt-3">
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
          {selectedInputIds.length <= 2 ? null : (
            <p className="mt-3 font-mono text-[10px] text-(--text-muted)">
              {copy.relationalTreeSelectedInputsLabel}: {selectedInputIds.length}
            </p>
          )}
          {!hasOperands ? null : (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-(--border-subtle) pt-3">
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
        </div>
        <div className="col-start-2 row-start-3 justify-self-end">
          <CanvasRelationalTreeOperandSlot
            copy={copy}
            input={secondaryInputId == null ? null : (inputById.get(secondaryInputId) ?? null)}
            position="secondary"
            onPlaceInput={onPlaceInput}
          />
        </div>
      </div>
    </section>
  );
}
