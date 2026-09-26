/** Owned concern: connect operation discovery to existing draft forms and replacement confirmation. */
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasOperationMenu } from './operation-menu/CanvasOperationMenu';
import { CanvasOperationReplacementDialog } from './operation-menu/CanvasOperationReplacementDialog';
import { buildCanvasOperationMenuItems } from './operation-menu/canvasOperationMenuModel';
import { resolveCanvasOperationMenuCopy } from './operation-menu/canvasOperationMenuCopy';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { CanvasRelationalCrossNotice } from './CanvasRelationalCrossNotice';
import { useSelectedRelationTools } from './useSelectedRelationTool';
import { useCompositionChoices } from './useCompositionChoices';
import type { useCanvasTransformStage } from './useCanvasTransformStage';
import { useCanvasOperationMenuSelection } from './operation-menu/useCanvasOperationMenuSelection';

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
  transformStage,
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
  transformStage?: ReturnType<typeof useCanvasTransformStage>;
}>): JSX.Element {
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
    transformAvailable: transformStage?.available ?? false,
  });
  const menu = useCanvasOperationMenuSelection({
    items,
    tools,
    choices,
    operation,
    targetId,
    onSelectOperation,
    onInsertTransform: transformStage?.insert,
  });
  return (
    <section
      data-slot="canvas-relational-tree-operation-shelf"
      className="shrink-0 border-b border-(--border-subtle) bg-(--surface-panel)"
    >
      <div className="flex min-h-10 items-center gap-2 px-3 py-1">
        <CanvasOperationMenu items={items} copy={menuCopy} onSelect={menu.select} />
        {operation === 'cross_join' ? <CanvasRelationalCrossNotice /> : null}
      </div>
      {transformStage?.error ? (
        <p role="alert" className="px-3 text-xs text-red-400">
          {copy.relationalTreeUnavailableMessage}
        </p>
      ) : null}
      {menu.selection == null || draft == null ? null : (
        <CanvasRelationalTreeOperatorForm
          tool={menu.selection.tool}
          targetRelationId={menu.selection.targetId}
          draft={draft}
          title={
            copy[resolveCanvasRelationalOperationPresentation(menu.selection.tool.id).labelKey]
          }
          onClose={menu.cancelTool}
          onChange={onChangeDraft}
        />
      )}
      <CanvasOperationReplacementDialog
        open={menu.replacement != null}
        title={localCopy.replaceOperation}
        description={
          operation === 'projection'
            ? localCopy.replaceProjectionHint
            : localCopy.replaceOperationHint
        }
        cancelLabel={copy.inspectorDvtRelationalCancel}
        confirmLabel={copy.inspectorDvtRelationalApply}
        onOpenChange={(open) => {
          if (!open) menu.cancelReplacement();
        }}
        onConfirm={menu.confirmReplacement}
      />
    </section>
  );
}
