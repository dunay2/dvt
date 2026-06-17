/** Owned concern: render the Canvas context menu template without owning interaction decisions. */
import type { CSSProperties, ReactNode, RefObject } from 'react';

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

const CONTEXT_MENU_SURFACE_CLASS_NAME =
  'fixed z-50 min-w-52 rounded-md border border-(--border-default) bg-(--surface-panel) p-1 shadow-xl';
const CONTEXT_MENU_SECTION_TITLE_CLASS_NAME =
  'px-2 py-1 text-xs font-semibold uppercase tracking-wide text-(--text-muted)';
const CONTEXT_MENU_ITEM_CLASS_NAME =
  'flex w-full items-center rounded px-2 py-2 text-left text-sm text-(--text-default) hover:bg-(--surface-elevated)';

type CanvasContextMenuSurfaceProps = Readonly<{
  menuRef: RefObject<HTMLDivElement>;
  style: CSSProperties;
  children: ReactNode;
}>;

function CanvasContextMenuSurface({
  menuRef,
  style,
  children,
}: CanvasContextMenuSurfaceProps): JSX.Element {
  return (
    <div
      ref={menuRef}
      role="menu"
      data-slot="canvas-context-menu"
      className={CONTEXT_MENU_SURFACE_CLASS_NAME}
      style={style}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}

type CanvasContextMenuSectionProps = Readonly<{
  dataSlot: string;
  title?: string;
  children: ReactNode;
}>;

function CanvasContextMenuSection({
  dataSlot,
  title,
  children,
}: CanvasContextMenuSectionProps): JSX.Element {
  return (
    <div data-slot={dataSlot}>
      {title == null ? null : <div className={CONTEXT_MENU_SECTION_TITLE_CLASS_NAME}>{title}</div>}
      {children}
    </div>
  );
}

type CanvasContextMenuItemProps = Readonly<{
  label: string;
  onSelect: () => void;
}>;

function CanvasContextMenuItem({ label, onSelect }: CanvasContextMenuItemProps): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      className={CONTEXT_MENU_ITEM_CLASS_NAME}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}

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
    <CanvasContextMenuSurface menuRef={menuRef} style={menuStyle}>
      {shouldShowAddGroup ? (
        <CanvasContextMenuSection dataSlot="canvas-context-menu-add-group" title="Add">
          {addCanvasActions.map((action) => (
            <CanvasContextMenuItem
              key={action.action}
              label={action.label}
              onSelect={() => onCanvasAction(action)}
            />
          ))}
          {model.createNodeActions.map((action) => (
            <CanvasContextMenuItem
              key={action.registration.kind}
              label={action.label}
              onSelect={() => onCreateNodeAction(action)}
            />
          ))}
        </CanvasContextMenuSection>
      ) : null}

      {canvasCommandActions.length > 0 ? (
        <CanvasContextMenuSection dataSlot="canvas-context-menu-canvas-group" title="Canvas">
          {canvasCommandActions.map((action) => (
            <CanvasContextMenuItem
              key={action.action}
              label={action.label}
              onSelect={() => onCanvasAction(action)}
            />
          ))}
        </CanvasContextMenuSection>
      ) : null}

      {model.edgeActions.map((action) => (
        <CanvasContextMenuItem
          key={action.action}
          label={action.label}
          onSelect={() => onEdgeAction(action)}
        />
      ))}
    </CanvasContextMenuSurface>
  );
}
