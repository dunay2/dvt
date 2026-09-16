/** Owned concern: present the guided relation operation and its single Apply/Cancel boundary. */
import { Button } from '../../components/ui/button';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperationChoice } from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { DvtRelationalOperationChooser } from './DvtRelationalOperationChooser';

export function CanvasRelationalTreeAuthoringPanel({
  appendInput,
  choices,
  copy,
  firstInputId,
  inputs,
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
  firstInputId: string | null;
  inputs: readonly CanvasDvtCompositionInput[];
  joinDraft: DvtSubstraitInnerJoinDraft | null;
  operation: 'inner_join' | 'union_all' | null;
  selectedInputIds: readonly string[];
  onAppendJoinInput: (
    selection: Readonly<{
      leftSourceFieldId: string;
      rightFieldName: string;
    }>
  ) => void;
  onApply: () => void;
  onCancel: () => void;
  onChangeJoinDraft: (draft: DvtSubstraitInnerJoinDraft) => void;
  onSelectOperation: (operation: 'inner_join' | 'union_all') => void;
}>): JSX.Element {
  const inputById = new Map(inputs.map((input) => [input.nodeId, input] as const));
  const ready =
    (operation === 'inner_join' && joinDraft != null) ||
    (operation === 'union_all' && selectedInputIds.length >= 2);

  return (
    <aside
      data-slot="canvas-relational-tree-authoring"
      className="min-h-0 overflow-auto border-t border-(--border-subtle) p-3 lg:border-l lg:border-t-0"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
        {copy.inspectorDvtRelationalOperationTitle}
      </h3>
      {firstInputId == null ? (
        <p className="mt-3 text-xs text-(--text-muted)">
          {copy.relationalTreeSelectFirstSourceMessage}
        </p>
      ) : operation == null ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-(--text-muted)">{copy.relationalTreeSelectOperationMessage}</p>
          <DvtRelationalOperationChooser
            choices={choices}
            copy={copy}
            onSelect={onSelectOperation}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-(--text-muted)">
            {joinDraft == null && selectedInputIds.length < 2
              ? copy.relationalTreeSelectNextSourceMessage
              : copy.relationalTreeSelectedInputsLabel}
          </p>
          <ol className="space-y-1 font-mono text-[11px] text-(--text-primary)">
            {selectedInputIds.map((nodeId, index) => (
              <li key={nodeId}>
                {index + 1}. {inputById.get(nodeId)?.schema}.{inputById.get(nodeId)?.table}
              </li>
            ))}
          </ol>
          {operation === 'inner_join' && joinDraft != null ? (
            <CanvasRelationalTreeJoinEditor
              key={appendInput?.nodeId ?? 'base'}
              appendInput={appendInput}
              copy={copy}
              draft={joinDraft}
              onAppend={onAppendJoinInput}
              onChange={onChangeJoinDraft}
            />
          ) : null}
        </div>
      )}
      {firstInputId == null ? null : (
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
    </aside>
  );
}
