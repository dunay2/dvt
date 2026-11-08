/** Owned concern: render the React Flow node shell around a precomputed Canvas node body. */
import {
  useCallback,
  useEffect,
  useRef,
  type DragEventHandler,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

import { ContextMenu, ContextMenuTrigger } from '../ui/context-menu';
import { cn } from '../ui/utils';
import { CanvasNodeContextMenuView } from './CanvasNodeContextMenuView';
import {
  CanvasNodePortHandle,
  type CanvasNodePortCompatibilityView,
  type CanvasNodePortHandleKind,
  type CanvasNodePortTone,
} from './CanvasNodePortHandle';
import type {
  CanvasNodeContextMenuActionId,
  CanvasNodeContextMenuModel,
} from './canvasNodeContextMenuModel';
import {
  isCanvasElement,
  isCanvasNodeEmbeddedControlTarget,
} from './canvasNodeInteractionBoundary';
import styles from './CanvasNodeShell.module.css';

const SINGLE_CLICK_DELAY_MS = 500;

type CanvasNodeShellProps = Readonly<{
  children: ReactNode;
  contextMenuModel: CanvasNodeContextMenuModel;
  shouldShowSourceHandle: boolean;
  shouldShowTargetHandle: boolean;
  sourceHandleTone?: CanvasNodePortTone;
  targetHandleTone?: CanvasNodePortTone;
  sourcePortLabel?: string;
  targetPortLabel?: string;
  sourcePortCompatibility?: CanvasNodePortCompatibilityView;
  targetPortCompatibility?: CanvasNodePortCompatibilityView;
  onContextMenuAction: (actionId: CanvasNodeContextMenuActionId) => void;
  onSelectNode?: () => void;
  onOpenNode?: () => void;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
}>;

export function CanvasNodeShell({
  children,
  contextMenuModel,
  shouldShowSourceHandle,
  shouldShowTargetHandle,
  sourceHandleTone = 'control',
  targetHandleTone = 'control',
  sourcePortLabel,
  targetPortLabel,
  sourcePortCompatibility,
  targetPortCompatibility,
  onContextMenuAction,
  onSelectNode,
  onOpenNode,
  onDragOver,
  onDrop,
}: CanvasNodeShellProps): JSX.Element {
  const pendingClick = useRef<{
    timer: ReturnType<typeof setTimeout>;
    ownerDocument: Document;
  } | null>(null);
  const selectNode = useRef(onSelectNode);
  selectNode.current = onSelectNode;
  const cancelPendingClick = useCallback((): void => {
    const pending = pendingClick.current;
    if (pending == null) return;
    clearTimeout(pending.timer);
    pending.ownerDocument.removeEventListener('pointerdown', cancelPendingClick, true);
    pending.ownerDocument.removeEventListener('keydown', cancelPendingClick, true);
    pendingClick.current = null;
  }, []);
  useEffect(() => cancelPendingClick, [cancelPendingClick, contextMenuModel.target.nodeId]);
  const activation = onOpenNode != null ? 'open' : onSelectNode != null ? 'inspect' : undefined;
  const handleClick = (event: ReactMouseEvent<HTMLDivElement>): void => {
    cancelPendingClick();
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.detail > 1 ||
      isCanvasNodeEmbeddedControlTarget(event.target)
    ) {
      return;
    }
    if (event.detail === 0) {
      selectNode.current?.();
      return;
    }
    if (onSelectNode == null) return;
    const ownerDocument = event.currentTarget.ownerDocument;
    pendingClick.current = {
      ownerDocument,
      timer: setTimeout(() => {
        cancelPendingClick();
        selectNode.current?.();
      }, SINGLE_CLICK_DELAY_MS),
    };
    ownerDocument.addEventListener('pointerdown', cancelPendingClick, {
      capture: true,
      once: true,
    });
    ownerDocument.addEventListener('keydown', cancelPendingClick, { capture: true, once: true });
  };

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>): void => {
    cancelPendingClick();
    if (isCanvasNodeEmbeddedControlTarget(event.target)) {
      return;
    }

    onOpenNode?.();
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>): void => {
    cancelPendingClick();
    if (
      !isCanvasElement(event.target) ||
      event.target.closest('[data-canvas-context-menu-owner="column"]') == null
    )
      return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-slot="canvas-node-shell"
          data-canvas-node-activation={activation}
          tabIndex={activation == null ? undefined : 0}
          role="group"
          aria-label={contextMenuModel.target.nodeName}
          aria-keyshortcuts={activation == null ? undefined : 'Enter'}
          className={cn(styles.root, 'relative group/canvas-node')}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {shouldShowTargetHandle && (
            <CanvasNodePortHandle
              id={'target' satisfies CanvasNodePortHandleKind}
              kind="target"
              tone={targetHandleTone}
              label={targetPortLabel}
              compatibility={targetPortCompatibility}
            />
          )}

          <div className="relative">{children}</div>

          {shouldShowSourceHandle && (
            <CanvasNodePortHandle
              id={'source' satisfies CanvasNodePortHandleKind}
              kind="source"
              tone={sourceHandleTone}
              label={sourcePortLabel}
              compatibility={sourcePortCompatibility}
            />
          )}
        </div>
      </ContextMenuTrigger>

      <CanvasNodeContextMenuView model={contextMenuModel} onAction={onContextMenuAction} />
    </ContextMenu>
  );
}
