/** Owned concern: provide reusable Canvas context-menu presentation primitives. */
import type { CSSProperties, ReactNode, RefObject } from 'react';

const CANVAS_CONTEXT_MENU_SURFACE_CLASS_NAME =
  'pointer-events-auto fixed z-50 min-w-52 rounded-md border border-(--border-default) bg-(--surface-panel) p-1 shadow-xl';
const CANVAS_CONTEXT_MENU_SECTION_TITLE_CLASS_NAME =
  'px-2 py-1 text-xs font-semibold uppercase tracking-wide text-(--text-muted)';
const CANVAS_CONTEXT_MENU_ITEM_CLASS_NAME =
  'flex w-full items-center rounded px-2 py-2 text-left text-sm text-(--text-default) hover:bg-(--surface-elevated)';

type CanvasContextMenuSurfaceProps = Readonly<{
  menuRef: RefObject<HTMLDivElement>;
  style: CSSProperties;
  children: ReactNode;
}>;

export function CanvasContextMenuSurface({
  menuRef,
  style,
  children,
}: CanvasContextMenuSurfaceProps): JSX.Element {
  return (
    <div
      ref={menuRef}
      role="menu"
      data-slot="canvas-context-menu"
      className={CANVAS_CONTEXT_MENU_SURFACE_CLASS_NAME}
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

export function CanvasContextMenuSection({
  dataSlot,
  title,
  children,
}: CanvasContextMenuSectionProps): JSX.Element {
  return (
    <div data-slot={dataSlot}>
      {title == null ? null : (
        <div className={CANVAS_CONTEXT_MENU_SECTION_TITLE_CLASS_NAME}>{title}</div>
      )}
      {children}
    </div>
  );
}

type CanvasContextMenuItemProps = Readonly<{
  label: string;
  onSelect: () => void;
}>;

export function CanvasContextMenuItem({
  label,
  onSelect,
}: CanvasContextMenuItemProps): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      className={CANVAS_CONTEXT_MENU_ITEM_CLASS_NAME}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}
