/** Owned concern: host the Canvas context-menu presentation layer for shell-owned presenters. */
import { CanvasContextMenuView } from './CanvasContextMenuView';
import type { CanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';

export function CanvasContextMenuLayer({
  presenter,
}: Readonly<{ presenter: CanvasContextMenuPresenter }>): JSX.Element | null {
  if (presenter.model == null) {
    return null;
  }

  return (
    <div data-slot="canvas-context-menu-layer" className="pointer-events-none fixed inset-0 z-50">
      <CanvasContextMenuView
        model={presenter.model}
        menuRef={presenter.menuRef}
        onCanvasAction={presenter.handleCanvasAction}
        onCreateNodeAction={presenter.handleCreateNodeAction}
        onEdgeAction={presenter.handleEdgeAction}
      />
    </div>
  );
}
