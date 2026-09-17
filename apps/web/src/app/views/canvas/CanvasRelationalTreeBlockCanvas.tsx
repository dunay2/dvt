/** Owned concern: present the draft graph surface and its contextual operation editor. */
import { GitMerge } from 'lucide-react';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import { canvasRelationalOperationLabel } from './DvtRelationalOperationChooser';
import {
  CanvasRelationalTreeOperandSlot,
  type CanvasRelationalOperandPosition,
} from './CanvasRelationalTreeOperandSlot';
import { CanvasRelationalTreeOperationPanel } from './CanvasRelationalTreeOperationPanel';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';

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
  const operationLabel =
    operation == null
      ? copy.inspectorDvtRelationalOperationTitle
      : canvasRelationalOperationLabel(operation, copy);

  return (
    <section
      data-slot="canvas-relational-tree-block-canvas"
      aria-label={copy.relationalTreeCanvasLabel}
      className="grid min-h-0 grid-cols-1 grid-rows-[minmax(16rem,1fr)_auto] overflow-hidden md:grid-cols-[minmax(0,1fr)_17rem] md:grid-rows-1"
    >
      <div
        className="min-h-0 overflow-auto p-5"
        style={{
          backgroundColor: 'var(--surface-subtle)',
          backgroundImage:
            'radial-gradient(circle, color-mix(in srgb, var(--border-subtle) 72%, transparent) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        <div className="mx-auto grid min-h-64 w-full max-w-3xl grid-cols-[minmax(0,13rem)_minmax(10rem,1fr)] grid-rows-2 items-center gap-x-20 gap-y-8">
          <CanvasRelationalTreeOperandSlot
            copy={copy}
            input={primaryInputId == null ? null : (inputById.get(primaryInputId) ?? null)}
            position="primary"
            onPlaceInput={onPlaceInput}
          />
          <div className="row-span-2 flex items-center gap-10">
            <div
              data-slot="canvas-relational-tree-operation-block"
              className="flex min-h-16 min-w-44 items-center gap-2 rounded-md border border-(--status-info) bg-blue-950/30 px-3 shadow-sm"
            >
              <GitMerge aria-hidden="true" className="size-4 text-(--status-info)" />
              <span className="text-[10px] font-semibold uppercase text-(--text-primary)">
                {operationLabel}
              </span>
            </div>
            <div className="min-w-28 rounded-md border border-emerald-500 bg-emerald-950/30 px-3 py-4 text-[10px] font-semibold text-emerald-300">
              {copy.relationalTreeOutputLabel}
            </div>
          </div>
          <CanvasRelationalTreeOperandSlot
            copy={copy}
            input={secondaryInputId == null ? null : (inputById.get(secondaryInputId) ?? null)}
            position="secondary"
            onPlaceInput={onPlaceInput}
          />
        </div>
      </div>
      <CanvasRelationalTreeOperationPanel
        appendInput={appendInput}
        choices={choices}
        copy={copy}
        joinDraft={joinDraft}
        operation={operation}
        selectedInputIds={selectedInputIds}
        onAppendJoinInput={onAppendJoinInput}
        onApply={onApply}
        onCancel={onCancel}
        onChangeJoinDraft={onChangeJoinDraft}
        onSelectOperation={onSelectOperation}
      />
    </section>
  );
}
