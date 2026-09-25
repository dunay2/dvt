/** Owned concern: connect operation discovery to existing draft forms and replacement confirmation. */
import { useState } from 'react';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasOperationMenu } from './operation-menu/CanvasOperationMenu';
import { CanvasOperationReplacementDialog } from './operation-menu/CanvasOperationReplacementDialog';
import { buildCanvasOperationMenuItems } from './operation-menu/canvasOperationMenuModel';
import { resolveCanvasOperationMenuCopy } from './operation-menu/canvasOperationMenuCopy';
import type { CanvasRelationalOperatorTool } from './relational-operator-form/OperatorTool';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { CanvasRelationalCrossNotice } from './CanvasRelationalCrossNotice';
import { useSelectedRelationTools } from './useSelectedRelationTool';
import { useCompositionChoices } from './useCompositionChoices';

export function CanvasRelationalTreeOperationShelf({
  choices: initialChoices,
  copy,
  operation: initialOperation,
  onSelectOperation,
  draft,
  editable,
  onChangeDraft,
  selectedRelationId,
  appending = false,
}: Readonly<{
  choices: readonly CanvasRelationalOperationChoice[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  operation: CanvasRelationalOperation | null;
  onSelectOperation: (operation: CanvasRelationalOperation, relationId?: string) => void;
  draft: DvtSubstraitProjectionDraft | null;
  editable: boolean;
  onChangeDraft: (draft: DvtSubstraitProjectionDraft) => void;
  selectedRelationId: string | null;
  appending?: boolean;
}>): JSX.Element {
  const [replacement, setReplacement] = useState<CanvasRelationalOperation | null>(null);
  const [selection, setSelection] = useState<{
    tool: CanvasRelationalOperatorTool;
    targetId?: string;
  } | null>(null);
  const selectedTool = selection?.tool;
  const language = useApplicationLanguageStore((state) => state.language);
  const localCopy = resolveCanvasSemanticEditorCopy(language);
  const menuCopy = resolveCanvasOperationMenuCopy(language);
  const { tools, targetId } = useSelectedRelationTools(draft, selectedRelationId);
  const replacing = draft != null && !appending;
  const selected = useCompositionChoices(selectedRelationId, !editable, replacing);
  const choices = replacing ? (selected?.choices ?? []) : initialChoices;
  const operation = replacing ? (selected?.operation ?? null) : initialOperation;
  const items = buildCanvasOperationMenuItems({
    choices,
    tools,
    operation,
    editable,
    copy,
    menuCopy,
  });
  return (
    <section
      data-slot="canvas-relational-tree-operation-shelf"
      className="shrink-0 border-b border-(--border-subtle) bg-(--surface-panel)"
    >
      <div className="flex min-h-10 items-center gap-2 px-3 py-1">
        <CanvasOperationMenu
          items={items}
          copy={menuCopy}
          onSelect={(next) => {
            if (!items.some((item) => item.id === next && item.selectable)) return;
            const tool = tools.find((item) => item.id === next);
            if (tool != null) {
              setSelection({
                tool,
                targetId,
              });
              return;
            }
            const choice = choices.find((item) => item.operation === next);
            if (choice == null || choice.operation === operation) return;
            if (operation != null) setReplacement(choice.operation);
            else onSelectOperation(choice.operation, targetId);
          }}
        />
        {operation === 'cross_join' ? <CanvasRelationalCrossNotice /> : null}
      </div>
      {selectedTool == null || draft == null ? null : (
        <CanvasRelationalTreeOperatorForm
          tool={selectedTool}
          targetRelationId={selection?.targetId}
          draft={draft}
          title={copy[resolveCanvasRelationalOperationPresentation(selectedTool.id).labelKey]}
          onClose={() => setSelection(null)}
          onChange={onChangeDraft}
        />
      )}
      <CanvasOperationReplacementDialog
        open={replacement != null}
        title={localCopy.replaceOperation}
        description={
          operation === 'projection'
            ? localCopy.replaceProjectionHint
            : localCopy.replaceOperationHint
        }
        cancelLabel={copy.inspectorDvtRelationalCancel}
        confirmLabel={copy.inspectorDvtRelationalApply}
        onOpenChange={(open) => {
          if (!open) setReplacement(null);
        }}
        onConfirm={() => {
          if (replacement != null) onSelectOperation(replacement, targetId);
          setReplacement(null);
        }}
      />
    </section>
  );
}
