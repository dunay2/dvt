/** Owned concern: adapt Canvas context gestures to governed menu models and command callbacks. */
import type { Edge, ReactFlowProps, Node as FlowNode } from '@xyflow/react';
import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { flushSync } from 'react-dom';

import type { ContextMenuEvent } from './canvasContextMenuPresenter.types';
import { resolveCanvasViewportContextMenuRequest } from './canvasContextMenuTargetPolicy';
import {
  buildCanvasAddNodeCatalogMenuModel,
  buildCanvasContextMenuModel,
  buildCanvasEdgeContextRemovalChange,
  type CanvasContextMenuCanvasAction,
  type CanvasContextMenuCreateNodeAction,
  type CanvasContextMenuEdgeAction,
  type CanvasContextMenuModel,
  type CanvasContextMenuPosition,
} from './canvasInteractionCommandSurface';
import { useCanvasContextMenuLifecycle } from './useCanvasContextMenuLifecycle';
import type {
  ContextMenuKeyboardEvent,
  UseCanvasContextMenuPresenterArgs,
  UseCanvasContextMenuPresenterResult,
} from './canvasContextMenuPresenter.types';

export type { CanvasContextMenuPresenter } from './canvasContextMenuPresenter.types';

export function useCanvasContextMenuPresenter({
  canEditEdges,
  canOpenSourceImport,
  canOpenCanvasSettings,
  authoringNodeKinds,
  screenToFlowPosition,
  onCreateAuthoringNode,
  onEdgesChange,
  onOpenSourceImport,
  onOpenCanvasSettings,
}: UseCanvasContextMenuPresenterArgs): UseCanvasContextMenuPresenterResult {
  const [model, setModel] = useState<CanvasContextMenuModel | null>(null);
  const [keyboardMenuOpen, setKeyboardMenuOpen] = useState(false);
  const {
    menuRef,
    contextSurfaceRef,
    markContextMenuOpened,
    closeContextMenu,
    restoreContextMenuOpenerFocus,
    handlePaneClick,
  } = useCanvasContextMenuLifecycle({ model, setModel });

  useEffect(() => {
    if (model == null || model.surface === 'add-node-catalog') {
      setKeyboardMenuOpen(false);
    }
  }, [model]);

  const openCanvasContextMenu = useCallback(
    (
      screenPosition: CanvasContextMenuPosition,
      options: Readonly<{
        opener?: HTMLElement;
        suppressPointerEcho?: boolean;
        keyboard?: boolean;
      }> = {}
    ) => {
      const flowPosition = screenToFlowPosition(screenPosition);
      setKeyboardMenuOpen(options.keyboard === true);

      markContextMenuOpened({
        targetKind: 'pane',
        screenPosition,
        opener: options.opener,
        suppressPointerEcho: options.suppressPointerEcho,
      });
      flushSync(() => {
        setModel(
          buildCanvasContextMenuModel({
            target: {
              kind: 'pane',
              screenPosition,
              flowPosition,
            },
            canMutateGraph: canEditEdges,
            canOpenSourceImport: Boolean(canOpenSourceImport && onOpenSourceImport),
            canOpenCanvasSettings: Boolean(canOpenCanvasSettings && onOpenCanvasSettings),
            authoringNodeKinds,
          })
        );
      });
    },
    [
      authoringNodeKinds,
      canEditEdges,
      canOpenCanvasSettings,
      canOpenSourceImport,
      markContextMenuOpened,
      onOpenCanvasSettings,
      onOpenSourceImport,
      screenToFlowPosition,
    ]
  );

  const openAddNodeCatalog = useCallback(
    (screenPosition: CanvasContextMenuPosition, opener?: HTMLElement) => {
      const flowPosition = screenToFlowPosition(screenPosition);
      setKeyboardMenuOpen(false);
      const sourceModel = buildCanvasContextMenuModel({
        target: {
          kind: 'pane',
          screenPosition,
          flowPosition,
        },
        canMutateGraph: canEditEdges,
        canOpenSourceImport: Boolean(canOpenSourceImport && onOpenSourceImport),
        canOpenCanvasSettings: Boolean(canOpenCanvasSettings && onOpenCanvasSettings),
        authoringNodeKinds,
      });

      markContextMenuOpened({ targetKind: 'pane', screenPosition, opener });
      flushSync(() => {
        setModel(
          buildCanvasAddNodeCatalogMenuModel({
            sourceModel,
            authoringNodeKinds,
            canOpenSourceImport: Boolean(canOpenSourceImport && onOpenSourceImport),
            canCreateAuthoringNodes: canEditEdges,
          })
        );
      });
    },
    [
      authoringNodeKinds,
      canEditEdges,
      canOpenCanvasSettings,
      canOpenSourceImport,
      markContextMenuOpened,
      onOpenCanvasSettings,
      onOpenSourceImport,
      screenToFlowPosition,
    ]
  );

  const handleViewportContextMenuKeyDown = useCallback(
    (event: ContextMenuKeyboardEvent) => {
      const opensContextMenu =
        event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);
      if (!opensContextMenu || event.target !== event.currentTarget) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const bounds = event.currentTarget.getBoundingClientRect();
      const position = resolveCanvasViewportContextMenuRequest({
        clientX: bounds.left + Math.max(bounds.width, 1) / 2,
        clientY: bounds.top + Math.max(bounds.height, 1) / 2,
        target: event.currentTarget,
        preventDefault: () => undefined,
        stopPropagation: () => undefined,
      });
      if (position == null) {
        return;
      }

      openCanvasContextMenu(position, { keyboard: true, opener: event.currentTarget });
    },
    [openCanvasContextMenu]
  );

  const handleViewportContextMenuEvent = useCallback(
    (event: ContextMenuEvent) => {
      const targetsNodeShell =
        event.target instanceof Element &&
        event.target.closest('[data-slot="canvas-node-shell"]') != null;
      if (targetsNodeShell) {
        return;
      }

      const request = resolveCanvasViewportContextMenuRequest(event);
      if (request != null) {
        openCanvasContextMenu(request, { suppressPointerEcho: true });
        return;
      }

      const targetsEdge =
        event.target instanceof Element && event.target.closest('.react-flow__edge') != null;
      if (targetsEdge) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    },
    [openCanvasContextMenu]
  );

  const handleViewportContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      handleViewportContextMenuEvent(event);
    },
    [handleViewportContextMenuEvent]
  );

  const handleEdgeContextMenu: NonNullable<ReactFlowProps<FlowNode, Edge>['onEdgeContextMenu']> =
    useCallback(
      (event, edge) => {
        setKeyboardMenuOpen(false);
        markContextMenuOpened({ targetKind: 'edge' });
        flushSync(() => {
          setModel(
            buildCanvasContextMenuModel({
              target: {
                kind: 'edge',
                edgeId: edge.id,
                screenPosition: { x: event.clientX, y: event.clientY },
              },
              canMutateGraph: canEditEdges,
              authoringNodeKinds,
            })
          );
        });
      },
      [authoringNodeKinds, canEditEdges, markContextMenuOpened]
    );

  const handleCanvasAction = useCallback(
    (action: CanvasContextMenuCanvasAction) => {
      if (action.action === 'open-add-node-catalog') {
        const catalogModel = buildCanvasAddNodeCatalogMenuModel({
          sourceModel: model,
          authoringNodeKinds,
          canOpenSourceImport: Boolean(canOpenSourceImport && onOpenSourceImport),
          canCreateAuthoringNodes: canEditEdges,
        });
        if (catalogModel != null) {
          setKeyboardMenuOpen(false);
          setModel(catalogModel);
          return;
        }
      } else if (action.action === 'open-source-import') {
        onOpenSourceImport?.(model?.flowPosition);
      } else if (action.action === 'open-canvas-settings') {
        onOpenCanvasSettings?.();
      }

      closeContextMenu({
        restoreFocus:
          action.action !== 'open-source-import' && action.action !== 'open-canvas-settings',
      });
    },
    [
      authoringNodeKinds,
      canEditEdges,
      closeContextMenu,
      model,
      canOpenSourceImport,
      onOpenCanvasSettings,
      onOpenSourceImport,
    ]
  );

  const handleCreateNodeAction = useCallback(
    (action: CanvasContextMenuCreateNodeAction) => {
      if (model?.flowPosition != null) {
        onCreateAuthoringNode(action.registration, model.flowPosition);
      }

      closeContextMenu();
    },
    [closeContextMenu, model?.flowPosition, onCreateAuthoringNode]
  );

  const handleEdgeAction = useCallback(
    (action: CanvasContextMenuEdgeAction) => {
      if (action.action === 'remove-edge' && model?.edgeId != null) {
        onEdgesChange([buildCanvasEdgeContextRemovalChange({ id: model.edgeId })]);
      }

      closeContextMenu();
    },
    [closeContextMenu, model?.edgeId, onEdgesChange]
  );

  return {
    model,
    keyboardMenuOpen,
    menuRef,
    contextSurfaceRef,
    closeContextMenu,
    restoreContextMenuOpenerFocus,
    openAddNodeCatalog,
    handlePaneClick,
    handleViewportContextMenu,
    handleViewportContextMenuKeyDown,
    handleEdgeContextMenu,
    handleCanvasAction,
    handleCreateNodeAction,
    handleEdgeAction,
  };
}
