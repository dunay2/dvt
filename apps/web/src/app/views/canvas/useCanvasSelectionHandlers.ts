/** Owned concern: translate explicit inspect and execution-selection intents into local adapter-side effects. */

import { useCallback } from 'react';

import type { CanvasSelectionContracts } from './canvasGraphHandlerContracts';

type UseCanvasSelectionHandlersArgs = CanvasSelectionContracts;

type UseCanvasSelectionHandlersResult = {
  handleInspectNode: (nodeId: string, preferredTabId?: string | null) => void;
  handleToggleNodeSelection: (nodeId: string, shouldSelect: boolean) => void;
};

export function useCanvasSelectionHandlers({
  state,
  effects,
}: UseCanvasSelectionHandlersArgs): UseCanvasSelectionHandlersResult {
  const { selectedNodeIds, focusMode, inspectorPanelVisible } = state;
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
    handleToggleNodeSelection,
  };
}
