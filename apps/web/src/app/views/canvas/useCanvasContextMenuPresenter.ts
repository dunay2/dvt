/** Owned concern: adapt Canvas context gestures to governed menu models and command callbacks. */
import type { Edge, ReactFlowProps, Node as FlowNode } from '@xyflow/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import { flushSync } from 'react-dom';

import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CreateCanvasAuthoringNode } from './canvasGraphHandlerContracts';
import {
  buildCanvasContextMenuModel,
  buildCanvasEdgeContextRemovalChange,
  type CanvasContextMenuCanvasAction,
  type CanvasContextMenuCreateNodeAction,
  type CanvasContextMenuEdgeAction,
  type CanvasContextMenuModel,
  type CanvasContextMenuPosition,
} from './canvasInteractionCommandSurface';

type UseCanvasContextMenuPresenterArgs = Readonly<{
  canEditEdges: boolean;
  canOpenSourceImport?: boolean;
  canPreviewExecutionPlan?: boolean;
  authoringNodeKinds: readonly NodeKindRegistration[];
  screenToFlowPosition: (screenPosition: CanvasContextMenuPosition) => CanvasContextMenuPosition;
  onCreateAuthoringNode: CreateCanvasAuthoringNode;
  onEdgesChange: NonNullable<ReactFlowProps<FlowNode, Edge>['onEdgesChange']>;
  onOpenSourceImport?: () => void;
  onPreviewExecutionPlan?: () => void;
}>;

type ContextMenuEvent = Pick<
  MouseEvent | ReactMouseEvent<HTMLDivElement>,
  'clientX' | 'clientY' | 'preventDefault' | 'stopPropagation' | 'target'
>;

type UseCanvasContextMenuPresenterResult = Readonly<{
  model: CanvasContextMenuModel | null;
  menuRef: RefObject<HTMLDivElement>;
  contextSurfaceRef: RefObject<HTMLDivElement>;
  closeContextMenu: () => void;
  handleViewportContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  handlePaneContextMenu: NonNullable<ReactFlowProps<FlowNode, Edge>['onPaneContextMenu']>;
  handleEdgeContextMenu: NonNullable<ReactFlowProps<FlowNode, Edge>['onEdgeContextMenu']>;
  handleCanvasAction: (action: CanvasContextMenuCanvasAction) => void;
  handleCreateNodeAction: (action: CanvasContextMenuCreateNodeAction) => void;
  handleEdgeAction: (action: CanvasContextMenuEdgeAction) => void;
}>;

function isCanvasViewportContextTarget(target: EventTarget | null): target is Element {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target.closest(
      [
        '[data-slot="canvas-context-menu"]',
        '.react-flow__node',
        '.react-flow__edge',
        '.react-flow__controls',
        '.react-flow__minimap',
      ].join(',')
    ) == null
  );
}

export function useCanvasContextMenuPresenter({
  canEditEdges,
  canOpenSourceImport,
  canPreviewExecutionPlan,
  authoringNodeKinds,
  screenToFlowPosition,
  onCreateAuthoringNode,
  onEdgesChange,
  onOpenSourceImport,
  onPreviewExecutionPlan,
}: UseCanvasContextMenuPresenterArgs): UseCanvasContextMenuPresenterResult {
  const [model, setModel] = useState<CanvasContextMenuModel | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const contextSurfaceRef = useRef<HTMLDivElement>(null);

  const closeContextMenu = useCallback(() => {
    setModel(null);
  }, []);

  useEffect(() => {
    if (model == null) {
      return;
    }

    const handleDocumentPointerDown = (event: Event): void => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }

      closeContextMenu();
    };
    const handleDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    document.addEventListener('keydown', handleDocumentKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
      document.removeEventListener('keydown', handleDocumentKeyDown, true);
    };
  }, [closeContextMenu, model]);

  const openCanvasContextMenu = useCallback(
    (screenPosition: CanvasContextMenuPosition) => {
      const flowPosition = screenToFlowPosition(screenPosition);

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
            canPreviewExecutionPlan: Boolean(canPreviewExecutionPlan && onPreviewExecutionPlan),
            authoringNodeKinds,
          })
        );
      });
    },
    [
      authoringNodeKinds,
      canEditEdges,
      canOpenSourceImport,
      canPreviewExecutionPlan,
      onOpenSourceImport,
      onPreviewExecutionPlan,
      screenToFlowPosition,
    ]
  );

  const handleViewportContextMenuEvent = useCallback(
    (event: ContextMenuEvent) => {
      if (!isCanvasViewportContextTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      openCanvasContextMenu({ x: event.clientX, y: event.clientY });
    },
    [openCanvasContextMenu]
  );

  const handleViewportContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      handleViewportContextMenuEvent(event);
    },
    [handleViewportContextMenuEvent]
  );

  useLayoutEffect(() => {
    const contextSurface = contextSurfaceRef.current;
    if (contextSurface == null) {
      return;
    }

    const handleSurfaceContextMenu = (event: MouseEvent): void => {
      if (!(event.target instanceof Element) || !contextSurface.contains(event.target)) {
        return;
      }

      handleViewportContextMenuEvent(event);
    };

    contextSurface.addEventListener('contextmenu', handleSurfaceContextMenu, true);

    return () => {
      contextSurface.removeEventListener('contextmenu', handleSurfaceContextMenu, true);
    };
  }, [handleViewportContextMenuEvent]);

  const handlePaneContextMenu: NonNullable<ReactFlowProps<FlowNode, Edge>['onPaneContextMenu']> =
    useCallback(
      (event) => {
        event.preventDefault();
        openCanvasContextMenu({ x: event.clientX, y: event.clientY });
      },
      [openCanvasContextMenu]
    );

  const handleEdgeContextMenu: NonNullable<ReactFlowProps<FlowNode, Edge>['onEdgeContextMenu']> =
    useCallback(
      (event, edge) => {
        event.preventDefault();
        flushSync(() => {
          setModel(
            buildCanvasContextMenuModel({
              target: {
                kind: 'edge',
                edgeId: edge.id,
                screenPosition: { x: event.clientX, y: event.clientY },
              },
              canMutateGraph: canEditEdges,
              canOpenSourceImport: false,
              canPreviewExecutionPlan: false,
              authoringNodeKinds,
            })
          );
        });
      },
      [authoringNodeKinds, canEditEdges]
    );

  const handleCanvasAction = useCallback(
    (action: CanvasContextMenuCanvasAction) => {
      if (action.action === 'open-source-import') {
        onOpenSourceImport?.();
      } else if (action.action === 'preview-execution-plan') {
        onPreviewExecutionPlan?.();
      }

      closeContextMenu();
    },
    [closeContextMenu, onOpenSourceImport, onPreviewExecutionPlan]
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
    handleViewportContextMenu,
    handlePaneContextMenu,
    handleEdgeContextMenu,
    handleCanvasAction,
    handleCreateNodeAction,
    handleEdgeAction,
  };
}
