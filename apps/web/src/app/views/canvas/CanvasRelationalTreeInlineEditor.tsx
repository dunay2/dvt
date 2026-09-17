/** Owned concern: edit the operation selected in the central relational draft canvas. */
import { GitMerge } from 'lucide-react';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { canvasRelationalOperationLabel } from './DvtRelationalOperationChooser';

export function CanvasRelationalTreeInlineEditor({
  appendInput,
  copy,
  joinDraft,
  operation,
  onAppendJoinInput,
  onChangeJoinDraft,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  joinDraft: DvtSubstraitInnerJoinDraft | null;
  operation: CanvasRelationalOperation | null;
  onAppendJoinInput: (
    selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => void;
  onChangeJoinDraft: (draft: DvtSubstraitInnerJoinDraft) => void;
}>): JSX.Element | null {
  if (operation !== 'inner_join' || joinDraft == null) return null;

  return (
    <section
      data-slot="canvas-relational-tree-inline-editor"
      className="max-h-64 shrink-0 overflow-auto border-t border-(--border-subtle) bg-(--surface-panel) px-4 py-3"
    >
      <header className="mb-3 flex items-center gap-2">
        <GitMerge aria-hidden="true" className="size-4 text-(--status-info)" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-primary)">
          {canvasRelationalOperationLabel(operation, copy)}
        </h3>
      </header>
      <CanvasRelationalTreeJoinEditor
        key={appendInput?.nodeId ?? 'base'}
        appendInput={appendInput}
        copy={copy}
        draft={joinDraft}
        onAppend={onAppendJoinInput}
        onChange={onChangeJoinDraft}
      />
    </section>
  );
}
