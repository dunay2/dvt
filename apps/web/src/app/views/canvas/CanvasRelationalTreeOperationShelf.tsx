/** Owned concern: expose admitted operations for independent placement on the graph. */
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasOperationMenu } from './operation-menu/CanvasOperationMenu';
import { buildCanvasOperationMenuItems } from './operation-menu/canvasOperationMenuModel';
import { resolveCanvasOperationMenuCopy } from './operation-menu/canvasOperationMenuCopy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import {
  resolveCanvasRelationalProjectionChoice,
  resolveCanvasRelationalStagedOperationChoices,
} from './canvasRelationalOperationChoices';
import type { CanvasStagedOperationActions } from './canvasStagedOperationActions';
import { useContext } from 'react';
import { CanvasCardRemovalContext } from './CanvasCardRemovalContext';
import { CanvasCardRemovalBar } from './CanvasCardRemovalBar';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import type { CanvasRemovalCard } from './canvasCardRemoval';

export function CanvasRelationalTreeOperationShelf({
  copy,
  editable,
  onStageOperation,
}: Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  editable: boolean;
  onStageOperation?: CanvasStagedOperationActions['stage'];
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const removal = useContext(CanvasCardRemovalContext);
  const removalCopy = resolveCanvasSemanticEditorCopy(language).cardRemoval;
  const menuCopy = resolveCanvasOperationMenuCopy(language);
  const choices = [
    resolveCanvasRelationalProjectionChoice(!editable),
    ...resolveCanvasRelationalStagedOperationChoices(!editable),
  ];
  const items = buildCanvasOperationMenuItems({
    choices,
    editable,
    copy,
  });
  const name = (card: CanvasRemovalCard) =>
    card.displayName ?? copy[resolveCanvasRelationalOperationPresentation(card.operation).labelKey];
  if (removal?.pending != null) {
    const { target, dependents, disconnectsOutput } = removal.pending;
    const description =
      dependents.length > 0
        ? removalCopy.dependents.replace('{cards}', dependents.map(name).join(' · '))
        : disconnectsOutput
          ? removalCopy.output
          : removalCopy.preserve;
    return (
      <CanvasCardRemovalBar
        targetId={target.id}
        title={removalCopy.title.replace('{name}', name(target))}
        description={description}
        cancelLabel={removalCopy.cancel}
        confirmLabel={removalCopy.confirm}
        onCancel={removal.cancel}
        onConfirm={removal.confirm}
      />
    );
  }
  if (removal?.error != null)
    return (
      <CanvasCardRemovalBar
        title={removalCopy.errors[removal.error]}
        cancelLabel={removalCopy.dismiss}
        confirmLabel={removalCopy.confirm}
        onCancel={removal.clearError}
      />
    );
  return (
    <section
      data-slot="canvas-relational-tree-operation-shelf"
      className="shrink-0 border-b border-(--border-subtle) bg-(--surface-panel)"
    >
      <div className="flex min-h-10 items-center gap-2 px-3 py-1">
        <CanvasOperationMenu
          items={items}
          copy={menuCopy}
          onStage={(next) => onStageOperation?.(next)}
        />
      </div>
    </section>
  );
}
