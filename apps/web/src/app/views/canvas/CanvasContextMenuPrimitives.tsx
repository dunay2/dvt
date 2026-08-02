/** Owned concern: provide reusable Canvas context-menu presentation primitives. */
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react';

const CANVAS_CONTEXT_MENU_SURFACE_CLASS_NAME =
  'pointer-events-auto fixed z-50 w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-md border border-(--border-default) bg-(--surface-panel) p-1 shadow-xl';
const CANVAS_CONTEXT_MENU_SECTION_TITLE_CLASS_NAME =
  'px-2 py-1 text-xs font-semibold uppercase tracking-wide text-(--text-muted)';
const CANVAS_CONTEXT_MENU_ITEM_CLASS_NAME =
  'flex w-full items-center rounded px-2 py-2 text-left text-sm text-(--text-default) hover:bg-(--surface-elevated)';

type CanvasContextMenuSurfaceProps = Readonly<{
  menuRef: RefObject<HTMLDivElement>;
  style: CSSProperties;
  ariaLabel: string;
  children: ReactNode;
}>;

function focusMenuItemForKey(event: KeyboardEvent<HTMLDivElement>): void {
  if (event.key === 'Enter' || event.key === ' ') {
    const activeItem = document.activeElement;
    if (activeItem instanceof HTMLButtonElement && activeItem.getAttribute('role') === 'menuitem') {
      event.preventDefault();
      event.stopPropagation();
      activeItem.click();
    }
    return;
  }

  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    return;
  }

  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')
  );
  if (items.length === 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const activeIndex = items.findIndex((item) => item === document.activeElement);
  let nextIndex: number;
  if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = items.length - 1;
  } else if (event.key === 'ArrowUp') {
    nextIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
  } else {
    nextIndex = activeIndex < 0 || activeIndex === items.length - 1 ? 0 : activeIndex + 1;
  }

  items[nextIndex]?.focus({ preventScroll: true });
}

export function CanvasContextMenuSurface({
  menuRef,
  style,
  ariaLabel,
  children,
}: CanvasContextMenuSurfaceProps): JSX.Element {
  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={ariaLabel}
      data-slot="canvas-context-menu"
      className={CANVAS_CONTEXT_MENU_SURFACE_CLASS_NAME}
      style={style}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={focusMenuItemForKey}
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
  label: ReactNode;
  title?: string;
  dataSlot?: string;
  dataMenuItemKind?: string;
  dataMenuAction?: string;
  dataRegistrationKind?: string;
  onSelect: () => void;
}>;

export function CanvasContextMenuItem({
  label,
  title,
  dataSlot = 'canvas-context-menu-item',
  dataMenuItemKind,
  dataMenuAction,
  dataRegistrationKind,
  onSelect,
}: CanvasContextMenuItemProps): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      data-slot={dataSlot}
      data-menu-item-kind={dataMenuItemKind}
      data-menu-action={dataMenuAction}
      data-registration-kind={dataRegistrationKind}
      className={CANVAS_CONTEXT_MENU_ITEM_CLASS_NAME}
      title={title}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}
