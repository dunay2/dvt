/** Owned concern: manage Canvas context-menu open/close lifecycle and browser echo suppression. */
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';

import type {
  CanvasContextMenuModel,
  CanvasContextMenuPosition,
} from './canvasInteractionCommandSurface';
import type {
  CloseCanvasContextMenuOptions,
  ContextMenuEvent,
  PaneClickEvent,
} from './canvasContextMenuPresenter.types';

const CONTEXT_MENU_OPEN_ECHO_SUPPRESSION_MS = 1000;
const CONTEXT_MENU_PANE_CLICK_ECHO_SUPPRESSION_MS = 100;
const CONTEXT_MENU_PANE_CLICK_ECHO_TOLERANCE_PX = 2;

type ContextMenuOpenTargetKind = CanvasContextMenuModel['kind'];

type UseCanvasContextMenuLifecycleArgs = Readonly<{
  model: CanvasContextMenuModel | null;
  setModel: Dispatch<SetStateAction<CanvasContextMenuModel | null>>;
}>;

type UseCanvasContextMenuLifecycleResult = Readonly<{
  menuRef: RefObject<HTMLDivElement>;
  contextSurfaceRef: RefObject<HTMLDivElement>;
  markContextMenuOpened: (
    targetKind: ContextMenuOpenTargetKind,
    screenPosition?: CanvasContextMenuPosition
  ) => void;
  closeContextMenu: (options?: CloseCanvasContextMenuOptions) => void;
  handlePaneClick: (event: PaneClickEvent) => void;
}>;

function isNearPosition(
  event: Pick<MouseEvent, 'clientX' | 'clientY'>,
  position: CanvasContextMenuPosition | null
): boolean {
  return (
    position != null &&
    Math.abs(event.clientX - position.x) <= CONTEXT_MENU_PANE_CLICK_ECHO_TOLERANCE_PX &&
    Math.abs(event.clientY - position.y) <= CONTEXT_MENU_PANE_CLICK_ECHO_TOLERANCE_PX
  );
}

export function useCanvasContextMenuLifecycle({
  model,
  setModel,
}: UseCanvasContextMenuLifecycleArgs): UseCanvasContextMenuLifecycleResult {
  const menuRef = useRef<HTMLDivElement>(null);
  const contextSurfaceRef = useRef<HTMLDivElement>(null);
  const lastContextMenuOpenedAtRef = useRef(0);
  const lastContextMenuOpenedTargetKindRef = useRef<ContextMenuOpenTargetKind | null>(null);
  const lastPaneContextMenuScreenPositionRef = useRef<CanvasContextMenuPosition | null>(null);
  const pendingPaneClickEchoRef = useRef(false);
  const pendingDocumentPointerEchoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingDocumentPointerEchoTimeout = useCallback(() => {
    if (pendingDocumentPointerEchoTimeoutRef.current == null) {
      return;
    }

    clearTimeout(pendingDocumentPointerEchoTimeoutRef.current);
    pendingDocumentPointerEchoTimeoutRef.current = null;
  }, []);

  const consumePendingPaneClickEcho = useCallback(() => {
    clearPendingDocumentPointerEchoTimeout();
    pendingPaneClickEchoRef.current = false;
  }, [clearPendingDocumentPointerEchoTimeout]);

  const markContextMenuOpened = useCallback(
    (targetKind: ContextMenuOpenTargetKind, screenPosition?: CanvasContextMenuPosition) => {
      lastContextMenuOpenedAtRef.current = Date.now();
      lastContextMenuOpenedTargetKindRef.current = targetKind;
      pendingPaneClickEchoRef.current = targetKind === 'pane';
      lastPaneContextMenuScreenPositionRef.current =
        targetKind === 'pane' ? (screenPosition ?? null) : null;
    },
    []
  );

  const closeContextMenu = useCallback(
    (_options?: CloseCanvasContextMenuOptions) => {
      clearPendingDocumentPointerEchoTimeout();
      pendingPaneClickEchoRef.current = false;
      lastPaneContextMenuScreenPositionRef.current = null;
      setModel(null);
    },
    [clearPendingDocumentPointerEchoTimeout, setModel]
  );

  useEffect(() => clearPendingDocumentPointerEchoTimeout, [clearPendingDocumentPointerEchoTimeout]);

  const handlePaneClick = useCallback(
    (event: PaneClickEvent) => {
      if (event.button !== 0) {
        return;
      }

      const lastPanePosition = lastPaneContextMenuScreenPositionRef.current;
      const isPendingImmediateBrowserClickEcho =
        pendingPaneClickEchoRef.current &&
        lastContextMenuOpenedTargetKindRef.current === 'pane' &&
        Date.now() - lastContextMenuOpenedAtRef.current <
          CONTEXT_MENU_PANE_CLICK_ECHO_SUPPRESSION_MS;
      const isPendingDelayedEchoAtContextPoint =
        pendingPaneClickEchoRef.current &&
        lastContextMenuOpenedTargetKindRef.current === 'pane' &&
        isNearPosition(event, lastPanePosition);

      if (isPendingImmediateBrowserClickEcho || isPendingDelayedEchoAtContextPoint) {
        consumePendingPaneClickEcho();
        return;
      }

      closeContextMenu({ force: true });
    },
    [closeContextMenu, consumePendingPaneClickEcho]
  );

  useEffect(() => {
    if (model == null) {
      return;
    }

    const handleDocumentPointerDown = (event: Event): void => {
      if (event instanceof MouseEvent && event.button !== 0) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }

      const isDocumentLevelPanePointerEcho =
        pendingPaneClickEchoRef.current &&
        event instanceof MouseEvent &&
        event.target === document &&
        lastContextMenuOpenedTargetKindRef.current === 'pane' &&
        Date.now() - lastContextMenuOpenedAtRef.current <
          CONTEXT_MENU_PANE_CLICK_ECHO_SUPPRESSION_MS;
      const isPendingImmediatePanePointerEcho =
        pendingPaneClickEchoRef.current &&
        event instanceof MouseEvent &&
        lastContextMenuOpenedTargetKindRef.current === 'pane' &&
        Date.now() - lastContextMenuOpenedAtRef.current <
          CONTEXT_MENU_PANE_CLICK_ECHO_SUPPRESSION_MS &&
        isNearPosition(event, lastPaneContextMenuScreenPositionRef.current);
      const isPanePointerEchoAtContextPoint =
        pendingPaneClickEchoRef.current &&
        event instanceof MouseEvent &&
        lastContextMenuOpenedTargetKindRef.current === 'pane' &&
        Date.now() - lastContextMenuOpenedAtRef.current < CONTEXT_MENU_OPEN_ECHO_SUPPRESSION_MS &&
        isNearPosition(event, lastPaneContextMenuScreenPositionRef.current);

      if (isDocumentLevelPanePointerEcho) {
        clearPendingDocumentPointerEchoTimeout();
        pendingDocumentPointerEchoTimeoutRef.current = setTimeout(() => {
          pendingDocumentPointerEchoTimeoutRef.current = null;
          if (
            pendingPaneClickEchoRef.current &&
            lastContextMenuOpenedTargetKindRef.current === 'pane'
          ) {
            pendingPaneClickEchoRef.current = false;
            lastPaneContextMenuScreenPositionRef.current = null;
          }
        }, CONTEXT_MENU_OPEN_ECHO_SUPPRESSION_MS);
        return;
      }

      if (isPendingImmediatePanePointerEcho) {
        return;
      }

      if (isPanePointerEchoAtContextPoint) {
        consumePendingPaneClickEcho();
        return;
      }

      closeContextMenu();
    };
    const handleDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeContextMenu({ force: true });
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    document.addEventListener('keydown', handleDocumentKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
      document.removeEventListener('keydown', handleDocumentKeyDown, true);
    };
  }, [
    clearPendingDocumentPointerEchoTimeout,
    closeContextMenu,
    consumePendingPaneClickEcho,
    model,
  ]);

  return {
    menuRef,
    contextSurfaceRef,
    markContextMenuOpened,
    closeContextMenu,
    handlePaneClick,
  };
}

export function useCanvasContextSurfaceContextMenu({
  contextSurfaceRef,
  onContextSurfaceContextMenu,
}: Readonly<{
  contextSurfaceRef: RefObject<HTMLDivElement>;
  onContextSurfaceContextMenu: (event: ContextMenuEvent) => void;
}>): void {
  useLayoutEffect(() => {
    const handleDocumentContextMenu = (event: MouseEvent): void => {
      const contextSurface = contextSurfaceRef.current;
      if (
        contextSurface == null ||
        !(event.target instanceof Element) ||
        !contextSurface.contains(event.target)
      ) {
        return;
      }

      onContextSurfaceContextMenu(event);
    };

    document.addEventListener('contextmenu', handleDocumentContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', handleDocumentContextMenu, true);
    };
  }, [onContextSurfaceContextMenu]);
}
