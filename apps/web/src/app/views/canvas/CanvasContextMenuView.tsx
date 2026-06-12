/** Owned concern: render the Canvas context menu template without owning interaction decisions. */
import type { CSSProperties, RefObject } from 'react';

import type {
  CanvasContextMenuCanvasAction,
  CanvasContextMenuCreateNodeAction,
  CanvasContextMenuEdgeAction,
  CanvasContextMenuModel,
} from './canvasInteractionCommandSurface';

type CanvasContextMenuViewProps = Readonly<{
  model: CanvasContextMenuModel | null;
  menuRef: RefObject<HTMLDivElement>;
  onCanvasAction: (action: CanvasContextMenuCanvasAction) => void;
  onCreateNodeAction: (action: CanvasContextMenuCreateNodeAction) => void;
  onEdgeAction: (action: CanvasContextMenuEdgeAction) => void;
}>;

export function CanvasContextMenuView({
  model,
  menuRef,
  onCanvasAction,
  onCreateNodeAction,
  onEdgeAction,
}: CanvasContextMenuViewProps): JSX.Element | null {
  if (model == null) {
    return null;
  }

  const menuStyle: CSSProperties = {
    left: model.screenPosition.x,
    top: model.screenPosition.y,
  };
  const addCanvasActions = model.canvasActions.filter(
    (action) => action.action === 'open-source-import'
  );
  const canvasCommandActions = model.canvasActions.filter(
    (action) => action.action !== 'open-source-import'
  );
  const shouldShowAddGroup = addCanvasActions.length > 0 || model.createNodeActions.length > 0;

  return (
    <div
      ref={menuRef}
      role="menu"
      data-slot="canvas-context-menu"
      className="fixed z-50 min-w-52 rounded-md border border-[color:var(--border-default)] bg-[var(--surface-panel)] p-1 shadow-xl"
      style={menuStyle}
      onContextMenu={(event) => event.preventDefault()}
    >
      {shouldShowAddGroup ? (
        <div data-slot="canvas-context-menu-add-group">
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
            Add
          </div>
          {addCanvasActions.map((action) => (
            <button
              key={action.action}
              type="button"
              role="menuitem"
              className="flex w-full items-center rounded px-2 py-2 text-left text-sm text-(--text-default) hover:bg-(--surface-elevated)"
              onClick={() => onCanvasAction(action)}
            >
              {action.label}
            </button>
          ))}
          {model.createNodeActions.map((action) => (
            <button
              key={action.registration.kind}
              type="button"
              role="menuitem"
              className="flex w-full items-center rounded px-2 py-2 text-left text-sm text-(--text-default) hover:bg-(--surface-elevated)"
              onClick={() => onCreateNodeAction(action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      {canvasCommandActions.length > 0 ? (
        <div data-slot="canvas-context-menu-canvas-group">
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
            Canvas
          </div>
          {canvasCommandActions.map((action) => (
            <button
              key={action.action}
              type="button"
              role="menuitem"
              className="flex w-full items-center rounded px-2 py-2 text-left text-sm text-(--text-default) hover:bg-(--surface-elevated)"
              onClick={() => onCanvasAction(action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      {model.edgeActions.map((action) => (
        <button
          key={action.action}
          type="button"
          role="menuitem"
          className="flex w-full items-center rounded px-2 py-2 text-left text-sm text-(--text-default) hover:bg-(--surface-elevated)"
          onClick={() => onEdgeAction(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
