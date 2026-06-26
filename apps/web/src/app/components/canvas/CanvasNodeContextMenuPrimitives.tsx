/** Owned concern: provide reusable presentation primitives for Canvas node context menus. */
import { Fragment, type ReactNode } from 'react';

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '../ui/context-menu';

const canvasNodeContextMenuClassNames = {
  content: 'w-56 border-(--border-default) bg-(--surface-panel) text-(--text-default)',
  title: 'truncate font-mono text-xs text-(--text-muted)',
  groupLabel: 'text-[10px] uppercase tracking-wide text-(--text-muted)',
  separator: 'bg-(--border-muted)',
} as const;

export function CanvasNodeContextMenuSurface({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <ContextMenuContent
      data-slot="canvas-node-context-menu"
      className={canvasNodeContextMenuClassNames.content}
    >
      {children}
    </ContextMenuContent>
  );
}

export function CanvasNodeContextMenuTitle({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <ContextMenuLabel className={canvasNodeContextMenuClassNames.title}>
      {children}
    </ContextMenuLabel>
  );
}

export function CanvasNodeContextMenuGroupFrame({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <Fragment>
      <ContextMenuSeparator className={canvasNodeContextMenuClassNames.separator} />
      {children}
    </Fragment>
  );
}

export function CanvasNodeContextMenuGroupLabel({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <ContextMenuLabel className={canvasNodeContextMenuClassNames.groupLabel}>
      {children}
    </ContextMenuLabel>
  );
}

export function CanvasNodeContextMenuActionPrimitive({
  children,
  destructive = false,
  disabled,
  disabledReason,
  onSelect,
}: Readonly<{
  children: ReactNode;
  destructive?: boolean;
  disabled: boolean;
  disabledReason?: string;
  onSelect: () => void;
}>): JSX.Element {
  return (
    <ContextMenuItem
      data-slot="canvas-node-context-menu-item"
      variant={destructive ? 'destructive' : undefined}
      disabled={disabled}
      title={disabledReason}
      onSelect={onSelect}
    >
      {children}
    </ContextMenuItem>
  );
}
