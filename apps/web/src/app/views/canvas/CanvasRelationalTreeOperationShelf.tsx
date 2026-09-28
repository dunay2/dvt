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
