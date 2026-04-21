/** Owned concern: translate selection and inspect gestures into local adapter-side effects. */

import { type Edge, type Node, type ReactFlowProps } from '@xyflow/react';
import { useCallback } from 'react';

import type {
  CanvasSelectionContracts,
} from './canvasGraphHandlerContracts';

type UseCanvasSelectionHandlersArgs = CanvasSelectionContracts;

type UseCanvasSelectionHandlersResult = {
  handleInspectNode: (nodeId: string) => void;
  handleNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>;
  onSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>;
  handleToggleNodeSelection: (nodeId: string, shouldSelect: boolean) => void;
};

export function useCanvasSelectionHandlers({
  state,
  effects,
}: UseCanvasSelectionHandlersArgs): UseCanvasSelectionHandlersResult {
  const { canonicalNodesById, selectedNodeIds, focusMode, inspectorPanelVisible } = state;
  const { setSelectedNodes, setInspectorNode, toggleInspectorPanel } = effects;

  const handleInspectNode = useCallback(
    (nodeId: string) => {
      setInspectorNode(nodeId);
      if (!focusMode && !inspectorPanelVisible) {
        toggleInspectorPanel();
      }
    },
    [focusMode, inspectorPanelVisible, setInspectorNode, toggleInspectorPanel]
  );

  const handleNodeClick = useCallback<NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>>(
    (_event, node) => {
      if (!canonicalNodesById.has(node.id)) {
        return;
      }

      if (inspectorPanelVisible && !focusMode) {
        setInspectorNode(node.id);
      }
    },
    [canonicalNodesById, focusMode, inspectorPanelVisible, setInspectorNode]
  );

  const onSelectionChange = useCallback<
    NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>
  >(
    ({ nodes: nextSelectedNodes }) => {
      setSelectedNodes(nextSelectedNodes.map((node) => node.id));
    },
    [setSelectedNodes]
  );

  const handleToggleNodeSelection = useCallback(
    (nodeId: string, shouldSelect: boolean) => {
      if (shouldSelect) {
        if (selectedNodeIds.includes(nodeId)) {
          return;
        }

        setSelectedNodes([...selectedNodeIds, nodeId]);
        return;
      }

      setSelectedNodes(selectedNodeIds.filter((id) => id !== nodeId));
    },
    [selectedNodeIds, setSelectedNodes]
  );

  return {
    handleInspectNode,
    handleNodeClick,
    onSelectionChange,
    handleToggleNodeSelection,
  };
}
