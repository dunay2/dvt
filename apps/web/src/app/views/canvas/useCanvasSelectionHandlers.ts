/** Owned concern: translate selection and inspect gestures into local adapter-side effects. */

import { type Edge, type Node, type ReactFlowProps } from '@xyflow/react';
import { useCallback } from 'react';

import type { CanvasSelectionContracts } from './canvasGraphHandlerContracts';

type UseCanvasSelectionHandlersArgs = CanvasSelectionContracts;

type UseCanvasSelectionHandlersResult = {
  handleInspectNode: (nodeId: string, preferredTabId?: string | null) => void;
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
    (nodeId: string, preferredTabId?: string | null) => {
      if (preferredTabId == null) {
        setInspectorNode(nodeId);
      } else {
        setInspectorNode(nodeId, preferredTabId);
      }
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
    },
    [canonicalNodesById]
  );

  const onSelectionChange = useCallback<
    NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>
  >(() => {
    return;
  }, []);

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
