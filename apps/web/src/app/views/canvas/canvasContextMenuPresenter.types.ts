/** Owned concern: define Canvas context-menu presenter ports without owning React behavior. */
import type { Edge, Node as FlowNode, ReactFlowProps } from '@xyflow/react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from 'react';

import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CreateCanvasAuthoringNode } from './canvasGraphHandlerContracts';
import type { CanvasEdgeCommandRunner } from './useCanvasEdgeCommandRunner';
import type {
  CanvasContextMenuCanvasAction,
  CanvasContextMenuCreateNodeAction,
  CanvasContextMenuEdgeAction,
  CanvasContextMenuModel,
  CanvasContextMenuPosition,
} from './canvasInteractionCommandSurface';

export type UseCanvasContextMenuPresenterArgs = Readonly<{
  canEditEdges: boolean;
  canOpenSourceImport?: boolean;
  canOpenCanvasSettings?: boolean;
  authoringNodeKinds: readonly NodeKindRegistration[];
  screenToFlowPosition: (screenPosition: CanvasContextMenuPosition) => CanvasContextMenuPosition;
  onCreateAuthoringNode: CreateCanvasAuthoringNode;
  onEdgesChange: NonNullable<ReactFlowProps<FlowNode, Edge>['onEdgesChange']>;
  onSetEdgeExecutionGate?: CanvasEdgeCommandRunner['setExecutionGate'];
  onOpenSourceImport?: (flowPosition?: CanvasContextMenuPosition) => void;
  onOpenCanvasSettings?: () => void;
}>;

export type ContextMenuEvent = Pick<
  MouseEvent | ReactMouseEvent<HTMLDivElement>,
  'clientX' | 'clientY' | 'preventDefault' | 'stopPropagation' | 'target'
> &
  Readonly<{ nativeEvent?: MouseEvent }>;

export type PaneClickEvent = Pick<
  MouseEvent | ReactMouseEvent<Element>,
  'button' | 'clientX' | 'clientY'
>;

export type CloseCanvasContextMenuOptions = Readonly<{
  restoreFocus?: boolean;
  preserveCatalog?: boolean;
}>;

export type ContextMenuKeyboardEvent = Pick<
  ReactKeyboardEvent<HTMLDivElement>,
  'currentTarget' | 'key' | 'preventDefault' | 'shiftKey' | 'stopPropagation' | 'target'
>;

export type UseCanvasContextMenuPresenterResult = Readonly<{
  model: CanvasContextMenuModel | null;
  keyboardMenuOpen: boolean;
  menuRef: RefObject<HTMLDivElement>;
  contextSurfaceRef: RefObject<HTMLDivElement>;
  closeContextMenu: (options?: CloseCanvasContextMenuOptions) => void;
  restoreContextMenuOpenerFocus: () => void;
  openAddNodeCatalog: (screenPosition: CanvasContextMenuPosition, opener?: HTMLElement) => void;
  handlePaneClick: (event: PaneClickEvent) => void;
  handleViewportContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  handleViewportContextMenuKeyDown: (event: ContextMenuKeyboardEvent) => void;
  handleEdgeContextMenu: NonNullable<ReactFlowProps<FlowNode, Edge>['onEdgeContextMenu']>;
  handleCanvasAction: (action: CanvasContextMenuCanvasAction) => void;
  handleCreateNodeAction: (action: CanvasContextMenuCreateNodeAction) => void;
  handleEdgeAction: (action: CanvasContextMenuEdgeAction) => void;
}>;

export type CanvasContextMenuPresenter = UseCanvasContextMenuPresenterResult;
