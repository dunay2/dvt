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
  canOpenProjectExplorer?: boolean;
  canOpenProjectCode?: boolean;
  canValidateGraph?: boolean;
  canPreviewExecutionPlan?: boolean;
  canOpenCanvasSettings?: boolean;
  authoringNodeKinds: readonly NodeKindRegistration[];
  screenToFlowPosition: (screenPosition: CanvasContextMenuPosition) => CanvasContextMenuPosition;
  onCreateAuthoringNode: CreateCanvasAuthoringNode;
  onEdgesChange: NonNullable<ReactFlowProps<FlowNode, Edge>['onEdgesChange']>;
  onOpenSourceImport?: (flowPosition?: CanvasContextMenuPosition) => void;
  onOpenProjectExplorer?: () => void;
  onOpenProjectCode?: () => void;
  onValidateGraph?: () => void;
  onPreviewExecutionPlan?: () => void;
  onOpenCanvasSettings?: () => void;
}>;

type ContextMenuEvent = Pick<
  MouseEvent | ReactMouseEvent<HTMLDivElement>,
  'clientX' | 'clientY' | 'preventDefault' | 'stopPropagation' | 'target'
>;
type PaneClickEvent = Pick<MouseEvent | ReactMouseEvent<Element>, 'button' | 'clientX' | 'clientY'>;

type CloseCanvasContextMenuOptions = Readonly<{
  force?: boolean;
}>;

type UseCanvasContextMenuPresenterResult = Readonly<{
  model: CanvasContextMenuModel | null;
  menuRef: RefObject<HTMLDivElement>;
  contextSurfaceRef: RefObject<HTMLDivElement>;
  closeContextMenu: (options?: CloseCanvasContextMenuOptions) => void;
  handlePaneClick: (event: PaneClickEvent) => void;
  handleViewportContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  handlePaneContextMenu: NonNullable<ReactFlowProps<FlowNode, Edge>['onPaneContextMenu']>;
  handleEdgeContextMenu: NonNullable<ReactFlowProps<FlowNode, Edge>['onEdgeContextMenu']>;
  handleCanvasAction: (action: CanvasContextMenuCanvasAction) => void;
  handleCreateNodeAction: (action: CanvasContextMenuCreateNodeAction) => void;
  handleEdgeAction: (action: CanvasContextMenuEdgeAction) => void;
}>;

export type CanvasContextMenuPresenter = UseCanvasContextMenuPresenterResult;

const CONTEXT_MENU_OPEN_ECHO_SUPPRESSION_MS = 1000;
const CONTEXT_MENU_PANE_CLICK_ECHO_SUPPRESSION_MS = 100;
const CONTEXT_MENU_PANE_CLICK_ECHO_TOLERANCE_PX = 2;
type ContextMenuOpenTargetKind = CanvasContextMenuModel['kind'];

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

export function useCanvasContextMenuPresenter({
  canEditEdges,
  canOpenSourceImport,
  canOpenProjectExplorer,
  canOpenProjectCode,
  canValidateGraph,
  canPreviewExecutionPlan,
  canOpenCanvasSettings,
  authoringNodeKinds,
  screenToFlowPosition,
  onCreateAuthoringNode,
  onEdgesChange,
  onOpenSourceImport,
  onOpenProjectExplorer,
  onOpenProjectCode,
  onValidateGraph,
  onPreviewExecutionPlan,
  onOpenCanvasSettings,
}: UseCanvasContextMenuPresenterArgs): UseCanvasContextMenuPresenterResult {
  const [model, setModel] = useState<CanvasContextMenuModel | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const contextSurfaceRef = useRef<HTMLDivElement>(null);
  const lastContextMenuOpenedAtRef = useRef(0);
  const lastContextMenuOpenedTargetKindRef = useRef<ContextMenuOpenTargetKind | null>(null);
  const lastPaneContextMenuScreenPositionRef = useRef<CanvasContextMenuPosition | null>(null);
  const pendingPaneClickEchoRef = useRef(false);

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

  const closeContextMenu = useCallback((_options?: CloseCanvasContextMenuOptions) => {
    pendingPaneClickEchoRef.current = false;
    lastPaneContextMenuScreenPositionRef.current = null;
    setModel(null);
  }, []);

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
        pendingPaneClickEchoRef.current = false;
        return;
      }

      closeContextMenu({ force: true });
    },
    [closeContextMenu]
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

      const isPendingImmediatePanePointerEcho =
        pendingPaneClickEchoRef.current &&
        event instanceof MouseEvent &&
        lastContextMenuOpenedTargetKindRef.current === 'pane' &&
        Date.now() - lastContextMenuOpenedAtRef.current <
          CONTEXT_MENU_PANE_CLICK_ECHO_SUPPRESSION_MS;
      const isPanePointerEchoAtContextPoint =
        pendingPaneClickEchoRef.current &&
        event instanceof MouseEvent &&
        lastContextMenuOpenedTargetKindRef.current === 'pane' &&
        Date.now() - lastContextMenuOpenedAtRef.current < CONTEXT_MENU_OPEN_ECHO_SUPPRESSION_MS &&
        isNearPosition(event, lastPaneContextMenuScreenPositionRef.current);

      if (isPendingImmediatePanePointerEcho || isPanePointerEchoAtContextPoint) {
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
  }, [closeContextMenu, model]);

  const openCanvasContextMenu = useCallback(
    (screenPosition: CanvasContextMenuPosition) => {
      const flowPosition = screenToFlowPosition(screenPosition);

      markContextMenuOpened('pane', screenPosition);
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
            canOpenProjectExplorer: Boolean(canOpenProjectExplorer && onOpenProjectExplorer),
            canOpenProjectCode: Boolean(canOpenProjectCode && onOpenProjectCode),
            canValidateGraph: Boolean(canValidateGraph && onValidateGraph),
            canPreviewExecutionPlan: Boolean(canPreviewExecutionPlan && onPreviewExecutionPlan),
            canOpenCanvasSettings: Boolean(canOpenCanvasSettings && onOpenCanvasSettings),
            authoringNodeKinds,
          })
        );
      });
    },
    [
      authoringNodeKinds,
      canEditEdges,
      canOpenSourceImport,
      canOpenProjectExplorer,
      canOpenProjectCode,
      canValidateGraph,
      canPreviewExecutionPlan,
      canOpenCanvasSettings,
      markContextMenuOpened,
      onOpenSourceImport,
      onOpenProjectExplorer,
      onOpenProjectCode,
      onValidateGraph,
      onPreviewExecutionPlan,
      onOpenCanvasSettings,
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
    const handleDocumentContextMenu = (event: MouseEvent): void => {
      const contextSurface = contextSurfaceRef.current;
      if (
        contextSurface == null ||
        !(event.target instanceof Element) ||
        !contextSurface.contains(event.target)
      ) {
        return;
      }

      handleViewportContextMenuEvent(event);
    };

    document.addEventListener('contextmenu', handleDocumentContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', handleDocumentContextMenu, true);
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
        markContextMenuOpened('edge');
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
      [authoringNodeKinds, canEditEdges, markContextMenuOpened]
    );

  const handleCanvasAction = useCallback(
    (action: CanvasContextMenuCanvasAction) => {
      if (action.action === 'open-source-import') {
        onOpenSourceImport?.(model?.flowPosition);
      } else if (action.action === 'open-project-explorer') {
        onOpenProjectExplorer?.();
      } else if (action.action === 'open-project-code') {
        onOpenProjectCode?.();
      } else if (action.action === 'validate-graph') {
        onValidateGraph?.();
      } else if (action.action === 'preview-execution-plan') {
        onPreviewExecutionPlan?.();
      } else if (action.action === 'open-canvas-settings') {
        onOpenCanvasSettings?.();
      }

      closeContextMenu({ force: true });
    },
    [
      closeContextMenu,
      model?.flowPosition,
      onOpenCanvasSettings,
      onOpenProjectCode,
      onOpenProjectExplorer,
      onOpenSourceImport,
      onValidateGraph,
      onPreviewExecutionPlan,
    ]
  );

  const handleCreateNodeAction = useCallback(
    (action: CanvasContextMenuCreateNodeAction) => {
      if (model?.flowPosition != null) {
        onCreateAuthoringNode(action.registration, model.flowPosition);
      }

      closeContextMenu({ force: true });
    },
    [closeContextMenu, model?.flowPosition, onCreateAuthoringNode]
  );

  const handleEdgeAction = useCallback(
    (action: CanvasContextMenuEdgeAction) => {
      if (action.action === 'remove-edge' && model?.edgeId != null) {
        onEdgesChange([buildCanvasEdgeContextRemovalChange({ id: model.edgeId })]);
      }

      closeContextMenu({ force: true });
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
    handlePaneContextMenu,
    handleEdgeContextMenu,
    handleCanvasAction,
    handleCreateNodeAction,
    handleEdgeAction,
  };
}
