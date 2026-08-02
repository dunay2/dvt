/** Owned concern: adapt Canvas context gestures to governed menu models and command callbacks. */
import type { Edge, ReactFlowProps, Node as FlowNode } from '@xyflow/react';
import { useCallback, useState } from 'react';
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
import {
  useCanvasContextMenuLifecycle,
  useCanvasContextSurfaceContextMenu,
} from './useCanvasContextMenuLifecycle';
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
  const { menuRef, contextSurfaceRef, markContextMenuOpened, closeContextMenu, handlePaneClick } =
    useCanvasContextMenuLifecycle({ model, setModel });

  const openCanvasContextMenu = useCallback(
    (
      screenPosition: CanvasContextMenuPosition,
      options: Readonly<{ opener?: HTMLElement; suppressPointerEcho?: boolean }> = {}
    ) => {
      const flowPosition = screenToFlowPosition(screenPosition);

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

  const handleViewportContextMenuEvent = useCallback(
    (event: ContextMenuEvent) => {
      const contextMenuPosition = resolveCanvasViewportContextMenuRequest(event);
      if (contextMenuPosition == null) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      openCanvasContextMenu(contextMenuPosition, { suppressPointerEcho: true });
    },
    [openCanvasContextMenu]
  );

  const handleViewportContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      handleViewportContextMenuEvent(event);
    },
    [handleViewportContextMenuEvent]
  );

  const handleViewportContextMenuKeyDown = useCallback(
    (event: ContextMenuKeyboardEvent) => {
      const opensContextMenu =
        event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);
      if (!opensContextMenu) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const bounds = event.currentTarget.getBoundingClientRect();
      openCanvasContextMenu(
        {
          x: bounds.left + Math.max(bounds.width, 1) / 2,
          y: bounds.top + Math.max(bounds.height, 1) / 2,
        },
        { opener: event.currentTarget }
      );
    },
    [openCanvasContextMenu]
  );

  useCanvasContextSurfaceContextMenu({
    contextSurfaceRef,
    onContextSurfaceContextMenu: handleViewportContextMenuEvent,
  });

  const handlePaneContextMenu: NonNullable<ReactFlowProps<FlowNode, Edge>['onPaneContextMenu']> =
    useCallback(
      (event) => {
        event.preventDefault();
        openCanvasContextMenu(
          { x: event.clientX, y: event.clientY },
          { suppressPointerEcho: true }
        );
      },
      [openCanvasContextMenu]
    );

  const handleEdgeContextMenu: NonNullable<ReactFlowProps<FlowNode, Edge>['onEdgeContextMenu']> =
    useCallback(
      (event, edge) => {
        event.preventDefault();
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
    menuRef,
    contextSurfaceRef,
    closeContextMenu,
    handlePaneClick,
    handleViewportContextMenu,
    handleViewportContextMenuKeyDown,
    handlePaneContextMenu,
    handleEdgeContextMenu,
    handleCanvasAction,
    handleCreateNodeAction,
    handleEdgeAction,
  };
}
